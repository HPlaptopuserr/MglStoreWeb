"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { wmsFetch } from "@/lib/api";
import { type Dispatch, type DispatchReturnType } from "./dispatch-order.model";
import { CodeModeSelect, type ProductCodeMode } from "./CodeModeSelect";
import {
  WarehouseDocumentHeader,
  WarehouseDocumentInfoCard,
  WarehouseDocumentInfoGrid,
  WarehouseDocumentItemsTable,
  WarehouseDocumentSheet,
} from "@/features/documents/WarehouseDocumentSheet";
import { printWarehouseDocument } from "@/features/documents/warehouse-document.print";

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

  const handlePrint = () =>
    printWarehouseDocument(
      "padaan-content",
      `Зарлагын баримт - ${d.dispatchNumber}`,
    );

  return (
    <div className="p-6">
      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">Зарлагын баримт</h2>
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
      <WarehouseDocumentSheet id="padaan-content">
        <WarehouseDocumentHeader
          title="ЗАРЛАГЫН БАРИМТ"
          number={d.dispatchNumber}
          date={new Date(d.createdAt)}
        />

        <WarehouseDocumentInfoGrid>
          <WarehouseDocumentInfoCard
            label="Агуулах (Илгээгч)"
            value={d.warehouse.name}
          >
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
          </WarehouseDocumentInfoCard>
          <WarehouseDocumentInfoCard
            label="Хүлээн авагч"
            value={d.request.organization.name}
          >
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
          </WarehouseDocumentInfoCard>
          {d.driverName && (
            <WarehouseDocumentInfoCard
              label="Тээвэрлэгч / Жолооч"
              value={d.driverName}
            >
              <p className="sub text-xs text-slate-500">
                Утас: {d.driverPhone}
              </p>
              {d.vehicleNumber && (
                <p className="sub text-xs text-slate-500">
                  Тээврийн хэрэгсэл: {d.vehicleNumber}
                </p>
              )}
            </WarehouseDocumentInfoCard>
          )}
          <WarehouseDocumentInfoCard
            label="Хүсэлтийн дугаар"
            value={d.request.requestNumber}
          >
            {d.request.payment && (
              <p className="sub text-xs text-slate-500">
                Нэхэмжлэх: {d.request.payment.invoiceNumber}
              </p>
            )}
          </WarehouseDocumentInfoCard>
          <WarehouseDocumentInfoCard
            label={
              d.status === "PENDING"
                ? "Агуулахын хариуцсан ажилтан"
                : "Агуулахаас илгээсэн ажилтан"
            }
            value={d.operatorName || "Бүртгэгдээгүй"}
          />
        </WarehouseDocumentInfoGrid>

        <WarehouseDocumentItemsTable
          codeMode={codeMode}
          items={d.request.items.map((item) => ({
            id: item.id,
            name: item.product.name,
            sku: item.product.sku,
            barcode: item.product.barcode ?? null,
            quantity: item.approvedQuantity ?? item.quantity,
            unitPrice: Number(item.product.price),
          }))}
        />

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
      </WarehouseDocumentSheet>
    </div>
  );
}
