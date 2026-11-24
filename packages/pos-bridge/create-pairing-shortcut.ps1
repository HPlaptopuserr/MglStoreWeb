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
# WScript.Shell may narrow the Save filename through the active ANSI code page.
# Save in an ASCII staging directory, then use Unicode-aware .NET file IO for
# redirected Desktop paths. Failure is a nonfatal installer convenience warning.
$StagingRoot = [System.IO.Path]::GetTempPath()
if ($StagingRoot -match '[^\x00-\x7F]') {
  $StagingRoot = Join-Path $env:SystemRoot "Temp"
}
if ($StagingRoot -match '[^\x00-\x7F]') {
  throw "An ASCII shortcut staging directory is unavailable. Use pair-bridge.cmd."
}
$StagingDir = Join-Path $StagingRoot ("MGL-PAX-Shortcut-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $StagingDir -Force | Out-Null
try {
  $StagingShortcut = Join-Path $StagingDir "PAX A35 Connect.lnk"
  $Shell = New-Object -ComObject WScript.Shell
  $Shortcut = $Shell.CreateShortcut($StagingShortcut)
  $Shortcut.TargetPath = $PairScript
  $Shortcut.WorkingDirectory = $BridgeDir
  $Shortcut.WindowStyle = 1
  $Shortcut.Description = "Connect this cashier to the PAX A35 register selected in Admin"
  $Shortcut.IconLocation = Join-Path $env:SystemRoot "System32\shell32.dll"
  $Shortcut.Save()
  [System.IO.File]::Copy($StagingShortcut, $ShortcutPath, $true)
} finally {
  if (Test-Path -LiteralPath $StagingDir) {
    Remove-Item -LiteralPath $StagingDir -Recurse -Force
  }
}
Write-Host "[OK] PAX A35 desktop connection shortcut is ready."
