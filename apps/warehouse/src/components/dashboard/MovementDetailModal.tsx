"use client";

import { useRef } from "react";
import { Printer, X } from "lucide-react";
import type { Movement } from "./types";
import { REASON_MAP } from "./types";

export function MovementDetailModal({
  movement,
  onClose,
}: {
  movement: Movement;
  onClose: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Хөдөлгөөний дэлгэрэнгүй</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #1e293b; }
            .print-header { text-align: center; margin-bottom: 32px; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; }
            .print-header h1 { font-size: 18px; margin: 0 0 4px; }
            .print-header p { font-size: 12px; color: #64748b; margin: 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
            .detail-label { font-size: 13px; color: #64748b; }
            .detail-value { font-size: 13px; font-weight: 600; }
            .positive { color: #059669; }
            .negative { color: #dc2626; }
            .note-box { background: #f8fafc; padding: 12px; border-radius: 8px; margin-top: 8px; font-size: 13px; }
            .print-footer { margin-top: 32px; text-align: center; font-size: 11px; color: #94a3b8; }
          </style>
        </head>
        <body>
          ${content}
          <div class="print-footer">Хэвлэсэн: ${new Date().toLocaleString("mn-MN")}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const r = REASON_MAP[movement.reason] || {
    label: movement.reason,
    color: "bg-slate-100 text-slate-700",
  };
  const isPositive = movement.change > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">
            Хөдөлгөөний дэлгэрэнгүй
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              title="Хэвлэх"
            >
              <Printer className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div ref={printRef} className="px-6 py-5">
          <div className="print-header" style={{ display: "none" }}>
            <h1>Хөдөлгөөний баримт</h1>
            <p>#{movement.id.slice(0, 8).toUpperCase()}</p>
          </div>

          <div className="space-y-4">
            <div className="detail-row flex items-center justify-between">
              <span className="detail-label text-sm text-slate-500">Бараа</span>
              <div className="detail-value text-right">
                <p className="text-sm font-semibold text-slate-900">
                  {movement.product.name}
                </p>
                <p className="text-xs text-slate-400">
                  {movement.product.sku || "SKU байхгүй"}
                </p>
              </div>
            </div>

            <div className="detail-row flex items-center justify-between">
              <span className="detail-label text-sm text-slate-500">Төрөл</span>
              <span
                className={`detail-value inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${r.color}`}
              >
                {r.label}
              </span>
            </div>

            <div className="detail-row flex items-center justify-between">
              <span className="detail-label text-sm text-slate-500">Өөрчлөлт</span>
              <span
                className={`detail-value text-lg font-black ${isPositive ? "text-emerald-600 positive" : "text-red-600 negative"}`}
              >
                {isPositive ? "+" : ""}
                {movement.change}
              </span>
            </div>

            <div className="detail-row flex items-center justify-between">
              <span className="detail-label text-sm text-slate-500">Огноо</span>
              <span className="detail-value text-sm font-medium text-slate-900">
                {new Date(movement.createdAt).toLocaleString("mn-MN")}
              </span>
            </div>

            <div className="detail-row flex items-center justify-between">
              <span className="detail-label text-sm text-slate-500">Хэрэглэгч</span>
              <span className="detail-value text-sm font-medium text-slate-900">
                {movement.createdBy?.profile?.fullName ||
                  movement.createdBy?.email ||
                  "Систем"}
              </span>
            </div>

            {movement.note && (
              <div>
                <span className="detail-label text-sm text-slate-500">
                  Тэмдэглэл
                </span>
                <p className="note-box mt-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {movement.note}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
