"use client";

import { ReceiptSourceFields, type ReceiptSourceSection } from "@mgl/ui";

export interface WarehouseReceiptDocumentProps {
  section?: ReceiptSourceSection;
  warehouseName?: string;
  supplier: string;
  onSupplierChange: (value: string) => void;
  registerNumber: string;
  onRegisterNumberChange: (value: string) => void;
  documentNumber: string;
  onDocumentNumberChange: (value: string) => void;
  documentDate: string;
  onDocumentDateChange: (value: string) => void;
  note: string;
  onNoteChange: (value: string) => void;
  files: File[];
  onFilesChange: (files: File[]) => void;
}

export function WarehouseReceiptDocument({
  section,
  warehouseName,
  supplier,
  onSupplierChange,
  registerNumber,
  onRegisterNumberChange,
  documentNumber,
  onDocumentNumberChange,
  documentDate,
  onDocumentDateChange,
  note,
  onNoteChange,
  files,
  onFilesChange,
}: WarehouseReceiptDocumentProps) {
  return (
    <ReceiptSourceFields
      section={section}
      registers={[]}
      selectedRegisterId=""
      setSelectedRegisterId={() => {}}
      receiverLabel="Хүлээн авагч · Агуулах"
      receiver={
        <span className="flex h-11 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-900">
          {warehouseName || "Дээд цэснээс агуулах сонгоно уу"}
        </span>
      }
      supplierName={supplier}
      setSupplierName={onSupplierChange}
      supplierRegisterNo={registerNumber}
      setSupplierRegisterNo={onRegisterNumberChange}
      documentNo={documentNumber}
      setDocumentNo={onDocumentNumberChange}
      note={note}
      setNote={onNoteChange}
      additionalFields={
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-xs font-bold text-slate-500">
            ПАДААНЫ ОГНОО
            <input
              type="date"
              value={documentDate}
              onChange={(event) => onDocumentDateChange(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
          <div>
            <label className="block text-xs font-bold text-slate-500">
              ПАДААНЫ ЗУРАГ / PDF
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                multiple
                onChange={(event) =>
                  onFilesChange(
                    Array.from(event.target.files || []).slice(0, 5),
                  )
                }
                className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white p-2 text-xs file:mr-2 file:rounded file:border-0 file:bg-cyan-50 file:px-2 file:py-1 file:text-cyan-700"
              />
            </label>
            <p className="mt-1 text-xs text-slate-400">
              JPG, PNG, WebP, PDF · файл тус бүр 10 MB · хамгийн ихдээ 5
            </p>
            <ul className="mt-2 space-y-1 text-xs text-slate-500">
              {files.map((file) => (
                <li key={`${file.name}-${file.lastModified}`}>
                  {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
                </li>
              ))}
            </ul>
          </div>
        </div>
      }
    />
  );
}
