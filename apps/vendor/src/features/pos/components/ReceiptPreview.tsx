"use client";

import { useRef, useState } from "react";
import { Loader2, Printer, RotateCcw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { PosReceipt } from "../types/receipt.types";
import { voidPushEcr } from "../api/payments";
import { voidSale } from "../api/void-sale";
import { formatReceipt } from "../utils/format-receipt";

type Props = {
  receipt: PosReceipt | null;
  onVoided?: (message: string) => void;
  className?: string;
};

export function ReceiptPreview({ receipt, onVoided, className = "" }: Props) {
  const [terminalVoiding, setTerminalVoiding] = useState(false);
  const [terminalVoidResult, setTerminalVoidResult] = useState<{ succeed: boolean; message?: string } | null>(null);
  const [saleVoiding, setSaleVoiding] = useState(false);
  const [saleVoidResult, setSaleVoidResult] = useState<{ succeed: boolean; message?: string } | null>(null);
  const ebarimtQrRef = useRef<HTMLDivElement>(null);

  if (!receipt) return null;

  const cardLine = receipt.paymentBreakdown?.find(
    (payment) => payment.method === "CARD" && payment.traceno && payment.terminalId,
  );
  const isVoided = receipt.status === "VOIDED";
  const ebarimtQrData =
    receipt.ebarimt?.status === "SUCCESS" && receipt.ebarimt.qrData
      ? receipt.ebarimt.qrData
      : "";

  const handlePrint = () => {
    const popup = window.open("", "_blank", "width=420,height=760");
    if (!popup) return;

    const content = formatReceipt(receipt)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
    const qrMarkup = ebarimtQrRef.current?.innerHTML || "";

    popup.document.write(`
      <html>
        <head>
          <title>Receipt ${receipt.receiptNo}</title>
          <style>
            body { font-family: monospace; margin: 0; padding: 12px; color: #111; }
            pre { white-space: pre-wrap; word-break: break-word; font-size: 12px; line-height: 1.45; }
            .ebarimt-qr { margin-top: 10px; text-align: center; }
            .ebarimt-qr svg { width: 160px; height: 160px; }
            .ebarimt-qr-title { margin: 0 0 6px; font-family: sans-serif; font-size: 12px; font-weight: 700; }
          </style>
        </head>
        <body>
          <pre>${content}</pre>
          ${qrMarkup ? `<div class="ebarimt-qr"><p class="ebarimt-qr-title">eBarimt QR</p>${qrMarkup}</div>` : ""}
          <script>
            window.onload = function () {
              window.print();
              setTimeout(function () { window.close(); }, 350);
            }
          </script>
        </body>
      </html>
    `);
    popup.document.close();
  };

  const handleTerminalVoid = async () => {
    if (!cardLine?.traceno || !cardLine?.terminalId) return;
    if (!confirm(`Картын terminal буцаалт хийх үү?\nReceipt: ${receipt.receiptNo}`)) return;

    setTerminalVoiding(true);
    setTerminalVoidResult(null);
    try {
      const result = await voidPushEcr({
        terminalId: cardLine.terminalId,
        traceno: cardLine.traceno,
      });
      setTerminalVoidResult(result);
    } catch (error: any) {
      setTerminalVoidResult({
        succeed: false,
        message: error?.message || "Terminal буцаалт хийхэд алдаа гарлаа",
      });
    } finally {
      setTerminalVoiding(false);
    }
  };

  const handleSaleVoid = async () => {
    const reason = window.prompt(
      `Буцаалт хийх шалтгаанаа оруулна уу.\nReceipt: ${receipt.receiptNo}`,
      cardLine ? "Картын буцаалт хийсэн" : "Бараа буцаалт",
    );
    if (!reason?.trim()) return;

    const paymentWarning =
      receipt.paymentMethod === "CARD"
        ? "Картын мөнгийг terminal дээр буцаасан эсэхээ шалгана уу. "
        : receipt.paymentMethod === "QPAY" || receipt.paymentMethod === "QR"
          ? "QPay/QR мөнгийг гараар эсвэл QPay талд буцаасан эсэхээ шалгана уу. "
          : "Бэлэн мөнгийг хэрэглэгчид буцааж өгсөн эсэхээ шалгана уу. ";

    if (!confirm(`${paymentWarning}Буцаалт бүртгэгдэж, барааны нөөц буцаж нэмэгдэнэ. Үргэлжлүүлэх үү?`)) {
      return;
    }

    setSaleVoiding(true);
    setSaleVoidResult(null);
    try {
      const result = await voidSale(receipt.id, reason.trim());
      const message = result.message || "Буцаалт амжилттай хийгдлээ";
      setSaleVoidResult({ succeed: true, message });
      onVoided?.(message);
    } catch (error: any) {
      setSaleVoidResult({
        succeed: false,
        message: error?.message || "Буцаалт хийхэд алдаа гарлаа",
      });
    } finally {
      setSaleVoiding(false);
    }
  };

  return (
    <section className={`flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-3 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Receipt Preview</h3>
            {isVoided && (
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                Буцаагдсан
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">#{receipt.receiptNo}</p>
          {receipt.ebarimt?.status && (
            <p className={`mt-1 text-[11px] font-semibold ${
              receipt.ebarimt.status === "SUCCESS" ? "text-emerald-600" : "text-amber-600"
            }`}>
              eBarimt: {receipt.ebarimt.status === "SUCCESS"
                ? `${receipt.ebarimt.lottery || "амжилттай"}`
                : receipt.ebarimt.error || "үүсээгүй"}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            <Printer className="h-3.5 w-3.5" />
            Хэвлэх
          </button>
          {!isVoided && cardLine && !terminalVoidResult?.succeed && (
            <button
              type="button"
              onClick={handleTerminalVoid}
              disabled={terminalVoiding || saleVoiding}
              className="flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50"
            >
              {terminalVoiding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              Terminal буцаалт
            </button>
          )}
          {!isVoided && !saleVoidResult?.succeed && (
            <button
              type="button"
              onClick={handleSaleVoid}
              disabled={saleVoiding || terminalVoiding}
              className="flex items-center gap-1.5 rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-50"
            >
              {saleVoiding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              Буцаалт хийх
            </button>
          )}
        </div>
      </div>

      {terminalVoidResult && (
        <div className={`mt-2 rounded-lg px-3 py-2 text-xs font-medium ${terminalVoidResult.succeed ? "bg-green-50 text-green-700" : "bg-rose-50 text-rose-700"}`}>
          {terminalVoidResult.succeed
            ? "Terminal буцаалт амжилттай боллоо"
            : terminalVoidResult.message || "Terminal буцаалт амжилтгүй боллоо"}
        </div>
      )}

      {saleVoidResult && (
        <div className={`mt-2 rounded-lg px-3 py-2 text-xs font-medium ${saleVoidResult.succeed ? "bg-green-50 text-green-700" : "bg-rose-50 text-rose-700"}`}>
          {saleVoidResult.succeed
            ? saleVoidResult.message || "Системийн буцаалт амжилттай"
            : saleVoidResult.message || "Системийн буцаалт амжилтгүй"}
        </div>
      )}

      <pre className="mt-2 min-h-44 flex-1 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
        {formatReceipt(receipt)}
      </pre>

      {ebarimtQrData && (
        <div className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-center">
          <p className="mb-2 text-xs font-bold text-emerald-700">eBarimt QR</p>
          <div ref={ebarimtQrRef} className="inline-flex rounded-lg bg-white p-2">
            <QRCodeSVG value={ebarimtQrData} size={152} level="M" includeMargin />
          </div>
        </div>
      )}
    </section>
  );
}
