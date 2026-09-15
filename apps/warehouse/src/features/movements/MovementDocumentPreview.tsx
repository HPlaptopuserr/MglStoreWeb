"use client";

import { useEffect, type ReactNode } from "react";
import { Printer } from "lucide-react";
import {
  WarehouseDocumentHeader,
  WarehouseDocumentInfoCard,
  WarehouseDocumentInfoGrid,
  WarehouseDocumentItemsTable,
  WarehouseDocumentSheet,
} from "@/features/documents/WarehouseDocumentSheet";
import { printWarehouseDocument } from "@/features/documents/warehouse-document.print";
import type { MovementDocument } from "./movement-document.model";

const DOCUMENT_LABELS: Record<MovementDocument["documentType"], string> = {
  GOODS_RECEIPT: "ОРЛОГЫН БАРИМТ",
  STOCK_DISPATCH: "ЗАРЛАГЫН БАРИМТ",
  MANUAL_DISPATCH: "ЗАРЛАГЫН БАРИМТ",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Ноорог",
  CONFIRMED: "Баталгаажсан",
  CANCELLED: "Цуцлагдсан",
  PENDING: "Хүлээгдэж буй",
  PREPARING: "Бэлтгэж буй",
  DISPATCHED: "Илгээгдсэн",
  DELIVERED: "Хүргэгдсэн",
};

export function MovementDocumentPreview({
  document: movementDocument,
  onClose,
}: {
  document: MovementDocument;
  onClose: () => void;
}) {
  useEffect(() => {
    const previousOverflow = window.document.body.style.overflow;
    window.document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="movement-document-title"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm print:static print:block print:overflow-visible print:bg-white print:p-0 sm:p-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-slate-100 shadow-2xl print:max-w-none print:overflow-visible print:rounded-none print:bg-white print:shadow-none">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 print:hidden">
          <h2 className="text-lg font-bold text-slate-800">
            {movementDocument.direction === "IN"
              ? "Орлогын баримт"
              : "Зарлагын баримт"}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                printWarehouseDocument(
                  "movement-document-content",
                  `${DOCUMENT_LABELS[movementDocument.documentType]} - ${movementDocument.number}`,
                )
              }
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <Printer className="h-4 w-4" /> Хэвлэх
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Хаах
            </button>
          </div>
        </div>

        <WarehouseDocumentSheet
          id="movement-document-content"
          className="m-4 sm:m-6"
        >
          <WarehouseDocumentHeader
            titleId="movement-document-title"
            title={DOCUMENT_LABELS[movementDocument.documentType]}
            number={movementDocument.number}
            date={new Date(movementDocument.occurredAt)}
            status={
              STATUS_LABELS[movementDocument.status] || movementDocument.status
            }
          />
          <WarehouseDocumentInfoGrid>
            <WarehouseDocumentInfoCard
              label={
                movementDocument.direction === "IN"
                  ? "Хүлээн авагч агуулах"
                  : "Илгээгч агуулах"
              }
              value={movementDocument.warehouseName || "Агуулах бүртгэгдээгүй"}
            >
              <ContactDetails
                address={movementDocument.warehouseAddress}
                phone={movementDocument.warehousePhone}
              />
            </WarehouseDocumentInfoCard>
            <WarehouseDocumentInfoCard
              label={
                movementDocument.direction === "IN"
                  ? "Нийлүүлэгч"
                  : "Хүлээн авагч"
              }
              value={movementDocument.partyName}
            >
              <ContactDetails
                address={movementDocument.partyAddress}
                phone={movementDocument.partyPhone}
              />
              {movementDocument.supplierRegisterNumber && (
                <DocumentSubline>
                  Регистр: {movementDocument.supplierRegisterNumber}
                </DocumentSubline>
              )}
            </WarehouseDocumentInfoCard>
            {movementDocument.driverName && (
              <WarehouseDocumentInfoCard
                label="Тээвэрлэгч / Жолооч"
                value={movementDocument.driverName}
              >
                <ContactDetails phone={movementDocument.driverPhone} />
                {movementDocument.vehicleNumber && (
                  <DocumentSubline>
                    Тээврийн хэрэгсэл: {movementDocument.vehicleNumber}
                  </DocumentSubline>
                )}
              </WarehouseDocumentInfoCard>
            )}
            <WarehouseDocumentInfoCard
              label={
                movementDocument.direction === "IN"
                  ? "Нийлүүлэгчийн баримт"
                  : "Хүсэлтийн дугаар"
              }
              value={movementDocument.relatedNumber || "—"}
            >
              {movementDocument.direction === "OUT" &&
                movementDocument.invoiceNumber && (
                  <DocumentSubline>
                    Нэхэмжлэх: {movementDocument.invoiceNumber}
                  </DocumentSubline>
                )}
            </WarehouseDocumentInfoCard>
            {movementDocument.direction === "OUT" &&
              movementDocument.partyOwnerName && (
                <WarehouseDocumentInfoCard
                  label="Байгууллагын owner"
                  value={movementDocument.partyOwnerName}
                />
              )}
            <WarehouseDocumentInfoCard
              label={
                movementDocument.direction === "IN"
                  ? "Хүлээн авсан ажилтан"
                  : movementDocument.status === "PENDING"
                    ? "Агуулахын хариуцсан ажилтан"
                    : "Агуулахаас илгээсэн ажилтан"
              }
              value={movementDocument.operatorName || "Бүртгэгдээгүй"}
            />
          </WarehouseDocumentInfoGrid>
          <WarehouseDocumentItemsTable
            items={movementDocument.items.map((item) => ({
              id: item.id,
              name: item.product.name,
              sku: item.product.sku,
              barcode: item.product.barcode,
              quantity: item.quantity,
              unit: item.product.unit || "ш",
              unitPrice: item.unitPrice,
            }))}
          />
          <footer className="mt-16 grid grid-cols-2 gap-12 text-sm">
            <Signature label="Хүлээлгэн өгсөн" />
            <Signature label="Хүлээн авсан" />
          </footer>
        </WarehouseDocumentSheet>
      </div>
    </div>
  );
}

function ContactDetails({
  address,
  phone,
}: {
  address?: string | null;
  phone?: string | null;
}) {
  if (!address && !phone) return null;

  return (
    <>
      {address && <DocumentSubline>{address}</DocumentSubline>}
      {phone && <DocumentSubline>Утас: {phone}</DocumentSubline>}
    </>
  );
}

function DocumentSubline({ children }: { children: ReactNode }) {
  return <p className="sub text-xs text-slate-500">{children}</p>;
}

function Signature({ label }: { label: string }) {
  return (
    <div className="border-t border-slate-500 pt-2">
      {label}: Нэр / гарын үсэг
    </div>
  );
}
