"use client";
import { useEffect, useId, useState } from "react";
import { Loader2, Printer } from "lucide-react";
import type { WarehouseDispatchDocument } from "@mgl/types";
import { Modal } from "@/components/Modal";
import {
  WarehouseDocumentHeader,
  WarehouseDocumentInfoCard,
  WarehouseDocumentInfoGrid,
  WarehouseDocumentSheet,
  WarehouseDocumentItemsTable,
} from "@/features/documents/WarehouseDocumentSheet";
import { printWarehouseDocument } from "@/features/documents/warehouse-document.print";
import { dispatchEndpoint, dispatchRequest } from "./dispatch-api";
import { dispatchDate } from "./dispatch-format";

export function DispatchDocumentDialog({
  warehouseId,
  documentId,
  onClose,
}: {
  warehouseId: string;
  documentId: string;
  onClose: () => void;
}) {
  const printId = useId();
  const [data, setData] = useState<WarehouseDispatchDocument | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void dispatchRequest<WarehouseDispatchDocument>(
      `${dispatchEndpoint(warehouseId)}/${encodeURIComponent(documentId)}`,
      { signal: controller.signal },
    )
      .then((value) => {
        if (!controller.signal.aborted) setData(value);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Падан ачаалж чадсангүй.",
          );
      });
    return () => controller.abort();
  }, [warehouseId, documentId, attempt]);
  return (
    <Modal
      title="Зарлагын падан"
      description={
        data
          ? `${data.dispatchNumber} · ${dispatchDate(data.createdAt)}`
          : "Гаргалтын дэлгэрэнгүй мэдээлэл"
      }
      onClose={onClose}
    >
      {error ? (
        <div
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
          <button
            type="button"
            onClick={() => {
              setError("");
              setAttempt((value) => value + 1);
            }}
            className="ml-3 font-semibold underline"
          >
            Дахин оролдох
          </button>
        </div>
      ) : !data ? (
        <p
          role="status"
          className="flex items-center justify-center gap-2 p-12 text-slate-500"
        >
          <Loader2 className="size-5 animate-spin" />
          Падан ачаалж байна…
        </p>
      ) : (
        <>
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() =>
                printWarehouseDocument(
                  printId,
                  `Зарлагын падан ${data.dispatchNumber}`,
                )
              }
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Printer className="size-4" />
              Хэвлэх
            </button>
          </div>
          <WarehouseDocumentSheet id={printId}>
            <WarehouseDocumentHeader
              title="ЗАРЛАГЫН ПАДАН"
              number={data.dispatchNumber}
              date={new Date(data.createdAt)}
            />
            <WarehouseDocumentInfoGrid>
              <WarehouseDocumentInfoCard
                label="Илгээгч агуулах"
                value={data.warehouse.name}
              >
                <p className="mt-1 text-xs text-slate-500">
                  {data.warehouse.address}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Бүртгэсэн: {data.createdByName}
                </p>
              </WarehouseDocumentInfoCard>
              <WarehouseDocumentInfoCard
                label="Хүлээн авах дэлгүүр"
                value={data.storeName || "—"}
              >
                <p className="mt-1 text-sm">
                  {data.recipientName || "—"} · {data.recipientPhone || "—"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {data.address || "Хаяг оруулаагүй"}
                </p>
                {data.lat !== null && data.lng !== null && (
                  <p className="mt-1 text-xs text-slate-500">
                    Байршил: {data.lat.toFixed(6)}, {data.lng.toFixed(6)}
                  </p>
                )}
              </WarehouseDocumentInfoCard>
            </WarehouseDocumentInfoGrid>
            <WarehouseDocumentItemsTable
              codeMode="SKU"
              items={data.items.map((item) => ({
                id: item.id,
                name: item.name,
                sku: item.sku,
                barcode: null,
                quantity: item.quantity,
                unitPrice:
                  item.unitPrice === null ? null : Number(item.unitPrice),
              }))}
            />
            {data.totalAmount === null && (
              <p className="mt-3 text-xs text-amber-700">
                Өмнөх паданы үнэ хадгалагдаагүй тул мөнгөн дүнг харуулахгүй.
              </p>
            )}
            {data.reason && (
              <p className="mt-4 text-sm">Шалтгаан: {data.reason}</p>
            )}
            {data.note && (
              <p className="mt-2 whitespace-pre-wrap text-sm">
                Тэмдэглэл: {data.note}
              </p>
            )}
            <footer className="signatures mt-8 grid grid-cols-2 gap-6 border-t border-slate-200 pt-5 text-xs text-slate-500">
              <p>Хүлээлгэн өгсөн: ________________</p>
              <p>Хүлээн авсан: ________________</p>
            </footer>
          </WarehouseDocumentSheet>
        </>
      )}
    </Modal>
  );
}
