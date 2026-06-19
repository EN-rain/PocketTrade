param(
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$AssetsRoot = Join-Path $Root "backend\public\assets\seed"
$PhoneDir = Join-Path $AssetsRoot "phones"
$ProfileDir = Join-Path $AssetsRoot "profiles"

New-Item -ItemType Directory -Force -Path $PhoneDir | Out-Null
New-Item -ItemType Directory -Force -Path $ProfileDir | Out-Null

function Download-Image([string]$Url, [string]$Destination, [int]$MinimumBytes = 10240) {
  if ((Test-Path $Destination) -and -not $Force) {
    Write-Host "Exists: $Destination"
    return
  }

  $temporary = "$Destination.download"
  Remove-Item $temporary -Force -ErrorAction SilentlyContinue
  Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile $temporary -MaximumRedirection 10 -TimeoutSec 60

  $info = Get-Item $temporary
  if ($info.Length -lt $MinimumBytes) {
    Remove-Item $temporary -Force -ErrorAction SilentlyContinue
    throw "Downloaded image is unexpectedly small: $Url"
  }

  Move-Item $temporary $Destination -Force
  Write-Host "Downloaded: $Destination"
}

# Two different phone photos per seeded listing.
for ($i = 1; $i -le 40; $i++) {
  $number = $i.ToString("00")
  $lock = 5000 + $i
  $url = "https://loremflickr.com/1200/900/smartphone,mobile?lock=$lock"
  Download-Image $url (Join-Path $PhoneDir "phone-$number.jpg") 10240
}

# One distinct portrait for the buyer, admin, and every seeded seller.
$profiles = @(
  "https://randomuser.me/api/portraits/men/11.jpg",
  "https://randomuser.me/api/portraits/women/12.jpg",
  "https://randomuser.me/api/portraits/men/13.jpg",
  "https://randomuser.me/api/portraits/women/14.jpg",
  "https://randomuser.me/api/portraits/men/15.jpg",
  "https://randomuser.me/api/portraits/women/16.jpg",
  "https://randomuser.me/api/portraits/men/17.jpg",
  "https://randomuser.me/api/portraits/women/18.jpg",
  "https://randomuser.me/api/portraits/men/19.jpg",
  "https://randomuser.me/api/portraits/women/20.jpg",
  "https://randomuser.me/api/portraits/men/21.jpg",
  "https://randomuser.me/api/portraits/women/22.jpg",
  "https://randomuser.me/api/portraits/men/23.jpg",
  "https://randomuser.me/api/portraits/women/24.jpg",
  "https://randomuser.me/api/portraits/men/25.jpg",
  "https://randomuser.me/api/portraits/women/26.jpg",
  "https://randomuser.me/api/portraits/men/27.jpg",
  "https://randomuser.me/api/portraits/women/28.jpg",
  "https://randomuser.me/api/portraits/men/29.jpg",
  "https://randomuser.me/api/portraits/women/30.jpg",
  "https://randomuser.me/api/portraits/men/31.jpg",
  "https://randomuser.me/api/portraits/women/32.jpg"
)

for ($i = 0; $i -lt $profiles.Count; $i++) {
  $number = ($i + 1).ToString("00")
  Download-Image $profiles[$i] (Join-Path $ProfileDir "profile-$number.jpg") 1024
}

Write-Host "Seed images are ready under backend/public/assets/seed"
