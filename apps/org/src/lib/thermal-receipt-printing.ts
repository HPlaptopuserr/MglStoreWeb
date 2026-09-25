import type { PosReceipt } from "@mgl/types";

export interface ThermalReceiptPrintContext {
  organizationName: string;
  registerName: string;
  orderLabel: string;
  ticketNo: string;
  qrMarkup: string;
  splitOrderAndEbarimt: boolean;
}

const moneyFormatter = new Intl.NumberFormat("mn-MN", {
  maximumFractionDigits: 0,
});

export const formatReceiptMoney = (value: number) =>
  `${moneyFormatter.format(value)}₮`;

const escapePrintHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatPrintDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("mn-MN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

type ReceiptPaperWidthMm = 58 | 80;

const DEFAULT_RECEIPT_PAPER_WIDTH_MM: ReceiptPaperWidthMm = 80;
const RECEIPT_SIDE_MARGIN_MM = 6;
const RECEIPT_QR_SIZE_MM = 52;
const RECEIPT_MINIMUM_HEIGHT_MM = 40;
const RECEIPT_MAXIMUM_HEIGHT_MM = 1_000;
const RECEIPT_BOTTOM_FEED_MM = 10;
const CSS_SCREEN_DPI = 96;
const MILLIMETERS_PER_INCH = 25.4;
const RECEIPT_JOB_GAP_MS = 1_200;
const LOCAL_PRINTER_BRIDGE_URL = "http://127.0.0.1:17358";
let detectedReceiptPaperWidthPromise: Promise<ReceiptPaperWidthMm> | null =
  null;

function isLocalPrinterCutEnabled() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("printerCut") === "1";
}

function receiptPaperWidthFromPrinterName(
  printerName: string,
): ReceiptPaperWidthMm | null {
  if (/(?:^|\D)58(?:\D|$)/i.test(printerName)) return 58;
  if (/(?:^|\D)80(?:\D|$)/i.test(printerName)) return 80;
  return null;
}

function requestedReceiptPaperWidth(): ReceiptPaperWidthMm | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const value = params.get("paperWidth") || params.get("receiptPaperWidth");
  return value === "58" ? 58 : value === "80" ? 80 : null;
}

async function resolveReceiptPaperWidth(): Promise<ReceiptPaperWidthMm> {
  const requestedWidth = requestedReceiptPaperWidth();
  if (requestedWidth) return requestedWidth;
  if (!isLocalPrinterCutEnabled()) return DEFAULT_RECEIPT_PAPER_WIDTH_MM;

  detectedReceiptPaperWidthPromise ??= (async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 1_500);
    try {
      const response = await fetch(`${LOCAL_PRINTER_BRIDGE_URL}/health`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) return DEFAULT_RECEIPT_PAPER_WIDTH_MM;
      const payload = (await response.json()) as { printer?: unknown };
      return (
        receiptPaperWidthFromPrinterName(String(payload.printer || "")) ||
        DEFAULT_RECEIPT_PAPER_WIDTH_MM
      );
    } catch {
      return DEFAULT_RECEIPT_PAPER_WIDTH_MM;
    } finally {
      window.clearTimeout(timeout);
    }
  })();

  return detectedReceiptPaperWidthPromise;
}

async function requestLocalPaperCut() {
  if (!isLocalPrinterCutEnabled()) return;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 3_000);
  try {
    await fetch(`${LOCAL_PRINTER_BRIDGE_URL}/cut`, {
      method: "POST",
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    console.warn("Local receipt cutter is unavailable", error);
  } finally {
    window.clearTimeout(timeout);
  }
}

function printThermalReceiptDocument(
  title: string,
  bodyHtml: string,
  delayMs = 0,
) {
  if (typeof document === "undefined") return false;

  const queuePrint = async () => {
    const paperWidthMm = await resolveReceiptPaperWidth();
    const contentWidthMm = paperWidthMm - RECEIPT_SIDE_MARGIN_MM * 2;
    const qrSizeMm = Math.min(RECEIPT_QR_SIZE_MM, contentWidthMm);
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";

    const cleanup = () => window.setTimeout(() => iframe.remove(), 5_000);
    iframe.onload = () => {
      const printWindow = iframe.contentWindow;
      if (!printWindow) {
        cleanup();
        return;
      }
      printWindow.requestAnimationFrame(() => {
        printWindow.requestAnimationFrame(() => {
          const printDocument = printWindow.document;
          const receiptRoot = printDocument.getElementById("receipt-root");
          const contentHeightPx = receiptRoot
            ? Math.max(
                receiptRoot.scrollHeight,
                Math.ceil(receiptRoot.getBoundingClientRect().height),
              )
            : printDocument.body.scrollHeight;
          const measuredHeightMm = Math.ceil(
            (contentHeightPx * MILLIMETERS_PER_INCH) / CSS_SCREEN_DPI +
              RECEIPT_BOTTOM_FEED_MM,
          );
          const contentHeightMm = Math.min(
            RECEIPT_MAXIMUM_HEIGHT_MM,
            Math.max(RECEIPT_MINIMUM_HEIGHT_MM, measuredHeightMm),
          );
          const pageStyle = printDocument.getElementById("receipt-page-size");
          if (pageStyle) {
            pageStyle.textContent = `@page { size: ${paperWidthMm}mm ${contentHeightMm}mm; margin: 0; }`;
          }

          window.setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            window.setTimeout(() => void requestLocalPaperCut(), 250);
            cleanup();
          }, 150);
        });
      });
    };

    iframe.srcdoc = `<!doctype html>
      <html lang="mn">
        <head>
          <meta charset="utf-8" />
          <title>${escapePrintHtml(title)}</title>
          <style id="receipt-page-size">@page { size: ${paperWidthMm}mm 100mm; margin: 0; }</style>
          <style>
            * { box-sizing: border-box; }
            html, body { width: ${paperWidthMm}mm; min-height: 0; height: auto; }
            body { margin: 0; overflow-wrap: anywhere; color: #000; background: #fff; font-family: Arial, sans-serif; font-size: 10px; line-height: 1.35; }
            #receipt-root { width: ${contentWidthMm}mm; margin: 0 auto; }
            h1 { margin: 0; text-align: center; font-size: 17px; }
            .center { text-align: center; }
            .muted { color: #333; font-size: 10px; }
            .receipt-kind { margin-top: 6px; text-align: center; font-size: 12px; font-weight: 800; }
            .demo { margin: 6px 0; padding: 5px; border: 2px solid #000; text-align: center; font-size: 13px; font-weight: 800; }
            .order-number { margin-top: 8px; padding: 8px 4px; border: 2px solid #000; text-align: center; }
            .order-number strong { display: block; font-size: 23px; line-height: 1.1; letter-spacing: .5px; }
            .meta, .ebarimt { margin-top: 8px; padding: 7px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; }
            .row, .total { display: flex; width: 100%; justify-content: space-between; gap: 5px; }
            .row > span:first-child, .total > span:first-child { flex: 0 0 auto; }
            .row > span:last-child, .total > span:last-child { min-width: 0; text-align: right; overflow-wrap: anywhere; word-break: break-all; }
            table { width: 100%; table-layout: fixed; margin-top: 5px; border-collapse: collapse; }
            td { padding: 5px 0; vertical-align: top; border-bottom: 1px dotted #777; }
            .amount { width: 30%; text-align: right; white-space: nowrap; font-weight: 700; }
            .totals { margin-top: 7px; }
            .total { margin-top: 3px; }
            .grand { margin-top: 6px; padding-top: 6px; border-top: 2px solid #000; font-size: 15px; font-weight: 800; }
            .qr { margin-top: 8px; text-align: center; break-inside: avoid; page-break-inside: avoid; }
            .qr svg { display: block; width: ${qrSizeMm}mm; height: ${qrSizeMm}mm; margin: 0 auto; }
            .qr-fallback { overflow-wrap: anywhere; font-family: monospace; font-size: 8px; }
            .footer { margin-top: 10px; text-align: center; font-weight: 700; }
          </style>
        </head>
        <body><main id="receipt-root">${bodyHtml}</main></body>
      </html>`;

    document.body.appendChild(iframe);
  };

  if (delayMs > 0) window.setTimeout(() => void queuePrint(), delayMs);
  else void queuePrint();
  return true;
}

export function printThermalPosReceipt(
  receipt: PosReceipt,
  context: ThermalReceiptPrintContext,
) {
  if (typeof document === "undefined") return false;

  const ebarimt =
    receipt.ebarimt?.status === "SUCCESS" ? receipt.ebarimt : null;
  const isDemo = ebarimt?.billId?.startsWith("TEST-") === true;
  const paymentLabel =
    String(receipt.paymentMethod).toUpperCase() === "CARD"
      ? "Карт"
      : String(receipt.paymentMethod).toUpperCase() === "CASH"
        ? "Тест төлбөр"
        : "QR";
  const lineRows = receipt.lines
    .map(
      (line) => `
        <tr>
          <td>
            <strong>${escapePrintHtml(line.name)}</strong>
            <div class="muted">${line.qty} × ${escapePrintHtml(formatReceiptMoney(line.unitPrice))}</div>
          </td>
          <td class="amount">${escapePrintHtml(formatReceiptMoney(line.lineTotal))}</td>
        </tr>`,
    )
    .join("");

  const headerHtml = `
    <h1>${escapePrintHtml(context.organizationName)}</h1>
    <div class="center muted">${escapePrintHtml(receipt.branchName)} · ${escapePrintHtml(context.registerName)}</div>`;
  const orderNumberHtml = `
    <div class="order-number">
      <strong>Захиалга №${escapePrintHtml(context.ticketNo)}</strong>
    </div>`;
  const metaHtml = `
    <div class="meta">
      <div class="row"><span>Баримт:</span><span>${escapePrintHtml(receipt.receiptNo)}</span></div>
      <div class="row"><span>Огноо:</span><span>${escapePrintHtml(formatPrintDate(receipt.createdAt))}</span></div>
      <div class="row"><span>Төрөл:</span><span>${escapePrintHtml(context.orderLabel)}</span></div>
      <div class="row"><span>Төлбөр:</span><span>${paymentLabel}</span></div>
    </div>`;
  const itemsAndTotalsHtml = `
    <table><tbody>${lineRows}</tbody></table>
    <div class="totals">
      <div class="total"><span>Дүн:</span><span>${escapePrintHtml(formatReceiptMoney(receipt.subTotal))}</span></div>
      ${receipt.discountTotal > 0 ? `<div class="total"><span>Хөнгөлөлт:</span><span>-${escapePrintHtml(formatReceiptMoney(receipt.discountTotal))}</span></div>` : ""}
      ${receipt.taxTotal > 0 ? `<div class="total"><span>Үүнд НӨАТ:</span><span>${escapePrintHtml(formatReceiptMoney(receipt.taxTotal))}</span></div>` : ""}
      <div class="total grand"><span>НИЙТ:</span><span>${escapePrintHtml(formatReceiptMoney(receipt.grandTotal))}</span></div>
    </div>`;

  const ebarimtHtml = ebarimt
    ? `
      <div class="ebarimt">
        <div class="center"><strong>${isDemo ? "ТЕСТ QR · ТАТВАРЫН БАРИМТ БИШ" : ebarimt.receiptType === "B2B" ? "БАЙГУУЛЛАГЫН EBARIMT" : "ХУВЬ ХҮНИЙ EBARIMT"}</strong></div>
        ${ebarimt.customerRegNo ? `<div class="row"><span>Регистр:</span><span>${escapePrintHtml(ebarimt.customerRegNo)}</span></div>` : ""}
        ${ebarimt.billId ? `<div class="row"><span>ДДТД:</span><span>${escapePrintHtml(ebarimt.billId)}</span></div>` : ""}
        ${ebarimt.lottery ? `<div class="row"><span>Сугалаа:</span><span>${escapePrintHtml(ebarimt.lottery)}</span></div>` : ""}
        <div class="qr">${context.qrMarkup || `<div class="qr-fallback">${escapePrintHtml(ebarimt.qrData)}</div>`}</div>
      </div>`
    : `<div class="ebarimt center">
        <strong>ЗАХИАЛГЫН БАРИМТ</strong>
        <div class="muted">Ebarimt биш</div>
      </div>`;

  if (!context.splitOrderAndEbarimt) {
    return printThermalReceiptDocument(
      receipt.receiptNo,
      `${headerHtml}
       ${isDemo ? '<div class="demo">ТЕСТИЙН БАРИМТ</div>' : ""}
       ${orderNumberHtml}
       ${metaHtml}
       ${itemsAndTotalsHtml}
       ${ebarimtHtml}
       <div class="footer">Үйлчлүүлсэнд баярлалаа</div>`,
    );
  }

  const orderReceiptQueued = printThermalReceiptDocument(
    `${receipt.receiptNo}-order`,
    `${headerHtml}
     <div class="receipt-kind">ЗАХИАЛГЫН БАРИМТ</div>
     ${orderNumberHtml}
     ${metaHtml}
     ${itemsAndTotalsHtml}
     <div class="footer">Захиалгын дугаараа хадгална уу</div>`,
  );

  if (ebarimt) {
    printThermalReceiptDocument(
      `${receipt.receiptNo}-ebarimt`,
      `${headerHtml}
       ${isDemo ? '<div class="demo">ТЕСТИЙН БАРИМТ</div>' : ""}
       ${orderNumberHtml}
       ${metaHtml}
       ${itemsAndTotalsHtml}
       ${ebarimtHtml}
       <div class="footer">Үйлчлүүлсэнд баярлалаа</div>`,
      RECEIPT_JOB_GAP_MS,
    );
  }

  return orderReceiptQueued;
}
