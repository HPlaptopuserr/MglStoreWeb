param(
  [Parameter(Mandatory = $true)]
  [string]$ProfilePath,
  [int]$StartupTimeoutSeconds = 60
)

$ErrorActionPreference = "Stop"

Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class MglSelfServiceKioskPower {
  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern uint SetThreadExecutionState(uint esFlags);
}
"@

$esContinuous = [Convert]::ToUInt32("80000000", 16)
$esSystemRequired = [uint32]0x00000001
$esDisplayRequired = [uint32]0x00000002
$keepAwakeFlags = [uint32]($esContinuous -bor $esSystemRequired -bor $esDisplayRequired)
$normalizedProfilePath = [System.IO.Path]::GetFullPath($ProfilePath).TrimEnd("\")

function Get-KioskBrowserProcesses {
  try {
    return @(
      Get-CimInstance Win32_Process -ErrorAction Stop |
        Where-Object { $_.Name -in @("chrome.exe", "msedge.exe", "opera.exe") }
    )
  } catch {
    return @(
      Get-WmiObject Win32_Process -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -in @("chrome.exe", "msedge.exe", "opera.exe") }
    )
  }
}

function Test-KioskBrowserRunning {
  foreach ($process in Get-KioskBrowserProcesses) {
    $commandLine = [string]$process.CommandLine
    if (
      $commandLine -and
      $commandLine.IndexOf(
        $normalizedProfilePath,
        [System.StringComparison]::OrdinalIgnoreCase
      ) -ge 0
    ) {
      return $true
    }
  }
  return $false
}

$startupDeadline = (Get-Date).AddSeconds([Math]::Max(5, $StartupTimeoutSeconds))
while ((Get-Date) -lt $startupDeadline -and -not (Test-KioskBrowserRunning)) {
  Start-Sleep -Seconds 1
}

if (-not (Test-KioskBrowserRunning)) {
  exit 0
}

$missingChecks = 0
try {
  while ($missingChecks -lt 4) {
    if (Test-KioskBrowserRunning) {
      $missingChecks = 0
      if ([MglSelfServiceKioskPower]::SetThreadExecutionState($keepAwakeFlags) -eq 0) {
        throw "Windows rejected the kiosk keep-awake request."
      }
    } else {
      $missingChecks += 1
    }
    Start-Sleep -Seconds 15
  }
} finally {
  [void][MglSelfServiceKioskPower]::SetThreadExecutionState($esContinuous)
}
