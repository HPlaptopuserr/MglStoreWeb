"use client";

import { useRef, useState } from "react";
import { Loader2, Printer, RotateCcw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { PosReceipt } from "../types/receipt.types";
import type { RegisterConfig } from "../types/pos.types";
import { voidPushEcr } from "../api/payments";
import { returnLocalEbarimtReceipt, sendLocalEbarimtData } from "../api/ebarimt";
import { voidSale } from "../api/void-sale";
import { formatReceipt } from "../utils/format-receipt";
import { receiptPrintLayout, receiptPrintCss, receiptPrintFooter } from "../utils/receipt-print-layout";
import { withDemoEbarimt } from "../utils/receipt-preview-demo";
import { printThermalDocument } from "../utils/print-thermal-document";

type Props = {
  receipt: PosReceipt | null;
  register?: RegisterConfig | null;
  onVoided?: (message: string) => void;
  className?: string;
  allowReturns?: boolean;
};

export function ReceiptPreview({ receipt, register, onVoided, allowReturns = true, className = "" }: Props) {
  const [terminalVoiding, setTerminalVoiding] = useState(false);
  const [terminalVoidResult, setTerminalVoidResult] = useState<{ succeed: boolean; message?: string } | null>(null);
  const [saleVoiding, setSaleVoiding] = useState(false);
  const [saleVoidResult, setSaleVoidResult] = useState<{ succeed: boolean; message?: string } | null>(null);
  const [demoQr, setDemoQr] = useState(true);
  const ebarimtQrRef = useRef<HTMLDivElement>(null);

  if (!receipt) return null;

  const cardLine = receipt.paymentBreakdown?.find(
    (payment) => payment.method === "CARD" && payment.traceno && payment.terminalId,
  );
  const isVoided = receipt.status === "VOIDED";
  const canPreviewDemo = process.env.NODE_ENV !== "production" && !receipt.ebarimt?.qrData;
  const showingDemo = canPreviewDemo && demoQr;
  const displayReceipt = showingDemo ? withDemoEbarimt(receipt) : receipt;
  const ebarimtQrData =
    displayReceipt.ebarimt?.status === "SUCCESS" && displayReceipt.ebarimt.qrData
      ? displayReceipt.ebarimt.qrData
      : "";

  const handlePrint = () => {
    const qrMarkup = ebarimtQrRef.current?.innerHTML || "";
    printThermalDocument({
      bodyHtml: `${showingDemo ? '<p style="text-align:center;font-weight:bold">ТЕСТ БАРИМТ — eBarimt-д бүртгэгдэхгүй</p>' : ""}${receiptPrintLayout(displayReceipt)}${qrMarkup ? `<div class="ebarimt-qr"><p class="ebarimt-qr-title">{showingDemo ? "ТЕСТ QR — eBarimt-д бүртгэгдэхгүй" : "eBarimt QR код"}</p>${qrMarkup}</div>` : ""}${receiptPrintFooter}`,
      extraCss: `${receiptPrintCss}

        .ebarimt-qr { margin-top: 3mm; text-align: center; }
        .ebarimt-qr svg { width: 42mm; height: 42mm; }
        .ebarimt-qr-title { margin: 0 0 2mm; font-family: sans-serif; font-size: 9pt; font-weight: 700; }
      `,
    });
  };

  const handleTerminalVoid = async () => {
    if (!cardLine?.traceno || !cardLine?.terminalId) return;
    if (!confirm(`Картын terminal буцаалт хийх үү?\nБаримтын дугаар: ${receipt.receiptNo}`)) return;

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
      `Буцаалт хийх шалтгаанаа оруулна уу.\nБаримтын дугаар: ${receipt.receiptNo}`,
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
      const ebarimtReturn = await returnLocalEbarimtReceipt(receipt, register);
      const result = await voidSale(receipt.id, reason.trim());
      const message = result.message || "Буцаалт амжилттай хийгдлээ";
      let syncedMessage = message;

      try {
        const info = await sendLocalEbarimtData(register);
        const lastSentDate = info.lastSentDate || "-";

        syncedMessage = ebarimtReturn
          ? `${message}. eBarimt return requested (${ebarimtReturn.id}); sendData done. lastSentDate: ${lastSentDate}`
          : `${message}. eBarimt return skipped; sendData done. lastSentDate: ${lastSentDate}`;
      } catch (syncError: any) {
        syncedMessage = `${message}. eBarimt sync failed: ${syncError?.message || "unknown error"}`;
      }

      setSaleVoidResult({ succeed: true, message: syncedMessage });
      onVoided?.(syncedMessage);
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
            <h3 className="text-sm font-semibold text-slate-900">Баримтын харагдац</h3>
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
          {allowReturns && !isVoided && cardLine && !terminalVoidResult?.succeed && (
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
          {allowReturns && !isVoided && !saleVoidResult?.succeed && (
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

      {canPreviewDemo && (
        <label className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-xs font-semibold text-amber-900">
          <input type="checkbox" checked={demoQr} onChange={event => setDemoQr(event.target.checked)} />
          Тест QR, сугалааны дугаар харуулах — eBarimt-д бүртгэгдэхгүй
        </label>
      )}
      <pre className="mt-2 min-h-44 flex-1 whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
        {formatReceipt(displayReceipt)}
      </pre>

      {!ebarimtQrData && (
        <p role="status" className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          {receipt.ebarimt?.status === "SUCCESS"
            ? "eBarimt бүртгэгдсэн боловч энэ баримтын QR мэдээлэл ирээгүй байна."
            : "Энэ баримтад eBarimt QR үүсээгүй байна."}
        </p>
      )}
      {ebarimtQrData && (
        <div className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-center">
          <p className="mb-2 text-xs font-bold text-emerald-700">{showingDemo ? "ТЕСТ QR — eBarimt-д бүртгэгдэхгүй" : "eBarimt QR код"}</p>
          <div ref={ebarimtQrRef} className="inline-flex rounded-lg bg-white p-2">
            <QRCodeSVG value={ebarimtQrData} size={152} level="M" includeMargin />
          </div>
        </div>
      )}
    </section>
  );
}
