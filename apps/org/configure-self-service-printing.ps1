param(
  [Parameter(Mandatory = $true)]
  [string]$ProfilePath
)

$ErrorActionPreference = "Stop"

function Get-OrAddProperty {
  param(
    [Parameter(Mandatory = $true)]
    [object]$Target,
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [object]$DefaultValue
  )

  $property = $Target.PSObject.Properties[$Name]
  if ($null -eq $property) {
    $Target | Add-Member -NotePropertyName $Name -NotePropertyValue $DefaultValue
    return $DefaultValue
  }
  return $property.Value
}

function Set-ObjectProperty {
  param(
    [Parameter(Mandatory = $true)]
    [object]$Target,
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [AllowNull()]
    [object]$Value
  )

  $property = $Target.PSObject.Properties[$Name]
  if ($null -eq $property) {
    $Target | Add-Member -NotePropertyName $Name -NotePropertyValue $Value
  }
  else {
    $property.Value = $Value
  }
}

$resolvedProfilePath = [System.IO.Path]::GetFullPath($ProfilePath)
$defaultProfilePath = Join-Path $resolvedProfilePath "Default"
$preferencesPath = Join-Path $defaultProfilePath "Preferences"

New-Item -ItemType Directory -Path $defaultProfilePath -Force | Out-Null

$preferences = [PSCustomObject]@{}
if (Test-Path -LiteralPath $preferencesPath) {
  $rawPreferences = Get-Content -LiteralPath $preferencesPath -Raw
  if ($rawPreferences.Trim()) {
    $preferences = $rawPreferences | ConvertFrom-Json
  }
}

$printing = Get-OrAddProperty $preferences "printing" ([PSCustomObject]@{})
Set-ObjectProperty $printing "print_header_footer" $false

$stickySettings = Get-OrAddProperty `
  $printing `
  "print_preview_sticky_settings" `
  ([PSCustomObject]@{})
$rawAppState = $stickySettings.PSObject.Properties["appState"].Value
$appState = [PSCustomObject]@{ version = 2 }
if ($rawAppState -is [string] -and $rawAppState.Trim()) {
  try {
    $appState = $rawAppState | ConvertFrom-Json
  }
  catch {
    Write-Warning "Existing Chromium print settings could not be parsed; replacing only print preview state."
  }
}

Set-ObjectProperty $appState "isHeaderFooterEnabled" $false
Set-ObjectProperty $appState "isCssBackgroundEnabled" $true
Set-ObjectProperty `
  $stickySettings `
  "appState" `
  ($appState | ConvertTo-Json -Depth 20 -Compress)

$json = $preferences | ConvertTo-Json -Depth 100 -Compress
$utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($preferencesPath, $json, $utf8WithoutBom)

Write-Host "[OK] Browser receipt headers and footers disabled: $preferencesPath"
