param(
  [string]$TaskName = "MGL POS Bridge",
  [string]$BridgeDir = "",
  [int]$DelaySeconds = 30,
  [switch]$StartNow
)

$ErrorActionPreference = "Stop"

if (-not $BridgeDir -or $BridgeDir.Trim().Length -eq 0) {
  $ScriptPath = $MyInvocation.MyCommand.Path
  if ($ScriptPath -and $ScriptPath.Trim().Length -gt 0) {
    $BridgeDir = Split-Path -Parent $ScriptPath
  } else {
    $BridgeDir = (Get-Location).Path
  }
}

$BridgeDir = (Resolve-Path -LiteralPath $BridgeDir).Path
$TaskRunner = Join-Path $BridgeDir "start-windows-task.ps1"
$StartScript = Join-Path $BridgeDir "start-windows.cmd"

if (-not (Test-Path -LiteralPath $StartScript)) {
  throw "start-windows.cmd was not found in $BridgeDir"
}

if (-not (Test-Path -LiteralPath $TaskRunner)) {
  throw "start-windows-task.ps1 was not found in $BridgeDir"
}

New-Item -ItemType Directory -Path (Join-Path $BridgeDir "logs") -Force | Out-Null

$PowerShellExe = Join-Path $PSHOME "powershell.exe"

function Register-WithScheduledTasks {
  $Action = New-ScheduledTaskAction `
    -Execute $PowerShellExe `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$TaskRunner`" -BridgeDir `"$BridgeDir`"" `
    -WorkingDirectory $BridgeDir

  $Trigger = New-ScheduledTaskTrigger -AtLogOn
  if ($DelaySeconds -gt 0) {
    try {
      $Trigger.Delay = "PT${DelaySeconds}S"
    } catch {
      Write-Host "[WARN] Scheduled Task delay could not be set; task will start immediately after login."
    }
  }

  $Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Seconds 0) `
    -Hidden `
    -MultipleInstances IgnoreNew `
    -RestartCount 999 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -StartWhenAvailable

  Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Description "Starts the local MGL POS Bridge after Windows login." `
    -Force | Out-Null
}

function Register-WithSchtasksExe {
  $TaskCommand = "`"$PowerShellExe`" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$TaskRunner`" -BridgeDir `"$BridgeDir`""
  $Arguments = @(
    "/Create",
    "/TN", $TaskName,
    "/SC", "ONLOGON",
    "/TR", $TaskCommand,
    "/F"
  )

  & schtasks.exe @Arguments | Out-Host
  if ($LASTEXITCODE -ne 0) {
    throw "schtasks.exe failed with exit code $LASTEXITCODE"
  }
}

function Register-WithStartupShortcut {
  $StartupDir = [Environment]::GetFolderPath("Startup")
  if (-not $StartupDir -or $StartupDir.Trim().Length -eq 0) {
    throw "Windows Startup folder was not found."
  }

  $ShortcutPath = Join-Path $StartupDir "MGL POS Bridge.lnk"
  $Shell = New-Object -ComObject WScript.Shell
  $Shortcut = $Shell.CreateShortcut($ShortcutPath)
  $Shortcut.TargetPath = $PowerShellExe
  $Shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$TaskRunner`" -BridgeDir `"$BridgeDir`""
  $Shortcut.WorkingDirectory = $BridgeDir
  $Shortcut.WindowStyle = 7
  $Shortcut.Description = "MGL POS Bridge for Android PGW terminal"
  $Shortcut.Save()

  Write-Host "[OK] Startup shortcut registered: $ShortcutPath"
}

$RegisteredMode = ""
try {
  Register-WithScheduledTasks
  $RegisteredMode = "Scheduled Task"
} catch {
  Write-Host "[WARN] ScheduledTasks cmdlet failed: $($_.Exception.Message)"
  try {
    Register-WithSchtasksExe
    $RegisteredMode = "schtasks.exe"
  } catch {
    Write-Host "[WARN] schtasks.exe failed: $($_.Exception.Message)"
    Register-WithStartupShortcut
    $RegisteredMode = "Startup shortcut"
  }
}

if ($RegisteredMode -ne "Startup shortcut") {
  $LegacyShortcut = Join-Path ([Environment]::GetFolderPath("Startup")) "MGL POS Bridge.lnk"
  if (Test-Path -LiteralPath $LegacyShortcut) {
    Remove-Item -LiteralPath $LegacyShortcut -Force
  }
}

function Start-RegisteredBridge {
  if ($RegisteredMode -eq "Scheduled Task") {
    Start-ScheduledTask -TaskName $TaskName
    Write-Host "[OK] Scheduled Task started now."
    return
  }

  if ($RegisteredMode -eq "schtasks.exe") {
    & schtasks.exe /Run /TN $TaskName | Out-Host
    if ($LASTEXITCODE -ne 0) {
      throw "schtasks.exe /Run failed with exit code $LASTEXITCODE"
    }
    Write-Host "[OK] Scheduled Task started now by schtasks.exe."
    return
  }

  $LaunchArguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$TaskRunner`" -BridgeDir `"$BridgeDir`""
  Start-Process `
    -FilePath $PowerShellExe `
    -ArgumentList $LaunchArguments `
    -WorkingDirectory $BridgeDir `
    -WindowStyle Hidden | Out-Null
  Write-Host "[OK] Bridge background process started now."
}

Write-Host "[OK] Auto-start registered by: $RegisteredMode"
Write-Host "[OK] Bridge directory: $BridgeDir"
Write-Host "[OK] Log file: $(Join-Path $BridgeDir "logs\bridge.log")"

if ($StartNow) {
  Start-RegisteredBridge
}
