param(
  [string]$TaskName = "MGL POS Bridge",
  [Parameter(Mandatory = $true)]
  [string]$BridgeDir
)

$ErrorActionPreference = "Stop"

$BridgeDir = [System.IO.Path]::GetFullPath($BridgeDir).TrimEnd("\")
$BridgePathPrefix = "$BridgeDir\"

# Stop the registered task first so its restart policy cannot reopen files
# while the installer replaces the bridge runtime and native serialport files.
try {
  & schtasks.exe /End /TN $TaskName 2>$null | Out-Null
} catch {
  # The task is optional on first install and on legacy shortcut installs.
}

$ProcessNames = @("cmd.exe", "node.exe", "powershell.exe", "pwsh.exe")
$Stopped = 0
$StoppedProcessIds = @{}

# The packaged bridge uses runtime\node.exe. Get-Process can identify it by
# executable path without requiring WMI/CIM permissions.
foreach ($ProcessName in @("node", "powershell", "pwsh", "cmd")) {
  foreach ($Process in @(Get-Process -Name $ProcessName -ErrorAction SilentlyContinue)) {
    if ($Process.Id -eq $PID) {
      continue
    }

    $ExecutablePath = ""
    try {
      $ExecutablePath = [string]$Process.Path
      if ($ExecutablePath.IndexOf($BridgePathPrefix, [System.StringComparison]::OrdinalIgnoreCase) -ne 0) {
        continue
      }

      Stop-Process -Id $Process.Id -Force -ErrorAction Stop
      $StoppedProcessIds[$Process.Id] = $true
      $Stopped += 1
    } catch {
      # Access to unrelated system processes can be denied. Only report a
      # warning when the process was already identified as part of the bridge.
      if ($ExecutablePath -and
          $ExecutablePath.IndexOf($BridgePathPrefix, [System.StringComparison]::OrdinalIgnoreCase) -eq 0) {
        Write-Host "[WARN] Process $($Process.Id) could not be stopped: $($_.Exception.Message)"
      }
    }
  }
}

try {
  $Processes = @(Get-WmiObject Win32_Process -ErrorAction Stop)
  foreach ($Process in $Processes) {
    if ($Process.ProcessId -eq $PID -or
        $StoppedProcessIds.ContainsKey([int]$Process.ProcessId) -or
        $ProcessNames -notcontains $Process.Name) {
      continue
    }

    $CommandLine = [string]$Process.CommandLine
    $ExecutablePath = [string]$Process.ExecutablePath
    $RunsInstalledBridge =
      $CommandLine.IndexOf($BridgePathPrefix, [System.StringComparison]::OrdinalIgnoreCase) -ge 0 -or
      $ExecutablePath.IndexOf($BridgePathPrefix, [System.StringComparison]::OrdinalIgnoreCase) -eq 0

    if (-not $RunsInstalledBridge) {
      continue
    }

    $Result = $Process.Terminate()
    if ($Result.ReturnValue -eq 0) {
      $Stopped += 1
    } else {
      Write-Host "[WARN] Process $($Process.ProcessId) could not be stopped (WMI $($Result.ReturnValue))."
    }
  }
} catch {
  Write-Host "[INFO] Extended process scan unavailable; executable-path scan completed."
}

# Give Task Scheduler and native serialport handles time to close before
# robocopy replaces node.exe and *.node binaries.
Start-Sleep -Milliseconds 750

Write-Host "[OK] Old bridge stop completed ($Stopped process(es))."
