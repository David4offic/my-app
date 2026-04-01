param(
  [string]$TaskName = '4office Print Watcher',
  [string]$ProjectDir = $PSScriptRoot
)

$ErrorActionPreference = 'Stop'

$scriptPath = Join-Path $ProjectDir 'watch-print-docx.ps1'
if (-not (Test-Path $scriptPath)) {
  throw "Nerastas failas: $scriptPath"
}

$powerShellPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$argument = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptPath`""

$action = New-ScheduledTaskAction -Execute $powerShellPath -Argument $argument
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -MultipleInstances IgnoreNew `
  -StartWhenAvailable

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description 'Automatinis 4office DOCX spausdinimo watcherio paleidimas' `
  -Force | Out-Null

Write-Host "Sukurta uzduotis: $TaskName"
Write-Host "Scriptas bus paleidziamas prisijungus prie Windows."
