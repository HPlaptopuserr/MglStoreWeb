"use client";

import { useEffect, useRef, useState } from "react";
import SkuGenerator from "@/components/SkuGenerator";

interface Props {
  aliases?: string[];
  onAddBarcode?: (barcode: string) => void;
  name: string;
  organizationName: string;
  warehouseId: string;
  barcode: string;
  sku: string;
  onChange: (field: "barcode" | "autoCode", value: string) => void;
}

export function ReceiptBarcodeEditor({
  aliases = [],
  onAddBarcode,
  name,
  organizationName,
  warehouseId,
  barcode,
  sku,
  onChange,
}: Props) {
  const [automatic, setAutomatic] = useState(!barcode && !sku);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  return (
    <>
      {automatic && name.trim() && (
        <div hidden>
          <SkuGenerator
            productName={name}
            organizationName={organizationName}
            warehouseId={warehouseId}
            value={sku}
            onChange={(value) => onChange("autoCode", value)}
          />
        </div>
      )}
      <button
        type="button"
        aria-label="Баркод өөрчлөх"
        aria-haspopup="dialog"
        onClick={() => {
          setDraft(onAddBarcode ? "" : barcode || sku);
          setError("");
          setOpen(true);
        }}
        className="shrink-0 rounded-lg px-2 py-2 text-xs font-medium text-blue-600 underline decoration-dotted underline-offset-4 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {barcode || sku || "Нэр оруулахад код үүснэ"}
      </button>
      <dialog
        ref={dialog}
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
        aria-label="Баркод өөрчлөх"
        className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl backdrop:bg-slate-900/40"
      >
        <h3 className="text-lg font-bold text-slate-900">
          {onAddBarcode ? "Нэмэлт баркод холбох" : "Баркод өөрчлөх"}
        </h3>
        {onAddBarcode && (
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <p className="font-semibold">{name}</p>
            <p>Үндсэн баркод: {barcode || sku || "Байхгүй"}</p>
            {aliases.length > 0 && <p>Нэмэлт: {aliases.join(", ")}</p>}
            <p>
              Ижил хэмжээ, амт, савлагаатай бараа мөн эсэхийг шалгана уу. Хуучин
              баркод хэвээр үлдэнэ. Баримтыг баталгаажуулахад нэмэлт баркод
              хадгалагдана.
            </p>
          </div>
        )}
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Баркод / дотоод код
          <input
            autoFocus
            value={draft}
            maxLength={100}
            onChange={(event) => setDraft(event.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        {!onAddBarcode && (
          <button
            type="button"
            onClick={() => {
              setAutomatic(true);
              setOpen(false);
            }}
            className="mt-3 text-sm font-semibold text-blue-600 hover:underline"
          >
            Стандартаар автоматаар үүсгэх
          </button>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
          >
            Болих
          </button>
          <button
            type="button"
            disabled={!draft.trim()}
            onClick={() => {
              const code = draft.trim();
              if (/\s/.test(code)) {
                setError("Баркод зай агуулж болохгүй.");
                return;
              }
              if (
                onAddBarcode &&
                (code === barcode || aliases.includes(code))
              ) {
                setError("Энэ баркод аль хэдийн холбогдсон байна.");
                return;
              }
              setAutomatic(false);
              if (onAddBarcode) onAddBarcode(code);
              else onChange("barcode", code);
              setOpen(false);
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {onAddBarcode ? "Ижил бараанд холбох" : "Хадгалах"}
          </button>
        </div>
      </dialog>
    </>
  );
}
