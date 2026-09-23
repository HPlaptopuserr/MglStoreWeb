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

$listener = [System.Net.Sockets.TcpListener]::new(
  [System.Net.IPAddress]::Loopback,
  $Port
)

try {
  $listener.Start()
  while ($true) {
    $client = $listener.AcceptTcpClient()
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
        $safeName = $printerName.Replace("\", "\\").Replace('"', '\"')
        Write-HttpResponse $stream 200 "OK" "{`"ok`":true,`"printer`":`"$safeName`"}" $origin
      }
      elseif ($method -eq "POST" -and $path -eq "/cut") {
        $settings = New-Object System.Drawing.Printing.PrinterSettings
        if (-not $settings.IsValid -or -not $settings.PrinterName) {
          throw "Windows default printer is not configured"
        }
        [MglRawPrinter]::Cut([string]$settings.PrinterName)
        Write-HttpResponse $stream 200 "OK" '{"ok":true}' $origin
      }
      else {
        Write-HttpResponse $stream 404 "Not Found" '{"ok":false,"message":"Not found"}' $origin
      }
    }
    catch {
      try {
        Write-HttpResponse $stream 500 "Internal Server Error" '{"ok":false,"message":"Printer cut failed"}' ""
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
