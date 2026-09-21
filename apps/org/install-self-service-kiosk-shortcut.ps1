param(
  [string]$Url = "https://org.mglstore.mn/dashboard/self-service?silentPrint=1",
  [string]$ShortcutName = "MGL Self Service Kiosk",
  [string]$ShortcutPath = "",
  [string]$InstallDirectory = ""
)

$ErrorActionPreference = "Stop"

$launcherSourcePath = Join-Path $PSScriptRoot "start-self-service-kiosk.cmd"
$printerCheckSourcePath = Join-Path $PSScriptRoot "check-self-service-printer.ps1"
$keepAwakeSourcePath = Join-Path $PSScriptRoot "keep-self-service-awake.ps1"
if (-not (Test-Path -LiteralPath $launcherSourcePath)) {
  throw "Kiosk launcher not found: $launcherSourcePath"
}
if (-not (Test-Path -LiteralPath $printerCheckSourcePath)) {
  throw "Printer checker not found: $printerCheckSourcePath"
}
if (-not (Test-Path -LiteralPath $keepAwakeSourcePath)) {
  throw "Kiosk keep-awake helper not found: $keepAwakeSourcePath"
}

if (-not $InstallDirectory) {
  $InstallDirectory = Join-Path $env:LOCALAPPDATA "MGLStore\SelfServiceKiosk"
}
$InstallDirectory = [System.IO.Path]::GetFullPath($InstallDirectory)
New-Item -ItemType Directory -Path $InstallDirectory -Force | Out-Null

$launcherPath = Join-Path $InstallDirectory "start-self-service-kiosk.cmd"
$printerCheckPath = Join-Path $InstallDirectory "check-self-service-printer.ps1"
$keepAwakePath = Join-Path $InstallDirectory "keep-self-service-awake.ps1"
Copy-Item -LiteralPath $launcherSourcePath -Destination $launcherPath -Force
Copy-Item -LiteralPath $printerCheckSourcePath -Destination $printerCheckPath -Force
Copy-Item -LiteralPath $keepAwakeSourcePath -Destination $keepAwakePath -Force

$brandIconSourceCandidates = @(
  (Join-Path $PSScriptRoot "mgl-self-service.ico"),
  ([System.IO.Path]::GetFullPath(
    (Join-Path $PSScriptRoot "..\web\public\favicon.ico")
  ))
)
$brandIconSourcePath = $brandIconSourceCandidates |
  Where-Object { Test-Path -LiteralPath $_ } |
  Select-Object -First 1
$brandIconPath = Join-Path $InstallDirectory "mgl-self-service.ico"
if ($brandIconSourcePath) {
  Copy-Item -LiteralPath $brandIconSourcePath -Destination $brandIconPath -Force
}

if (-not $ShortcutPath) {
  $desktopPath = [Environment]::GetFolderPath("Desktop")
  if (-not $desktopPath) {
    throw "Windows Desktop folder was not found."
  }
  $safeShortcutName = $ShortcutName.Trim()
  if (-not $safeShortcutName) {
    throw "ShortcutName is required."
  }
  if (-not $safeShortcutName.EndsWith(".lnk", [System.StringComparison]::OrdinalIgnoreCase)) {
    $safeShortcutName = "$safeShortcutName.lnk"
  }
  $ShortcutPath = Join-Path $desktopPath $safeShortcutName
}

$shortcutDirectory = Split-Path -Parent $ShortcutPath
if (-not (Test-Path -LiteralPath $shortcutDirectory)) {
  New-Item -ItemType Directory -Path $shortcutDirectory -Force | Out-Null
}

$browserCandidates = @(
  (Join-Path $env:LOCALAPPDATA "Programs\Opera GX\opera.exe"),
  (Join-Path $env:ProgramFiles "Google\Chrome\Application\chrome.exe"),
  (Join-Path ${env:ProgramFiles(x86)} "Google\Chrome\Application\chrome.exe"),
  (Join-Path $env:LOCALAPPDATA "Google\Chrome\Application\chrome.exe"),
  (Join-Path ${env:ProgramFiles(x86)} "Microsoft\Edge\Application\msedge.exe"),
  (Join-Path $env:ProgramFiles "Microsoft\Edge\Application\msedge.exe")
)
$browserPath = $browserCandidates |
  Where-Object { $_ -and (Test-Path -LiteralPath $_) } |
  Select-Object -First 1

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($ShortcutPath)
$shortcut.TargetPath = $launcherPath
$shortcut.Arguments = "`"$Url`""
$shortcut.WorkingDirectory = $PSScriptRoot
$shortcut.WindowStyle = 7
$shortcut.Description = "MGL Store Self Service Kiosk"
$shortcut.IconLocation = if (Test-Path -LiteralPath $brandIconPath) {
  "$brandIconPath,0"
} elseif ($browserPath) {
  "$browserPath,0"
} else {
  "$env:SystemRoot\System32\shell32.dll,137"
}
$shortcut.Save()

Write-Host "[OK] Desktop shortcut created: $ShortcutPath"
Write-Host "[OK] Kiosk files installed: $InstallDirectory"
Write-Host "[OK] Kiosk URL: $Url"
