"use client";

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { QRCodeSVG } from "qrcode.react";
import type { PosReceipt } from "../types/receipt.types";
import { receiptPrintLayout, receiptPrintCss } from "./receipt-print-layout";
import { printThermalDocument } from "./print-thermal-document";
import { readReceiptPaperWidth, type ReceiptPaperWidth } from "./receipt-paper";

const renderEbarimtQrMarkup = (value?: string | null) => {
  const qrValue = String(value || "").trim();
  if (typeof document === "undefined" || !qrValue) return "";

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "-9999px";
  document.body.appendChild(container);

  const root = createRoot(container);
  try {
    flushSync(() => {
      root.render(<QRCodeSVG value={qrValue} size={160} level="M" includeMargin />);
    });
    return container.innerHTML;
  } finally {
    root.unmount();
    container.remove();
  }
};

/** Shared by checkout completion and receipt-history reprints. */
export function printReceipt(
  receipt: PosReceipt,
  options: { demo?: boolean; paperWidthMm?: ReceiptPaperWidth } = {},
) {
  if (typeof window === "undefined") return;
  const qrData = receipt.ebarimt?.status === "SUCCESS" ? receipt.ebarimt.qrData : null;
  const qrMarkup = renderEbarimtQrMarkup(qrData);
  const qrTitle = options.demo
    ? '<p class="ebarimt-qr-title">ТЕСТ QR — eBarimt-д бүртгэгдэхгүй</p>'
    : "";
  const paperWidthMm = options.paperWidthMm ?? readReceiptPaperWidth();
  printThermalDocument({
    bodyHtml: `${options.demo ? '<p style="text-align:center;font-weight:bold">ТЕСТ БАРИМТ — eBarimt-д бүртгэгдэхгүй</p>' : ""}${receiptPrintLayout(receipt)}${qrMarkup ? `<div class="ebarimt-qr">${qrTitle}${qrMarkup}</div>` : ""}`,
    extraCss: `${receiptPrintCss}
      .ebarimt-qr { margin-top: 1.5mm; text-align: center; }
      .ebarimt-qr svg { width: 42mm; height: 42mm; }
      .ebarimt-qr-title { margin: 0 0 2mm; font-family: sans-serif; font-size: 9pt; font-weight: 700; }
    `,
    paperWidthMm,
  });
}
