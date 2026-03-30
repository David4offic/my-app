param(
  [string]$WatchDir = "$PSScriptRoot\print-queue",
  [string]$PrintedDir = "$PSScriptRoot\print-queue\printed",
  [string]$LogFile = "$PSScriptRoot\print-queue\watch-print-docx.log",
  [string]$PrinterName = ""
)

$ErrorActionPreference = "Stop"
$processing = [System.Collections.Generic.HashSet[string]]::new()

function Write-Log {
  param([string]$Message)

  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $line = "$timestamp $Message"
  Add-Content -Path $LogFile -Value $line
  Write-Host $line
}

function Get-DefaultPrinterName {
  $printer = Get-CimInstance Win32_Printer | Where-Object { $_.Default } | Select-Object -First 1
  if (-not $printer) {
    throw "Numatytas spausdintuvas nerastas. Nurodyk -PrinterName."
  }

  return $printer.Name
}

function Print-Docx {
  param(
    [string]$FilePath,
    [string]$TargetPrinter
  )

  $word = $null
  $document = $null

  for ($attempt = 1; $attempt -le 5; $attempt++) {
    try {
      $word = New-Object -ComObject Word.Application
      $word.Visible = $false
      $word.DisplayAlerts = 0
      $document = $word.Documents.Open($FilePath, $false, $true)

      if ($TargetPrinter) {
        $word.ActivePrinter = $TargetPrinter
      }

      $document.PrintOut()
      return
    } catch {
      if ($attempt -eq 5) {
        throw
      }

      Start-Sleep -Seconds 2
    } finally {
      if ($document) {
        $document.Close([ref]0)
        $document = $null
      }

      if ($word) {
        $word.Quit()
        $word = $null
      }
    }
  }
}

function Wait-FileReady {
  param([string]$FilePath)

  for ($attempt = 1; $attempt -le 20; $attempt++) {
    try {
      $stream = [System.IO.File]::Open($FilePath, 'Open', 'Read', 'None')
      $stream.Close()
      return
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }

  throw "Failas per ilgai uzrakintas: $FilePath"
}

New-Item -ItemType Directory -Force -Path $WatchDir | Out-Null
New-Item -ItemType Directory -Force -Path $PrintedDir | Out-Null
New-Item -ItemType File -Force -Path $LogFile | Out-Null

$resolvedWatchDir = (Resolve-Path $WatchDir).Path
$resolvedPrintedDir = (Resolve-Path $PrintedDir).Path
$resolvedLogFile = (Resolve-Path $LogFile).Path
$resolvedPrinter = if ($PrinterName) { $PrinterName } else { Get-DefaultPrinterName }

Write-Log "[start] watch=$resolvedWatchDir printer=$resolvedPrinter"

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $resolvedWatchDir
$watcher.Filter = "*.docx"
$watcher.IncludeSubdirectories = $false
$watcher.NotifyFilter = [System.IO.NotifyFilters]'FileName, LastWrite, Size'
$watcher.EnableRaisingEvents = $true

$action = {
  $fullPath = $Event.SourceEventArgs.FullPath
  $name = [System.IO.Path]::GetFileName($fullPath)

  if ($name -notmatch '^IR-\d+\.docx$') {
    return
  }

  if (-not $processing.Add($fullPath)) {
    return
  }

  try {
    if (-not (Test-Path $fullPath)) {
      Write-Log "[skip] missing $fullPath"
      return
    }

    Wait-FileReady -FilePath $fullPath
    Write-Log "[print] $fullPath"
    Print-Docx -FilePath $fullPath -TargetPrinter $resolvedPrinter
    Start-Sleep -Seconds 5

    $destination = Join-Path $resolvedPrintedDir $name
    Move-Item -LiteralPath $fullPath -Destination $destination -Force
    Write-Log "[done] moved $name -> $destination"
  } catch {
    Write-Log "[error] $fullPath :: $($_.Exception.Message)"
  } finally {
    [void]$processing.Remove($fullPath)
  }
}

$createdRegistration = Register-ObjectEvent -InputObject $watcher -EventName Created -Action $action
$changedRegistration = Register-ObjectEvent -InputObject $watcher -EventName Changed -Action $action
$renamedRegistration = Register-ObjectEvent -InputObject $watcher -EventName Renamed -Action $action

try {
  while ($true) {
    Wait-Event -Timeout 1 | Out-Null
  }
} finally {
  Unregister-Event -SourceIdentifier $createdRegistration.Name -ErrorAction SilentlyContinue
  Unregister-Event -SourceIdentifier $changedRegistration.Name -ErrorAction SilentlyContinue
  Unregister-Event -SourceIdentifier $renamedRegistration.Name -ErrorAction SilentlyContinue
  $watcher.Dispose()
}
