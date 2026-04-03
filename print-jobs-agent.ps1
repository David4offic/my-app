param(
  [string]$ServerBaseUrl = "https://4office.vercel.app",
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

function Get-Token {
  if ($Token) {
    return $Token
  }

  if ($env:PRINT_AGENT_TOKEN) {
    return $env:PRINT_AGENT_TOKEN
  }

  throw "Nenurodytas PRINT_AGENT_TOKEN."
}

function Invoke-PrintApi {
  param(
    [string]$Method,
    [string]$Url
  )

  $headers = @{
    "Authorization" = "Bearer $(Get-Token)"
  }

  return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers
}

function New-WordDocumentFromJob {
  param(
    [object]$Job,
    [string]$TargetPath
  )

  $word = $null
  $document = $null

  try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    if ($PrinterName) {
      $word.ActivePrinter = $PrinterName
    }

    $document = $word.Documents.Add()
    $selection = $word.Selection

    $selection.Font.Name = "Arial"
    $selection.Font.Size = 11

    $selection.TypeText("4office remonto priemimo lapas")
    $selection.TypeParagraph()
    $selection.TypeParagraph()

    $descriptionText = if ($Job.descriptionText) {
      [string]$Job.descriptionText
    } else {
      "Nera aprasymo."
    }

    $lines = @(
      "Uzsakymo numeris: $($Job.issueKey)",
      "Sukurta: $($Job.created)",
      "Statusas: $($Job.status)",
      "Irenginys: $($Job.deviceModel)",
      "Serijinis numeris: $($Job.serialNumber)",
      "",
      "Aprasymas:",
      $descriptionText
    )

    foreach ($line in $lines) {
      $selection.TypeText([string]$line)
      $selection.TypeParagraph()
    }

    $document.SaveAs([string]$TargetPath)
    $document.PrintOut()
    Start-Sleep -Seconds 5
    $document.Close($false)
    $word.Quit()
  } finally {
    if ($document) {
      [System.Runtime.Interopservices.Marshal]::ReleaseComObject($document) | Out-Null
    }
    if ($word) {
      [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
  }
}

Ensure-Directory $WorkDir
Ensure-Directory (Join-Path $WorkDir "printed")
$script:LogFile = Join-Path $WorkDir "print-jobs-agent.log"
New-Item -ItemType File -Force -Path $script:LogFile | Out-Null

Write-Log "[start] server=$ServerBaseUrl printer=$PrinterName interval=${PollIntervalSeconds}s"

while ($true) {
  try {
    $nextUrl = "$ServerBaseUrl/api/print-jobs/next"
    $response = Invoke-PrintApi -Method "GET" -Url $nextUrl

    if (-not $response.success) {
      Write-Log "[error] server response: $($response.message)"
      Start-Sleep -Seconds $PollIntervalSeconds
      continue
    }

    if (-not $response.job) {
      Start-Sleep -Seconds $PollIntervalSeconds
      continue
    }

    $job = $response.job
    $targetPath = Join-Path $WorkDir "$($job.issueKey).docx"

    Write-Log "[print] $($job.issueKey)"
    New-WordDocumentFromJob -Job $job -TargetPath $targetPath

    $completeUrl = "$ServerBaseUrl/api/print-jobs/$($job.issueKey)/complete"
    $completeResponse = Invoke-PrintApi -Method "POST" -Url $completeUrl

    if ($completeResponse.success) {
      $printedPath = Join-Path (Join-Path $WorkDir "printed") "$($job.issueKey).docx"
      Move-Item -LiteralPath $targetPath -Destination $printedPath -Force
      Write-Log "[done] moved $($job.issueKey).docx -> $printedPath"
    } else {
      Write-Log "[warn] nepaejo pazymeti kaip atspausdinto: $($job.issueKey)"
    }
  } catch {
    Write-Log "[error] $($_.Exception.Message)"
  }

  Start-Sleep -Seconds $PollIntervalSeconds
}
