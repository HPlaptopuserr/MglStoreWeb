type ThermalPrintDocumentOptions = {
  bodyHtml: string;
  extraCss?: string;
  paperWidthMm?: number;
};

const SCREEN_DPI = 96;
const MILLIMETERS_PER_INCH = 25.4;
const MINIMUM_RECEIPT_HEIGHT_MM = 40;
const RECEIPT_BOTTOM_FEED_MM = 4;

export function printThermalDocument({
  bodyHtml,
  extraCss = "",
  paperWidthMm = 80,
}: ThermalPrintDocumentOptions): boolean {
  if (typeof window === "undefined") return false;

  const popup = window.open("", "_blank", "width=420,height=760");
  if (!popup) return false;

  popup.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title></title>
        <style id="thermal-page-size"></style>
        <style>
          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; width: ${paperWidthMm}mm; }
          body {
            color: #111;
            font-family: ui-monospace, "Cascadia Mono", "Courier New", monospace;
            padding: 3mm;
            overflow: hidden;
          }
          pre {
            margin: 0;
            white-space: pre-wrap;
            overflow-wrap: anywhere;
            font: inherit;
            font-size: 10pt;
            line-height: 1.25;
          }
          ${extraCss}
          @media print {
            html, body { min-height: 0 !important; height: auto !important; }
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>${bodyHtml}</body>
    </html>
  `);
  popup.document.close();

  popup.onload = () => {
    popup.requestAnimationFrame(() => {
      const contentHeightPx = Math.max(
        popup.document.body.scrollHeight,
        popup.document.documentElement.scrollHeight,
      );
      const contentHeightMm = Math.max(
        MINIMUM_RECEIPT_HEIGHT_MM,
        Math.ceil((contentHeightPx * MILLIMETERS_PER_INCH) / SCREEN_DPI + RECEIPT_BOTTOM_FEED_MM),
      );
      const pageStyle = popup.document.getElementById("thermal-page-size");
      if (pageStyle) {
        pageStyle.textContent = `@page { size: ${paperWidthMm}mm ${contentHeightMm}mm; margin: 0; }`;
      }

      popup.focus();
      popup.print();
      window.setTimeout(() => popup.close(), 500);
    });
  };

  return true;
}
