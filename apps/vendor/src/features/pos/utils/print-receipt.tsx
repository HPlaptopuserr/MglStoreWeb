"use client";

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { QRCodeSVG } from "qrcode.react";
import type { PosReceipt } from "../types/receipt.types";
import {
  receiptPrintLayout,
  receiptPrintCss,
  receiptPrintFooter,
} from "./receipt-print-layout";
import { printThermalDocument } from "./print-thermal-document";
import {
  readReceiptCompact,
  readReceiptPaperWidth,
  type ReceiptPaperWidth,
} from "./receipt-paper";

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
      root.render(
        <QRCodeSVG value={qrValue} size={160} level="M" includeMargin />,
      );
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
  options: {
    demo?: boolean;
    paperWidthMm?: ReceiptPaperWidth;
    target?: "iframe" | "window";
  } = {},
) {
  if (typeof window === "undefined") return false;
  const qrData =
    receipt.ebarimt?.status === "SUCCESS" ? receipt.ebarimt.qrData : null;
  const qrMarkup = renderEbarimtQrMarkup(qrData);
  const qrTitle = options.demo
    ? '<p class="ebarimt-qr-title">ТЕСТ QR — eBarimt-д бүртгэгдэхгүй</p>'
    : "";
  const paperWidthMm = options.paperWidthMm ?? readReceiptPaperWidth();
  const compact = readReceiptCompact();
  return printThermalDocument({
    bodyHtml: `${options.demo ? '<p style="text-align:center;font-weight:bold">ТЕСТ БАРИМТ — eBarimt-д бүртгэгдэхгүй</p>' : ""}${receiptPrintLayout(receipt)}${qrMarkup ? `<div class="ebarimt-qr">${qrTitle}${qrMarkup}</div>` : ""}${receiptPrintFooter}`,
    extraCss: `${receiptPrintCss}
      ${
        compact
          ? `.receipt header { margin-bottom: 1mm; padding: 0 0 .7mm; }
        .receipt-thanks { margin-top: 1mm; padding: 1mm 0 0; }
        .receipt-thanks strong { font-size: 9pt; }
        .receipt-thanks p { margin-top: .5mm; font-size: 7pt; }`
          : ""
      }
      .ebarimt-qr { margin-top: 1.5mm; text-align: center; }
      .ebarimt-qr svg { width: 42mm; max-width: 100%; height: auto; }
      .ebarimt-qr-title { margin: 0 0 2mm; font-family: sans-serif; font-size: 9pt; font-weight: 700; }
    `,
    paperWidthMm,
    compact,
    target: options.target,
  });
}
