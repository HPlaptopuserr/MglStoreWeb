param(
  [string]$OutputRoot = "",
  [string]$NodeExe = ""
)

$ErrorActionPreference = "Stop"

$PackageDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$RepoRoot = Resolve-Path (Join-Path $PackageDir "..\..")

if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = "C:\tmp\mgl-pos-bridge-release"
}

$OutputRoot = [System.IO.Path]::GetFullPath($OutputRoot)
$PackageDirPath = [System.IO.Path]::GetFullPath($PackageDir)
$BuildStamp = Get-Date -Format "yyyyMMdd-HHmmss"
$OutDir = Join-Path $OutputRoot "mgl-pos-bridge-android-pgw-$BuildStamp"
$ZipPath = Join-Path $OutputRoot "mgl-pos-bridge-android-pgw.zip"
$InstallerWorkDir = Join-Path $OutputRoot "installer-work"
$InstallerExePath = Join-Path $OutputRoot "MGL-POS-Bridge-Android-PGW-Installer.exe"

function Invoke-Checked {
  param(
    [string]$FilePath,
    [string[]]$Arguments,
    [string]$WorkingDirectory
  )

  Push-Location $WorkingDirectory
  try {
    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "$FilePath $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
    }
  } finally {
    Pop-Location
  }
}

function Assert-SafeOutputPath {
  param([string]$PathToCheck)

  $fullPath = [System.IO.Path]::GetFullPath($PathToCheck)
  if (-not $fullPath.StartsWith($PackageDirPath, [System.StringComparison]::OrdinalIgnoreCase) -and
      -not $fullPath.StartsWith((Resolve-Path "C:\tmp").Path, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Output path must be inside the pos-bridge package directory or C:\tmp. Got: $fullPath"
  }
}

Assert-SafeOutputPath $OutputRoot

$pnpm = (Get-Command pnpm -ErrorAction Stop).Source
$npm = (Get-Command npm -ErrorAction Stop).Source

if ([string]::IsNullOrWhiteSpace($NodeExe)) {
  $NodeExe = (Get-Command node -ErrorAction Stop).Source
}
$NodeExe = [System.IO.Path]::GetFullPath($NodeExe)
if (-not (Test-Path $NodeExe)) {
  throw "Node runtime not found: $NodeExe"
}

Write-Host "[BUILD] Compiling @mgl/pos-bridge..."
Invoke-Checked $pnpm @("--filter", "@mgl/pos-bridge", "build") $RepoRoot

if (-not (Test-Path $OutputRoot)) {
  New-Item -ItemType Directory -Path $OutputRoot | Out-Null
}

Write-Host "[PACKAGE] Copying bridge files..."
New-Item -ItemType Directory -Path $OutDir | Out-Null
Copy-Item -LiteralPath (Join-Path $PackageDir "package.json") -Destination $OutDir -Force
Copy-Item -LiteralPath (Join-Path $PackageDir "dist") -Destination $OutDir -Recurse -Force
Copy-Item -LiteralPath (Join-Path $PackageDir "install-android-pgw.cmd") -Destination $OutDir -Force
Copy-Item -LiteralPath (Join-Path $PackageDir "start-windows.cmd") -Destination $OutDir -Force

Write-Host "[PACKAGE] Installing production dependencies..."
Invoke-Checked $npm @("install", "--omit=dev", "--no-audit", "--no-fund") $OutDir

$RuntimeDir = Join-Path $OutDir "runtime"
New-Item -ItemType Directory -Path $RuntimeDir -Force | Out-Null
Copy-Item -LiteralPath $NodeExe -Destination (Join-Path $RuntimeDir "node.exe") -Force

if (Test-Path $ZipPath) {
  Remove-Item -LiteralPath $ZipPath -Force
}

Write-Host "[ZIP] Creating flash-drive zip..."
Compress-Archive -Path (Join-Path $OutDir "*") -DestinationPath $ZipPath -Force

if (Get-Command iexpress.exe -ErrorAction SilentlyContinue) {
  Write-Host "[EXE] Creating self-extracting installer..."
  if (Test-Path $InstallerWorkDir) {
    Remove-Item -LiteralPath $InstallerWorkDir -Recurse -Force
  }
  New-Item -ItemType Directory -Path $InstallerWorkDir | Out-Null

  Copy-Item -LiteralPath $ZipPath -Destination (Join-Path $InstallerWorkDir "mgl-pos-bridge-android-pgw.zip") -Force

  $BootstrapPath = Join-Path $InstallerWorkDir "install-from-zip.cmd"
  @'
@echo off
setlocal

set "ZIP_PATH=%~dp0mgl-pos-bridge-android-pgw.zip"
set "EXTRACT_DIR=%TEMP%\mgl-pos-bridge-installer"

if exist "%EXTRACT_DIR%" rmdir /s /q "%EXTRACT_DIR%"
mkdir "%EXTRACT_DIR%"

powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '%ZIP_PATH%' -DestinationPath '%EXTRACT_DIR%' -Force"
if errorlevel 1 (
  echo [ERROR] Installer zadlahad aldaa garlaa.
  pause
  exit /b 1
)

call "%EXTRACT_DIR%\install-android-pgw.cmd"
exit /b %ERRORLEVEL%
'@ | Set-Content -LiteralPath $BootstrapPath -Encoding ASCII

  $SedPath = Join-Path $InstallerWorkDir "mgl-pos-bridge.sed"
  $SedContent = @"
[Version]
Class=IEXPRESS
SEDVersion=3

[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=1
HideExtractAnimation=1
UseLongFileName=1
InsideCompressed=1
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=%InstallPrompt%
DisplayLicense=%DisplayLicense%
FinishMessage=%FinishMessage%
TargetName=%TargetName%
FriendlyName=%FriendlyName%
AppLaunched=%AppLaunched%
PostInstallCmd=%PostInstallCmd%
AdminQuietInstCmd=%AdminQuietInstCmd%
UserQuietInstCmd=%UserQuietInstCmd%
SourceFiles=SourceFiles

[Strings]
InstallPrompt=
DisplayLicense=
FinishMessage=
TargetName=$InstallerExePath
FriendlyName=MGL POS Bridge Android PGW Installer
AppLaunched=install-from-zip.cmd
PostInstallCmd=<None>
AdminQuietInstCmd=
UserQuietInstCmd=

[SourceFiles]
SourceFiles0=$InstallerWorkDir\

[SourceFiles0]
%FILE0%=mgl-pos-bridge-android-pgw.zip
%FILE1%=install-from-zip.cmd
"@
  Set-Content -LiteralPath $SedPath -Value $SedContent -Encoding ASCII

  if (Test-Path $InstallerExePath) {
    Remove-Item -LiteralPath $InstallerExePath -Force
  }

  Invoke-Checked "iexpress.exe" @("/N", "/Q", $SedPath) $InstallerWorkDir
  if (-not (Test-Path $InstallerExePath)) {
    Write-Host "[WARN] iexpress.exe did not create an installer exe on this Windows setup; use the zip package."
  }
} else {
  Write-Host "[WARN] iexpress.exe not found; only zip package was created."
}

Write-Host ""
Write-Host "[OK] Portable package:"
Write-Host "     $OutDir"
Write-Host "[OK] Flash-drive zip:"
Write-Host "     $ZipPath"
if (Test-Path $InstallerExePath) {
  Write-Host "[OK] Flash-drive installer exe:"
  Write-Host "     $InstallerExePath"
}
Write-Host ""
if (Test-Path $InstallerExePath) {
  Write-Host "Copy the exe to the cashier PC, then run it."
} else {
  Write-Host "Copy the zip or folder to the cashier PC, then run install-android-pgw.cmd."
}
