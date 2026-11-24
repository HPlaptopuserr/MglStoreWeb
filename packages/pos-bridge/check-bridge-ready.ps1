param(
  [string]$BridgeDir = "",
  [int]$TimeoutSeconds = 20
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

$BridgePort = 7420
$EnvPath = Join-Path $BridgeDir "bridge.env"
$LogPath = Join-Path $BridgeDir "logs\bridge.log"

if (Test-Path -LiteralPath $EnvPath) {
  foreach ($Line in Get-Content -LiteralPath $EnvPath) {
    if ($Line -match "^\s*BRIDGE_PORT\s*=\s*(\d+)\s*$") {
      $BridgePort = [int]$Matches[1]
    }
  }
}

$script:WrongProviderDetected = $false

function Test-BridgeReady {
  param([int]$Port)
  try {
    $Health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 5
    if ($Health.provider -ne "android-pgw") {
      Write-Host "[ERROR] Port $Port is occupied by provider '$($Health.provider)', not the installed Android PGW bridge."
      Write-Host "[INFO] Identify the old listener before closing it. No process was stopped; do not repeat Admin pairing."
      $script:WrongProviderDetected = $true
      return $false
    }
    if (-not $Health.ok) {
      Write-Host "[WAIT] Android PGW terminal not ready: $($Health.message)"
      return $false
    }
    if (-not $Health.signingEnabled) {
      Write-Host "[ERROR] Bridge signing is disabled. Another or older bridge may be using this port."
      return $false
    }
    return $true
  } catch {
    return $false
  }
}

$Deadline = (Get-Date).AddSeconds($TimeoutSeconds)
while ((Get-Date) -lt $Deadline) {
  if (Test-BridgeReady -Port $BridgePort) {
    Write-Host "[OK] Signed Android PGW bridge and terminal ready: http://127.0.0.1:$BridgePort"
    exit 0
  }

  if ($script:WrongProviderDetected) { break }
  Start-Sleep -Seconds 1
}

Write-Host "[ERROR] Android PGW terminal/signing not ready: http://127.0.0.1:$BridgePort"
Write-Host "[INFO] Log file: $LogPath"

if (Test-Path -LiteralPath $LogPath) {
  Write-Host ""
  Write-Host "----- bridge.log tail -----"
  $Lines = [System.IO.File]::ReadAllLines($LogPath)
  $Start = [Math]::Max(0, $Lines.Length - 40)
  for ($Index = $Start; $Index -lt $Lines.Length; $Index++) {
    Write-Host $Lines[$Index]
  }
  Write-Host "---------------------------"
}

exit 1
