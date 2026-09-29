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

$Deadline = (Get-Date).AddSeconds($TimeoutSeconds)
while ((Get-Date) -lt $Deadline) {
  if (Test-BridgeListening -Port $BridgePort) {
    Write-Host "[OK] Bridge listening: http://127.0.0.1:$BridgePort"
    exit 0
  }

  Start-Sleep -Seconds 1
}

Write-Host "[ERROR] Bridge listening oldsongui: http://127.0.0.1:$BridgePort"
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
