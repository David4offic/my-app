param(
  [string]$ServerBaseUrl = "http://localhost:3000",
  [string]$Token = "",
  [string]$PrinterName = "",
  [int]$PollIntervalSeconds = 10,
  [string]$WorkDir = "$PSScriptRoot\print-agent"
)

$ErrorActionPreference = "Stop"

function Write-Log {
  param([string]$Message)

  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $line = "$timestamp $Message"
  Add-Content -Path $script:LogFile -Value $line
  Write-Host $line
}

function Ensure-Directory {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

function Get-AgentToken {
  if ($Token) { return $Token }
  if ($env:PRINT_AGENT_TOKEN) { return $env:PRINT_AGENT_TOKEN }

  throw "Nenurodytas PRINT_AGENT_TOKEN."
}

function Invoke-PrintApi {
  param(
    [string]$Method,
    [string]$Url,
    [string]$OutFile = ""
  )

  $headers = @{
    Authorization = "Bearer $(Get-AgentToken)"
  }

  if ($OutFile) {
    Invoke-WebRequest -Method $Method -Uri $Url -Headers $headers -OutFile $OutFile | Out-Null
    return
  }

  return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers
}

function Print-DocxFile {
  param([string]$FilePath)

  $arguments = @('/q', '/n', '/mFilePrintDefault', $FilePath)
  $process = Start-Process -FilePath 'winword.exe' -ArgumentList $arguments -PassThru
  $process.WaitForExit()

  if ($process.ExitCode -ne 0) {
    throw "Word spausdinimas baigesi su klaidos kodu $($process.ExitCode)"
  }
}

Ensure-Directory $WorkDir
Ensure-Directory (Join-Path $WorkDir "printed")
$script:LogFile = Join-Path $WorkDir "print-jobs-agent.log"
New-Item -ItemType File -Force -Path $script:LogFile | Out-Null

Write-Log "[start] server=$ServerBaseUrl printer=$PrinterName interval=${PollIntervalSeconds}s"

while ($true) {
  try {
    $nextJob = Invoke-PrintApi -Method "GET" -Url "$ServerBaseUrl/api/print-jobs/next"

    if (-not $nextJob.success) {
      Write-Log "[error] server response: $($nextJob.message)"
      Start-Sleep -Seconds $PollIntervalSeconds
      continue
    }

    if (-not $nextJob.job) {
      Start-Sleep -Seconds $PollIntervalSeconds
      continue
    }

    $issueKey = $nextJob.job.issueKey
    $docxPath = Join-Path $WorkDir "$issueKey.docx"
    $printedPath = Join-Path (Join-Path $WorkDir "printed") "$issueKey.docx"

    Write-Log "[download] $issueKey"
    Invoke-PrintApi -Method "GET" -Url "$ServerBaseUrl/api/print-jobs/$issueKey/document" -OutFile $docxPath

    Write-Log "[print] $issueKey"
    Print-DocxFile -FilePath $docxPath

    $completeResult = Invoke-PrintApi -Method "POST" -Url "$ServerBaseUrl/api/print-jobs/$issueKey/complete"
    if (-not $completeResult.success) {
      throw "Nepavyko pazymeti issue kaip atspausdintos."
    }

    Move-Item -LiteralPath $docxPath -Destination $printedPath -Force
    Write-Log "[done] moved $issueKey.docx -> $printedPath"
  } catch {
    Write-Log "[error] $($_.Exception.Message)"
  }

  Start-Sleep -Seconds $PollIntervalSeconds
}
