param(
    [string]$HealthUrl = "https://pockettrade-ebaq.onrender.com/health",
    [int]$TimeoutSeconds = 120,
    [string]$LogFile = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$startedAt = Get-Date
try {
    $response = Invoke-WebRequest -Uri $HealthUrl -UseBasicParsing -TimeoutSec $TimeoutSeconds
    $line = "{0:o} OK {1} ({2:n1}s)" -f $startedAt, $response.StatusCode, ((Get-Date) - $startedAt).TotalSeconds
    $exitCode = 0
}
catch {
    $line = "{0:o} FAIL {1}" -f $startedAt, $_.Exception.Message
    $exitCode = 1
}

Write-Output $line
if ($LogFile) {
    $logDir = Split-Path -Parent $LogFile
    if ($logDir -and -not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    Add-Content -Path $LogFile -Value $line
}

exit $exitCode
