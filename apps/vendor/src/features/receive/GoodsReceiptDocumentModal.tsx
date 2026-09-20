"use client";

import { useEffect } from "react";
import { Printer, X } from "lucide-react";

export type GoodsReceiptDocumentItem = {
  id: string;
  productName: string;
  sku: string | null;
  barcode: string | null;
  quantity: number;
  remainingQuantity: number;
  unitCost: number | null;
  totalCost: number | null;
  batchNumber: string | null;
  expiryDate: string | null;
};

export type GoodsReceiptDocument = {
  id: string;
  receiptNo: string;
  supplierName: string;
  supplierRegisterNo?: string | null;
  documentNo: string | null;
  note: string | null;
  receivedAt: string;
  branchName?: string;
  registerName?: string;
  receivedBy: string;
  totalQuantity: number;
  totalCost: number;
  items: GoodsReceiptDocumentItem[];
};

const money = (value: number) => `₮${value.toLocaleString("mn-MN")}`;

function printDocument(elementId: string, title: string) {
  const content = window.document.getElementById(elementId);
  const printWindow = content ? window.open("", "_blank") : null;
  if (!content || !printWindow) return;
  printWindow.document
    .write(`<!doctype html><html lang="mn"><head><meta charset="utf-8"><title>${title}</title><style>
    *{box-sizing:border-box}body{margin:0;padding:14mm;color:#1e293b;font-family:Arial,sans-serif}article{width:100%}.header{text-align:center;border-bottom:3px double #cbd5e1;padding-bottom:16px;margin-bottom:20px}.header h1{margin:0;font-size:24px}.header p{margin:5px 0 0;color:#64748b;font-size:13px}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}.info-box{border:1px solid #e2e8f0;border-radius:6px;padding:12px;break-inside:avoid}.label{margin:0;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase}.value{margin:4px 0 0;font-size:14px;font-weight:600}.sub{margin:2px 0 0;color:#64748b;font-size:12px}table{width:100%;border-collapse:collapse;font-size:12px}thead{display:table-header-group}tr{break-inside:avoid}th,td{border:1px solid #cbd5e1;padding:7px;text-align:left}th{background:#f1f5f9}.text-right{text-align:right}.total-row td{background:#f8fafc;font-weight:700}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:60px;break-inside:avoid}.signature{border-top:1px solid #94a3b8;padding-top:8px;font-size:12px}@page{size:A4 portrait;margin:0}
  </style></head><body>${content.outerHTML}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

export function GoodsReceiptDocumentModal({
  document,
  onClose,
}: {
  document: GoodsReceiptDocument;
  onClose: () => void;
}) {
  useEffect(() => {
    const previous = window.document.body.style.overflow;
    window.document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) =>
      event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-document-title"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-800">Орлогын баримт</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                printDocument(
                  "pos-goods-receipt-document",
                  `ОРЛОГЫН БАРИМТ - ${document.receiptNo}`,
                )
              }
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Printer className="h-4 w-4" /> Хэвлэх
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Хаах"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <article
          id="pos-goods-receipt-document"
          className="m-4 rounded-lg border border-slate-200 bg-white p-5 text-slate-900 sm:m-6 sm:p-8"
        >
          <header className="header mb-5 border-b-4 border-double border-slate-300 pb-4 text-center">
            <h1 id="receipt-document-title" className="text-2xl font-bold">
              ОРЛОГЫН БАРИМТ
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {document.documentNo || document.receiptNo} ·{" "}
              {new Date(document.receivedAt).toLocaleDateString("mn-MN")}
            </p>
          </header>
          <section className="info-grid mb-5 grid gap-4 sm:grid-cols-2">
            <Info
              label="Хүлээн авсан салбар"
              value={document.branchName || "Салбар"}
              sub={document.registerName || undefined}
            />
            <Info
              label="Нийлүүлэгч"
              value={document.supplierName}
              sub={
                document.supplierRegisterNo
                  ? `Регистр: ${document.supplierRegisterNo}`
                  : undefined
              }
            />
            <Info
              label="Баримтын дугаар"
              value={document.documentNo || "Дугааргүй"}
              sub={`Системийн № ${document.receiptNo}`}
            />
            <Info
              label="Хүлээн авсан ажилтан"
              value={document.receivedBy}
              sub={new Date(document.receivedAt).toLocaleString("mn-MN")}
            />
          </section>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 px-2 py-2">№</th>
                  <th className="border border-slate-300 px-2 py-2 text-left">
                    Бүтээгдэхүүн
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-left">
                    SKU / баркод
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-left">
                    Багц / хугацаа
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-right">
                    Тоо
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-right">
                    Нэгж үнэ
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-right">
                    Нийт
                  </th>
                </tr>
              </thead>
              <tbody>
                {document.items.map((item, index) => (
                  <tr key={item.id}>
                    <td className="border border-slate-300 px-2 py-2">
                      {index + 1}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 font-medium">
                      {item.productName}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-slate-500">
                      {item.sku || "—"} / {item.barcode || "—"}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-slate-500">
                      {item.batchNumber || "—"}
                      <br />
                      {item.expiryDate || "Хугацаагүй"}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right font-bold">
                      {item.quantity}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      {item.unitCost == null ? "—" : money(item.unitCost)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right font-semibold">
                      {item.totalCost == null ? "—" : money(item.totalCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="total-row bg-slate-50 font-bold">
                  <td
                    colSpan={4}
                    className="border border-slate-300 px-2 py-2 text-right"
                  >
                    Нийт:
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-right">
                    {document.totalQuantity}
                  </td>
                  <td className="border border-slate-300" />
                  <td className="border border-slate-300 px-2 py-2 text-right">
                    {money(document.totalCost)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          {document.note && (
            <p className="mt-4 text-sm text-slate-600">
              <strong>Тэмдэглэл:</strong> {document.note}
            </p>
          )}
          <footer className="signatures mt-16 grid grid-cols-2 gap-12 text-sm">
            <div className="signature border-t border-slate-400 pt-2">
              Хүлээлгэн өгсөн: Нэр / гарын үсэг
            </div>
            <div className="signature border-t border-slate-400 pt-2">
              Хүлээн авсан: {document.receivedBy} / гарын үсэг
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
}

function Info({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="info-box rounded-lg border border-slate-200 p-3">
      <p className="label text-[11px] font-semibold uppercase text-slate-400">
        {label}
      </p>
      <p className="value mt-1 text-sm font-semibold text-slate-800">{value}</p>
      {sub && <p className="sub mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}
