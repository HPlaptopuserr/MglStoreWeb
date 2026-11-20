import {
  readReceiptPageMode,
  readReceiptPaperWidth,
  type ReceiptPageMode,
  type ReceiptPaperWidth,
} from "./receipt-paper";

type ThermalPrintDocumentOptions = {
  bodyHtml: string;
  extraCss?: string;
  paperWidthMm?: ReceiptPaperWidth;
  pageMode?: ReceiptPageMode;
  compact?: boolean;
  target?: "iframe" | "window";
};

const SCREEN_DPI = 96;
const MILLIMETERS_PER_INCH = 25.4;
const MINIMUM_RECEIPT_HEIGHT_MM = 40;
const RECEIPT_BOTTOM_FEED_MM = 4;

export function printThermalDocument({
  bodyHtml,
  extraCss = "",
  paperWidthMm = readReceiptPaperWidth(),
  pageMode = readReceiptPageMode(),
  target = "iframe",
  compact = false,
}: ThermalPrintDocumentOptions): boolean {
  if (typeof window === "undefined") return false;

  // Automatic checkout prints cannot rely on popup user activation.
  // Manual prints use a visible, retained window for driver compatibility.
  const frame = target === "iframe" ? document.createElement("iframe") : null;
  if (frame) {
    frame.title = "Баримт хэвлэх";
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = `position:fixed;left:-10000px;top:0;width:${paperWidthMm}mm;height:760px;border:0;`;
    document.body.appendChild(frame);
  }
  const popup = frame
    ? frame.contentWindow
    : window.open("", "_blank", "width=480,height=800");
  if (!popup) {
    frame?.remove();
    return false;
  }
  let started = false;
  const cleanup = () => frame?.remove();
  const startPrint = () => {
    if (started) return;
    started = true;
    void popup.document.fonts.ready.then(() => {
      popup.requestAnimationFrame(() => {
        popup.requestAnimationFrame(() => {
          if (popup.closed) {
            cleanup();
            return;
          }
          const fitPage = () => {
            // Chromium fires beforeprint before switching to print media.
            // Measure with our inline print rules active, then restore screen media.
            const printRules = Array.from(popup.document.styleSheets ?? [])
              .flatMap((sheet) => Array.from(sheet.cssRules))
              .filter(
                (rule): rule is CSSMediaRule =>
                  rule.type === 4 &&
                  (rule as CSSMediaRule).media.mediaText === "print",
              );
            printRules.forEach((rule) => {
              rule.media.mediaText = "all";
            });
            try {
              const table =
                popup.document.querySelector?.<HTMLTableElement>(
                  ".receipt table",
                );
              if (table?.parentElement) {
                table.classList.remove("receipt-stacked-table");
                if (
                  table.getBoundingClientRect().width >
                  table.parentElement.getBoundingClientRect().width + 0.5
                ) {
                  table.classList.add("receipt-stacked-table");
                }
              }
              const height = popup.document.body.getBoundingClientRect().height;
              const mm = Math.max(
                compact ? 0 : MINIMUM_RECEIPT_HEIGHT_MM,
                Math.ceil(
                  (height * MILLIMETERS_PER_INCH) / SCREEN_DPI +
                    (compact ? 1 : RECEIPT_BOTTOM_FEED_MM),
                ),
              );
              const style = popup.document.getElementById("thermal-page-size");
              if (style)
                style.textContent =
                  pageMode === "printer"
                    ? "@page { size: auto; margin: 0; }"
                    : `@page { size: ${paperWidthMm}mm ${mm}mm; margin: 0; }`;
            } finally {
              printRules.forEach((rule) => {
                rule.media.mediaText = "print";
              });
            }
          };
          fitPage();
          // Print-media rules can change line wrapping.
          // Refit the full receipt, including QR, before the browser paginates it.
          popup.addEventListener("beforeprint", fitPage);
          if (frame)
            popup.addEventListener("afterprint", cleanup, { once: true });
          popup.document
            .getElementById("thermal-print-again")
            ?.addEventListener("click", () => popup.print());
          try {
            popup.focus();
            popup.print();
          } catch {
            cleanup();
          }
          // Keep manual documents alive for system-dialog printing and retries.
        });
      });
    });
  };
  popup.document.open();
  if (frame) frame.onload = startPrint;
  else popup.addEventListener("load", startPrint, { once: true });
  popup.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>MGL - Баримт хэвлэх</title>
        <style id="thermal-page-size"></style>
        <style>
          * { box-sizing: border-box; }
          html { margin: 0; padding: 0; }
          body { margin: 0; width: 100%; max-width: ${paperWidthMm}mm; }
          body {
            color: #111;
            font-family: ui-monospace, "Cascadia Mono", "Courier New", monospace;
            padding: ${compact ? "1mm 3mm" : "2mm 5mm"};
          }
          pre {
            margin: 0;
            white-space: pre-wrap;
            overflow-wrap: anywhere;
            font: inherit;
            font-size: 10pt;
            line-height: 1.25;
          }
          .thermal-print-controls { position: fixed; top: 8px; right: 8px; max-width: 180px; padding: 8px; background: #fff; border: 1px solid #aaa; font: 12px Arial, sans-serif; }
          .thermal-print-controls button { padding: 8px; cursor: pointer; }
          ${extraCss}
          @media print {
            .thermal-print-controls { display: none !important; }
            html, body { min-height: 0 !important; height: auto !important; }
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body data-thermal-page-mode="${pageMode}">${bodyHtml}${target === "window" ? '<aside class="thermal-print-controls"><button id="thermal-print-again" type="button">Дахин хэвлэх</button><p>Энэ цонхыг хэвлэлт дуусах хүртэл нээлттэй байлгана уу.</p></aside>' : ""}</body>
    </html>
  `);
  popup.document.close();

  if (popup.document.readyState === "complete") startPrint();
  return true;
}
