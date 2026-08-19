"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { wmsFetch } from "@/lib/api";
import { type Dispatch, type DispatchReturnType, formatMoney } from "./dispatch-order.model";
import { CodeModeSelect, type ProductCodeMode } from "./CodeModeSelect";

export function PadaanView({
  dispatch: d,
  onClose,
}: {
  dispatch: Dispatch;
  onClose: () => void;
}) {
  const [padaanReturns, setPadaanReturns] = useState<DispatchReturnType[]>([]);
  const [codeMode, setCodeMode] = useState<ProductCodeMode>("SKU");

  useEffect(() => {
    wmsFetch(`/api/operations/stock-requests/dispatches/${d.id}/returns`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data))
          setPadaanReturns(
            data.filter((r: DispatchReturnType) => r.status === "APPROVED"),
          );
      })
      .catch(() => {});
  }, [d.id]);

  const totalQty = d.request.items.reduce(
    (s, i) => s + (i.approvedQuantity || i.quantity),
    0,
  );
  const totalAmt = d.request.items.reduce(
    (s, i) => s + (i.approvedQuantity || i.quantity) * Number(i.product.price),
    0,
  );

  const handlePrint = () => {
    const printContent = document.getElementById("padaan-content");
    if (!printContent) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Падаан - ${d.dispatchNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 30px; color: #1e293b; }
          .header { text-align: center; border-bottom: 3px double #334155; padding-bottom: 16px; margin-bottom: 20px; }
          .header h1 { font-size: 24px; margin-bottom: 4px; }
          .header p { color: #64748b; font-size: 13px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
          .info-box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; }
          .info-box .label { font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 600; }
          .info-box .value { font-size: 14px; font-weight: 600; margin-top: 4px; }
          .info-box .sub { font-size: 12px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 13px; }
          th { background: #f1f5f9; font-weight: 600; }
          .text-right { text-align: right; }
          .total-row td { font-weight: 700; background: #f8fafc; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; margin-top: 40px; }
          .sig-box { text-align: center; }
          .sig-line { border-top: 1px solid #94a3b8; margin-top: 60px; padding-top: 8px; font-size: 12px; color: #64748b; }
          .footer { text-align: center; margin-top: 30px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
          .returns-section h3 { color: #c2410c; font-size: 14px; font-weight: 700; margin-bottom: 8px; }
          .returns-section .ret-info { font-size: 12px; color: #64748b; margin-bottom: 4px; }
          @media print { body { padding: 15px; } }
        </style>
      </head>
      <body>${printContent.innerHTML}
        <div class="footer">MGL Store WMS • Хэвлэгдсэн: ${new Date().toLocaleString("mn-MN")}</div>
      </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="p-6">
      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">
          Падаан / Зарлагын баримт
        </h2>
        <div className="flex flex-wrap gap-2">
          <CodeModeSelect value={codeMode} onChange={setCodeMode} />
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Printer className="h-4 w-4" />
            Хэвлэх
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Хаах
          </button>
        </div>
      </div>

      {/* Print Content */}
      <div
        id="padaan-content"
        className="rounded-lg border border-slate-200 bg-white p-6"
      >
        {/* Header */}
        <div className="header mb-5 border-b-2 border-double border-slate-300 pb-4 text-center">
          <h1 className="text-2xl font-bold text-slate-800">ЗАРЛАГЫН БАРИМТ</h1>
          <p className="mt-1 text-sm text-slate-500">
            {d.dispatchNumber} •{" "}
            {new Date(d.createdAt).toLocaleDateString("mn-MN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Info Grid */}
        <div className="info-grid mb-5 grid grid-cols-2 gap-4">
          <div className="info-box rounded-lg border border-slate-200 p-3">
            <p className="label text-[11px] font-semibold uppercase text-slate-400">
              Агуулах (Илгээгч)
            </p>
            <p className="value mt-1 text-sm font-semibold text-slate-800">
              {d.warehouse.name}
            </p>
            {d.warehouse.address && (
              <p className="sub text-xs text-slate-500">
                {d.warehouse.address}
              </p>
            )}
            {d.warehouse.phone && (
              <p className="sub text-xs text-slate-500">
                Утас: {d.warehouse.phone}
              </p>
            )}
          </div>
          <div className="info-box rounded-lg border border-slate-200 p-3">
            <p className="label text-[11px] font-semibold uppercase text-slate-400">
              Хүлээн авагч
            </p>
            <p className="value mt-1 text-sm font-semibold text-slate-800">
              {d.request.organization.name}
            </p>
            {d.request.deliveryAddress && (
              <p className="sub text-xs text-slate-500">
                {d.request.deliveryAddress}
              </p>
            )}
            {d.request.deliveryPhone && (
              <p className="sub text-xs text-slate-500">
                Утас: {d.request.deliveryPhone}
              </p>
            )}
          </div>
          {d.driverName && (
            <div className="info-box rounded-lg border border-slate-200 p-3">
              <p className="label text-[11px] font-semibold uppercase text-slate-400">
                Тээвэрлэгч / Жолооч
              </p>
              <p className="value mt-1 text-sm font-semibold text-slate-800">
                {d.driverName}
              </p>
              <p className="sub text-xs text-slate-500">
                Утас: {d.driverPhone}
              </p>
              {d.vehicleNumber && (
                <p className="sub text-xs text-slate-500">
                  Тээврийн хэрэгсэл: {d.vehicleNumber}
                </p>
              )}
            </div>
          )}
          <div className="info-box rounded-lg border border-slate-200 p-3">
            <p className="label text-[11px] font-semibold uppercase text-slate-400">
              Хүсэлтийн дугаар
            </p>
            <p className="value mt-1 text-sm font-semibold text-slate-800">
              {d.request.requestNumber}
            </p>
            {d.request.payment && (
              <p className="sub text-xs text-slate-500">
                Нэхэмжлэх: {d.request.payment.invoiceNumber}
              </p>
            )}
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-3 py-2 text-left">№</th>
              <th className="border border-slate-300 px-3 py-2 text-left">
                Бүтээгдэхүүний нэр
              </th>
              <th className="border border-slate-300 px-3 py-2 text-left">
                {codeMode === "SKU" ? "SKU" : "Баркод"}
              </th>
              <th className="border border-slate-300 px-3 py-2 text-right">
                Тоо ширхэг
              </th>
              <th className="border border-slate-300 px-3 py-2 text-right">
                Нэгж үнэ
              </th>
              <th className="border border-slate-300 px-3 py-2 text-right">
                Нийт дүн
              </th>
            </tr>
          </thead>
          <tbody>
            {d.request.items.map((item, idx) => {
              const qty = item.approvedQuantity || item.quantity;
              return (
                <tr key={item.id}>
                  <td className="border border-slate-300 px-3 py-2">
                    {idx + 1}
                  </td>
                  <td className="border border-slate-300 px-3 py-2 font-medium">
                    {item.product.name}
                  </td>
                  <td className="border border-slate-300 px-3 py-2 text-slate-500">
                    {codeMode === "SKU"
                      ? item.product.sku || "—"
                      : item.product.barcode || item.product.sku || "—"}
                  </td>
                  <td className="border border-slate-300 px-3 py-2 text-right font-bold">
                    {qty}
                  </td>
                  <td className="border border-slate-300 px-3 py-2 text-right">
                    ₮{Number(item.product.price).toLocaleString()}
                  </td>
                  <td className="border border-slate-300 px-3 py-2 text-right font-medium">
                    ₮{(qty * Number(item.product.price)).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="total-row bg-slate-50 font-bold">
              <td
                colSpan={3}
                className="border border-slate-300 px-3 py-2 text-right"
              >
                Нийт:
              </td>
              <td className="border border-slate-300 px-3 py-2 text-right">
                {totalQty}
              </td>
              <td className="border border-slate-300 px-3 py-2"></td>
              <td className="border border-slate-300 px-3 py-2 text-right">
                ₮{totalAmt.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>

        {d.note && (
          <div className="mt-4 text-sm text-slate-600">
            <strong>Тэмдэглэл:</strong> {d.note}
          </div>
        )}

        {/* Returns */}
        {padaanReturns.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-bold text-orange-700">
              БУЦААГДСАН БАРАА
            </h3>
            {padaanReturns.map((ret) => (
              <div key={ret.id} className="mb-3">
                <p className="text-xs text-slate-500">
                  {ret.returnNumber} •{" "}
                  {new Date(ret.approvedAt || ret.createdAt).toLocaleDateString(
                    "mn-MN",
                  )}
                  {ret.reason && ` • Шалтгаан: ${ret.reason}`}
                </p>
                <table className="mt-1 w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-orange-50">
                      <th className="border border-slate-300 px-3 py-1 text-left">
                        Бүтээгдэхүүн
                      </th>
                      <th className="border border-slate-300 px-3 py-1 text-right">
                        Тоо
                      </th>
                      <th className="border border-slate-300 px-3 py-1 text-left">
                        Шалтгаан
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ret.items.map((item) => (
                      <tr key={item.id}>
                        <td className="border border-slate-300 px-3 py-1">
                          {item.product.name}
                        </td>
                        <td className="border border-slate-300 px-3 py-1 text-right font-bold">
                          {item.quantity}
                        </td>
                        <td className="border border-slate-300 px-3 py-1 text-slate-500">
                          {item.reason || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* Signatures */}
        <div className="signatures mt-10 grid grid-cols-3 gap-8">
          <div className="sig-box text-center">
            <div className="sig-line mt-16 border-t border-slate-400 pt-2 text-xs text-slate-500">
              Агуулахын ажилтан
            </div>
          </div>
          <div className="sig-box text-center">
            <div className="sig-line mt-16 border-t border-slate-400 pt-2 text-xs text-slate-500">
              Жолооч / Тээвэрлэгч
            </div>
          </div>
          <div className="sig-box text-center">
            <div className="sig-line mt-16 border-t border-slate-400 pt-2 text-xs text-slate-500">
              Хүлээн авагч
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
