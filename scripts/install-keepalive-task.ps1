param(
    [string]$TaskName = "PocketTrade Keepalive",
    [string]$HealthUrl = "https://pockettrade-ebaq.onrender.com/health",
    [int]$IntervalMinutes = 5
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptPath = Join-Path $PSScriptRoot "keepalive.ps1"
$logPath = Join-Path (Split-Path -Parent $PSScriptRoot) "keepalive.log"

$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptPath`" -HealthUrl `"$HealthUrl`" -LogFile `"$logPath`""

$trigger = New-ScheduledTaskTrigger `
    -Once `
    -At (Get-Date).AddMinutes(1) `
    -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) `
    -RepetitionDuration (New-TimeSpan -Days 3650)

$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 3) `
    -MultipleInstances IgnoreNew

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "Pings the PocketTrade backend /health every $IntervalMinutes minutes so the Render free instance does not spin down." `
    -Force | Out-Null

Write-Output "Registered scheduled task '$TaskName' (every $IntervalMinutes minutes)."
Write-Output "Log: $logPath"
Write-Output "Remove with: Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
