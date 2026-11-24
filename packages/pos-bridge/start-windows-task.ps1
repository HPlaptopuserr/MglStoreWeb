param(
  [string]$BridgeDir = ""
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

$LogDir = Join-Path $BridgeDir "logs"
$LogPath = Join-Path $LogDir "bridge.log"
$StartScript = Join-Path $BridgeDir "start-windows.cmd"
$BridgePort = 7420

if (-not (Test-Path -LiteralPath $StartScript)) {
  throw "start-windows.cmd was not found in $BridgeDir"
}

New-Item -ItemType Directory -Path $LogDir -Force | Out-Null

function Get-BridgePort {
  $EnvPath = Join-Path $BridgeDir "bridge.env"
  if (-not (Test-Path -LiteralPath $EnvPath)) {
    return $BridgePort
  }

  foreach ($Line in Get-Content -LiteralPath $EnvPath) {
    if ($Line -match "^\s*BRIDGE_PORT\s*=\s*(\d+)\s*$") {
      return [int]$Matches[1]
    }
  }

  return $BridgePort
}

function Test-BridgeListening {
  param([int]$Port)

  $Client = New-Object System.Net.Sockets.TcpClient
  try {
    $Async = $Client.BeginConnect("127.0.0.1", $Port, $null, $null)
    if (-not $Async.AsyncWaitHandle.WaitOne(500)) {
      return $false
    }

    $Client.EndConnect($Async)
    return $true
  } catch {
    return $false
  } finally {
    $Client.Close()
  }
}

$BridgePort = Get-BridgePort
$startedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -LiteralPath $LogPath -Value ""
Add-Content -LiteralPath $LogPath -Value "[$startedAt] Starting MGL POS Bridge..."

if (Test-BridgeListening -Port $BridgePort) {
  $Provider = "unknown"
  $Signing = "unknown"
  try {
    $Health = Invoke-RestMethod -Uri "http://127.0.0.1:$BridgePort/health" -TimeoutSec 5
    $Provider = [string]$Health.provider
    $Signing = [string]$Health.signingEnabled
  } catch {
    # A listener alone does not establish that this installed bridge is running.
  }
  $Diagnostic = "Port 127.0.0.1:$BridgePort is already occupied (provider=$Provider, signing=$Signing). The installed bridge was NOT started. No existing process was stopped."
  Add-Content -LiteralPath $LogPath -Value "[$startedAt] ERROR: $Diagnostic"
  Write-Host "[ERROR] $Diagnostic"
  Write-Host "[INFO] Identify the listener before closing it. Preserve any pending payment; do not repeat Admin pairing."
  try {
    $Listeners = @(Get-NetTCPConnection -LocalPort $BridgePort -State Listen -ErrorAction Stop)
    foreach ($Listener in $Listeners) {
      Write-Host "[INFO] Listening process ID: $($Listener.OwningProcess)"
    }
  } catch {
    # Older Windows versions may not have Get-NetTCPConnection.
  }
  exit 1
}

Push-Location $BridgeDir
try {
  $Command = "`"$StartScript`" --no-pause >> `"$LogPath`" 2>&1"
  & $env:ComSpec /d /c $Command
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
