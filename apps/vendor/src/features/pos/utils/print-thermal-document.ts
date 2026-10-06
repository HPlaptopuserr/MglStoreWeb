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
  paperWidthMm = 58,
}: ThermalPrintDocumentOptions): boolean {
  if (typeof window === "undefined") return false;

  // Async payment completion may no longer have browser user activation.
  // A same-origin iframe does not depend on permission to open popups.
  const frame = document.createElement("iframe");
  frame.title = "Баримт хэвлэх";
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;left:-10000px;top:0;width:420px;height:760px;border:0;";
  document.body.appendChild(frame);
  const popup = frame.contentWindow;
  if (!popup) { frame.remove(); return false; }
  let started = false;
  const cleanup = () => frame.remove();
  const startPrint = () => {
    if (started) return;
    started = true;
    void popup.document.fonts.ready.then(() => {
      popup.requestAnimationFrame(() => {
        const height = popup.document.body.getBoundingClientRect().height;
        const mm = Math.max(MINIMUM_RECEIPT_HEIGHT_MM,
          Math.ceil(height * MILLIMETERS_PER_INCH / SCREEN_DPI + RECEIPT_BOTTOM_FEED_MM));
        const style = popup.document.getElementById("thermal-page-size");
        if (style) style.textContent = `@page { size: ${paperWidthMm}mm ${mm}mm; margin: 0; }`;
        popup.addEventListener("afterprint", cleanup, { once: true });
        try { popup.focus(); popup.print(); } catch { cleanup(); }
        // Do not close after 500ms: some devices open the print dialog asynchronously.
      });
    });
  };
  frame.onload = startPrint;
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
            padding: 3mm 5mm;
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

  if (popup.document.readyState === "complete") startPrint();
  return true;
}
