param(
  [string]$BridgeDir = "",
  [string]$DesktopDir = ""
)

$ErrorActionPreference = "Stop"

if (-not $BridgeDir -or $BridgeDir.Trim().Length -eq 0) {
  $BridgeDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
$BridgeDir = (Resolve-Path -LiteralPath $BridgeDir).Path
$PairScript = Join-Path $BridgeDir "pair-bridge.cmd"
if (-not (Test-Path -LiteralPath $PairScript -PathType Leaf)) {
  throw "pair-bridge.cmd was not found in $BridgeDir"
}

# Respect the user's redirected Desktop, including OneDrive-managed profiles.
if (-not $DesktopDir -or $DesktopDir.Trim().Length -eq 0) {
  $DesktopDir = [Environment]::GetFolderPath("Desktop")
}
if (-not $DesktopDir -or $DesktopDir.Trim().Length -eq 0) {
  throw "The current user's Desktop folder was not found."
}
New-Item -ItemType Directory -Path $DesktopDir -Force | Out-Null

$ShortcutPath = Join-Path $DesktopDir "PAX A35 Connect.lnk"
$Shell = New-Object -ComObject WScript.Shell
$Shortcut = $Shell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $PairScript
$Shortcut.WorkingDirectory = $BridgeDir
$Shortcut.WindowStyle = 1
$Shortcut.Description = "Connect this cashier to the PAX A35 register selected in Admin"
$Shortcut.IconLocation = Join-Path $env:SystemRoot "System32\shell32.dll"
$Shortcut.Save()
Write-Host "[OK] PAX A35 desktop connection shortcut is ready."
