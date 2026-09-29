param(
  [int]$Port = 17358
)

$ErrorActionPreference = "Stop"
$mutex = New-Object System.Threading.Mutex($false, "Local\MGLSelfServicePrinterBridge")
if (-not $mutex.WaitOne(0, $false)) {
  exit 0
}

Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public static class MglRawPrinter
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct DOC_INFO_1
    {
        [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPWStr)] public string pDatatype;
    }

    [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool OpenPrinter(string printerName, out IntPtr printer, IntPtr defaults);

    [DllImport("winspool.drv", SetLastError = true)]
    private static extern bool ClosePrinter(IntPtr printer);

    [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern int StartDocPrinter(IntPtr printer, int level, ref DOC_INFO_1 docInfo);

    [DllImport("winspool.drv", SetLastError = true)]
    private static extern bool EndDocPrinter(IntPtr printer);

    [DllImport("winspool.drv", SetLastError = true)]
    private static extern bool StartPagePrinter(IntPtr printer);

    [DllImport("winspool.drv", SetLastError = true)]
    private static extern bool EndPagePrinter(IntPtr printer);

    [DllImport("winspool.drv", SetLastError = true)]
    private static extern bool WritePrinter(IntPtr printer, byte[] bytes, int count, out int written);

    public static void Cut(string printerName)
    {
        IntPtr printer;
        if (!OpenPrinter(printerName, out printer, IntPtr.Zero))
            throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());

        try
        {
            var docInfo = new DOC_INFO_1
            {
                pDocName = "MGL Self Service Paper Cut",
                pOutputFile = null,
                pDatatype = "RAW"
            };

            if (StartDocPrinter(printer, 1, ref docInfo) == 0)
                throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());

            try
            {
                if (!StartPagePrinter(printer))
                    throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());

                try
                {
                    // ESC d 4: feed four lines. GS V 66 0: partial cut after the feed.
                    byte[] command = new byte[] { 0x1B, 0x64, 0x04, 0x1D, 0x56, 0x42, 0x00 };
                    int written;
                    if (!WritePrinter(printer, command, command.Length, out written) || written != command.Length)
                        throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
                }
                finally
                {
                    EndPagePrinter(printer);
                }
            }
            finally
            {
                EndDocPrinter(printer);
            }
        }
        finally
        {
            ClosePrinter(printer);
        }
    }
}
"@

function Get-AllowedOrigin([string]$Origin) {
  if (-not $Origin) { return "*" }
  if ($Origin -match '^https://org\.mglstore\.mn$') { return $Origin }
  if ($Origin -match '^http://localhost(?::\d+)?$') { return $Origin }
  if ($Origin -match '^http://127\.0\.0\.1(?::\d+)?$') { return $Origin }
  return "null"
}

function Write-HttpResponse {
  param(
    [System.Net.Sockets.NetworkStream]$Stream,
    [int]$StatusCode,
    [string]$StatusText,
    [string]$Body,
    [string]$Origin
  )

  $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($Body)
  $headers = @(
    "HTTP/1.1 $StatusCode $StatusText",
    "Content-Type: application/json; charset=utf-8",
    "Content-Length: $($bodyBytes.Length)",
    "Access-Control-Allow-Origin: $(Get-AllowedOrigin $Origin)",
    "Access-Control-Allow-Methods: GET, POST, OPTIONS",
    "Access-Control-Allow-Headers: Content-Type",
    "Access-Control-Allow-Private-Network: true",
    "Cache-Control: no-store",
    "Connection: close",
    "",
    ""
  ) -join "`r`n"
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  if ($bodyBytes.Length -gt 0) {
    $Stream.Write($bodyBytes, 0, $bodyBytes.Length)
  }
  $Stream.Flush()
}

function Write-JsonResponse {
  param(
    [System.Net.Sockets.NetworkStream]$Stream,
    [int]$StatusCode,
    [string]$StatusText,
    [object]$Payload,
    [string]$Origin
  )

  $body = $Payload | ConvertTo-Json -Compress -Depth 12
  Write-HttpResponse $Stream $StatusCode $StatusText $body $Origin
}

function Read-RequestBody {
  param(
    [System.IO.StreamReader]$Reader,
    [hashtable]$Headers
  )

  $contentLength = 0
  if ($Headers.ContainsKey("content-length")) {
    $contentLength = [int]$Headers["content-length"]
  }
  if ($contentLength -le 0) { return "" }
  if ($contentLength -gt 1048576) { throw "Request body is too large" }

  # The web client sends JSON with non-ASCII characters escaped as \uXXXX.
  # Therefore Content-Length bytes and the character count are identical here.
  $buffer = New-Object char[] $contentLength
  $offset = 0
  while ($offset -lt $contentLength) {
    $read = $Reader.Read($buffer, $offset, $contentLength - $offset)
    if ($read -le 0) { break }
    $offset += $read
  }
  return [string]::new($buffer, 0, $offset)
}

function Get-PrinterInventory {
  $defaultSettings = New-Object System.Drawing.Printing.PrinterSettings
  $defaultPrinter = if ($defaultSettings.IsValid) {
    [string]$defaultSettings.PrinterName
  } else {
    ""
  }
  $printers = @(
    [System.Drawing.Printing.PrinterSettings]::InstalledPrinters |
      ForEach-Object { [string]$_ }
  )

  return @{
    ok = $true
    defaultPrinter = $defaultPrinter
    printers = $printers
  }
}

function Print-KitchenTicket {
  param([object]$Payload)

  $printerName = [string]$Payload.printerName
  if ([string]::IsNullOrWhiteSpace($printerName)) {
    throw "Kitchen printer is not selected"
  }

  $printerSettings = New-Object System.Drawing.Printing.PrinterSettings
  $printerSettings.PrinterName = $printerName
  if (-not $printerSettings.IsValid) {
    throw "Kitchen printer was not found: $printerName"
  }

  $paperWidthMm = [int]$Payload.paperWidthMm
  if ($paperWidthMm -ne 58 -and $paperWidthMm -ne 80) {
    $paperWidthMm = 80
  }
  $paperWidth = [Math]::Round($paperWidthMm / 25.4 * 100)
  $items = @($Payload.items)
  if ($items.Count -eq 0) {
    throw "Kitchen ticket has no items"
  }
  $itemNoteCount = @($items | Where-Object { [string]$_.note }).Count
  $orderNoteHeight = if ([string]$Payload.note) { 80 } else { 0 }
  $paperHeight = [Math]::Max(
    300,
    230 + ($items.Count * 55) + ($itemNoteCount * 30) + $orderNoteHeight
  )

  $document = New-Object System.Drawing.Printing.PrintDocument
  $document.DocumentName = "MGL Kitchen Order $([string]$Payload.ticketNo)"
  $document.PrinterSettings.PrinterName = $printerName
  $document.PrintController = New-Object System.Drawing.Printing.StandardPrintController
  $document.DefaultPageSettings.PaperSize = New-Object System.Drawing.Printing.PaperSize(
    "MGL Kitchen Ticket",
    $paperWidth,
    $paperHeight
  )
  $document.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(8, 8, 5, 8)
  $document.OriginAtMargins = $true

  $printHandler = [System.Drawing.Printing.PrintPageEventHandler]{
    param($sender, $eventArgs)

    $graphics = $eventArgs.Graphics
    $width = [single]$eventArgs.MarginBounds.Width
    $y = [single]0
    $black = [System.Drawing.Brushes]::Black
    $regularFont = New-Object System.Drawing.Font("Arial", 9, [System.Drawing.FontStyle]::Regular)
    $smallFont = New-Object System.Drawing.Font("Arial", 8, [System.Drawing.FontStyle]::Regular)
    $boldFont = New-Object System.Drawing.Font("Arial", 11, [System.Drawing.FontStyle]::Bold)
    $ticketFont = New-Object System.Drawing.Font("Arial", 21, [System.Drawing.FontStyle]::Bold)
    $center = New-Object System.Drawing.StringFormat
    $center.Alignment = [System.Drawing.StringAlignment]::Center
    $left = New-Object System.Drawing.StringFormat
    $left.Alignment = [System.Drawing.StringAlignment]::Near

    try {
      $organizationName = [string]$Payload.organizationName
      if ($organizationName) {
        $graphics.DrawString($organizationName, $boldFont, $black, (New-Object System.Drawing.RectangleF(0, $y, $width, 28)), $center)
        $y += 28
      }
      $heading = [string]$Payload.heading
      if (-not $heading) { $heading = "KITCHEN ORDER" }
      $graphics.DrawString($heading, $regularFont, $black, (New-Object System.Drawing.RectangleF(0, $y, $width, 22)), $center)
      $y += 25
      $ticketNo = [string]$Payload.ticketNo
      $graphics.DrawString("#$ticketNo", $ticketFont, $black, (New-Object System.Drawing.RectangleF(0, $y, $width, 48)), $center)
      $y += 50

      $orderLabel = [string]$Payload.orderLabel
      $registerName = [string]$Payload.registerName
      $createdAt = [string]$Payload.createdAt
      $meta = @($orderLabel, $registerName, $createdAt) | Where-Object { $_ }
      if ($meta.Count -gt 0) {
        $graphics.DrawString(($meta -join " | "), $smallFont, $black, (New-Object System.Drawing.RectangleF(0, $y, $width, 34)), $center)
        $y += 36
      }

      $graphics.DrawLine([System.Drawing.Pens]::Black, 0, $y, $width, $y)
      $y += 12

      foreach ($item in $items) {
        $qty = [int]$item.qty
        $name = [string]$item.name
        $itemText = "$qty x $name"
        $itemHeight = [Math]::Max(34, [Math]::Ceiling($graphics.MeasureString($itemText, $boldFont, [int]$width).Height) + 4)
        $graphics.DrawString($itemText, $boldFont, $black, (New-Object System.Drawing.RectangleF(0, $y, $width, $itemHeight)), $left)
        $y += $itemHeight

        $itemNote = [string]$item.note
        if ($itemNote) {
          $noteText = "  - $itemNote"
          $noteHeight = [Math]::Max(24, [Math]::Ceiling($graphics.MeasureString($noteText, $regularFont, [int]$width).Height) + 3)
          $graphics.DrawString($noteText, $regularFont, $black, (New-Object System.Drawing.RectangleF(0, $y, $width, $noteHeight)), $left)
          $y += $noteHeight
        }
        $y += 8
      }

      $orderNote = [string]$Payload.note
      if ($orderNote) {
        $graphics.DrawLine([System.Drawing.Pens]::Black, 0, $y, $width, $y)
        $y += 10
        $graphics.DrawString("NOTE: $orderNote", $boldFont, $black, (New-Object System.Drawing.RectangleF(0, $y, $width, 70)), $left)
        $y += 72
      }

      $graphics.DrawLine([System.Drawing.Pens]::Black, 0, $y, $width, $y)
      $eventArgs.HasMorePages = $false
    }
    finally {
      $regularFont.Dispose()
      $smallFont.Dispose()
      $boldFont.Dispose()
      $ticketFont.Dispose()
      $center.Dispose()
      $left.Dispose()
    }
  }

  $document.add_PrintPage($printHandler)
  try {
    $document.Print()
    Start-Sleep -Milliseconds 250
    [MglRawPrinter]::Cut($printerName)
  }
  finally {
    $document.remove_PrintPage($printHandler)
    $document.Dispose()
  }
}

$listener = [System.Net.Sockets.TcpListener]::new(
  [System.Net.IPAddress]::Loopback,
  $Port
)

try {
  $listener.Start()
  while ($true) {
    $client = $listener.AcceptTcpClient()
    $origin = ""
    try {
      $stream = $client.GetStream()
      $reader = New-Object System.IO.StreamReader(
        $stream,
        [System.Text.Encoding]::ASCII,
        $false,
        1024,
        $true
      )
      $requestLine = $reader.ReadLine()
      if (-not $requestLine) {
        continue
      }

      $headers = @{}
      while ($true) {
        $line = $reader.ReadLine()
        if ([string]::IsNullOrEmpty($line)) { break }
        $separator = $line.IndexOf(":")
        if ($separator -gt 0) {
          $headers[$line.Substring(0, $separator).Trim().ToLowerInvariant()] =
            $line.Substring($separator + 1).Trim()
        }
      }

      $parts = $requestLine.Split(" ")
      $method = if ($parts.Length -gt 0) { $parts[0].ToUpperInvariant() } else { "" }
      $path = if ($parts.Length -gt 1) { $parts[1].Split("?")[0] } else { "" }
      $origin = [string]$headers["origin"]
      $allowedOrigin = Get-AllowedOrigin $origin

      if ($allowedOrigin -eq "null") {
        Write-HttpResponse $stream 403 "Forbidden" '{"ok":false,"message":"Origin is not allowed"}' $origin
      }
      elseif ($method -eq "OPTIONS") {
        Write-HttpResponse $stream 204 "No Content" "" $origin
      }
      elseif ($method -eq "GET" -and $path -eq "/health") {
        $settings = New-Object System.Drawing.Printing.PrinterSettings
        $printerName = [string]$settings.PrinterName
        Write-JsonResponse $stream 200 "OK" @{
          ok = $true
          printer = $printerName
        } $origin
      }
      elseif ($method -eq "GET" -and $path -eq "/printers") {
        Write-JsonResponse $stream 200 "OK" (Get-PrinterInventory) $origin
      }
      elseif ($method -eq "POST" -and $path -eq "/cut") {
        $settings = New-Object System.Drawing.Printing.PrinterSettings
        if (-not $settings.IsValid -or -not $settings.PrinterName) {
          throw "Windows default printer is not configured"
        }
        [MglRawPrinter]::Cut([string]$settings.PrinterName)
        Write-JsonResponse $stream 200 "OK" @{ ok = $true } $origin
      }
      elseif ($method -eq "POST" -and $path -eq "/kitchen/print") {
        $body = Read-RequestBody $reader $headers
        if (-not $body) { throw "Kitchen print payload is empty" }
        $payload = $body | ConvertFrom-Json
        Print-KitchenTicket $payload
        Write-JsonResponse $stream 200 "OK" @{ ok = $true } $origin
      }
      else {
        Write-HttpResponse $stream 404 "Not Found" '{"ok":false,"message":"Not found"}' $origin
      }
    }
    catch {
      try {
        Write-JsonResponse $stream 500 "Internal Server Error" @{
          ok = $false
          message = [string]$_.Exception.Message
        } $origin
      }
      catch {}
    }
    finally {
      $client.Close()
    }
  }
}
finally {
  $listener.Stop()
  $mutex.ReleaseMutex()
  $mutex.Dispose()
}
