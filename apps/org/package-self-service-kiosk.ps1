param(
  [string]$OutputDirectory = ""
)

$ErrorActionPreference = "Stop"

if (-not $OutputDirectory) {
  $OutputDirectory = Join-Path $PSScriptRoot "release"
}
$OutputDirectory = [System.IO.Path]::GetFullPath($OutputDirectory)
$packageRoot = [System.IO.Path]::GetFullPath($PSScriptRoot)
if (-not $OutputDirectory.StartsWith($packageRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "OutputDirectory must be inside $packageRoot"
}

$stagingDirectory = Join-Path $OutputDirectory "MGL-Self-Service-Kiosk-Setup"
$zipPath = Join-Path $OutputDirectory "MGL-Self-Service-Kiosk-Setup.zip"

New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
if (Test-Path -LiteralPath $stagingDirectory) {
  Remove-Item -LiteralPath $stagingDirectory -Recurse -Force
}
New-Item -ItemType Directory -Path $stagingDirectory | Out-Null

$files = @(
  "install-self-service-kiosk.cmd",
  "install-self-service-kiosk-shortcut.ps1",
  "start-self-service-kiosk.cmd",
  "check-self-service-printer.ps1"
)
foreach ($file in $files) {
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot $file) -Destination $stagingDirectory -Force
}

$brandIconPath = [System.IO.Path]::GetFullPath(
  (Join-Path $PSScriptRoot "..\web\public\favicon.ico")
)
if (-not (Test-Path -LiteralPath $brandIconPath)) {
  throw "MGL icon not found: $brandIconPath"
}
Copy-Item -LiteralPath $brandIconPath -Destination (Join-Path $stagingDirectory "mgl-self-service.ico") -Force

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}
Compress-Archive -Path (Join-Path $stagingDirectory "*") -DestinationPath $zipPath -Force
Remove-Item -LiteralPath $stagingDirectory -Recurse -Force

Write-Host "[OK] Production kiosk setup package: $zipPath"
