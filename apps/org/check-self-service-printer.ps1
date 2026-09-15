$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing
$printerSettings = New-Object System.Drawing.Printing.PrinterSettings
$defaultPrinterName = [string]$printerSettings.PrinterName
$printers = @([System.Drawing.Printing.PrinterSettings]::InstalledPrinters)

if (-not $printerSettings.IsValid -or -not $defaultPrinterName) {
  Write-Host "[ERROR] Windows default printer is not configured."
  exit 2
}

$virtualPrinterPattern = "Microsoft Print to PDF|OneNote|XPS|Fax|PDFCreator|Adobe PDF"
if ($defaultPrinterName -match $virtualPrinterPattern) {
  Write-Host "[ERROR] Windows default printer is virtual: $defaultPrinterName"
  $physicalPrinters = @(
    $printers | Where-Object {
      $_ -notmatch $virtualPrinterPattern -and $_ -notmatch "Root Print Queue"
    }
  )
  if ($physicalPrinters.Count -gt 0) {
    Write-Host "[INFO] Available printer(s):"
    $physicalPrinters | ForEach-Object { Write-Host "       $_" }
  } else {
    Write-Host "[INFO] Install the thermal receipt printer driver first."
  }
  exit 3
}

Write-Host "[OK] Direct receipt printer: $defaultPrinterName"
exit 0
