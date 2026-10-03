"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, Save, X } from "lucide-react";
import { CatalogImageUpload } from "./CatalogImageUpload";
import { CatalogCategorySelect } from "./CatalogCategorySelect";
import { API, adminFetch, getApiErrorMessage } from "@/lib/api";
import { useAdminResource } from "@/lib/use-admin-resource";

interface CatalogProduct {
  id: string;
  canonicalName: string;
  barcode: string | null;
  brand: string | null;
  unit: string | null;
  categoryName: string | null;
  description: string | null;
  imageUrl: string | null;
  updatedAt: string;
}
const fields = [
  {
    key: "canonicalName",
    label: "Барааны нэр",
    placeholder: "Брэнд + барааны нэр + хэмжээ, савлагаа",
    max: 200,
    required: true,
  },
  {
    key: "barcode",
    label: "Баркод",
    placeholder: "Бүтээгдэхүүний баркод",
    max: 128,
  },
  {
    key: "brand",
    label: "Брэнд",
    placeholder: "Үйлдвэрлэгчийн брэнд",
    max: 120,
  },
  { key: "unit", label: "Хэмжих нэгж", placeholder: "ш, кг, л…", max: 40 },
] as const;

function CatalogEditForm({
  product,
  onSaved,
  setBusy,
}: {
  product: CatalogProduct;
  onSaved: () => void;
  setBusy: (busy: boolean) => void;
}) {
  const [draft, setDraft] = useState(product);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || uploading) return;
    setSaving(true);
    setBusy(true);
    setError("");
    try {
      const response = await adminFetch(
        `${API}/products/master-catalog/admin/${product.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        },
      );
      if (!response.ok)
        throw new Error(
          await getApiErrorMessage(response, "Мэдээлэл хадгалсангүй"),
        );
      onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Мэдээлэл хадгалсангүй",
      );
    } finally {
      setSaving(false);
      setBusy(false);
    }
  }
  const inputClass =
    "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60";
  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm leading-6 text-blue-900">
        Энд зассан мэдээллийг дэлгүүрүүд шинээр бараа нэмэхдээ ашиглана. Одоо
        байгаа дэлгүүрүүдийн барааны нэр, үнэ, үлдэгдэл өөрчлөгдөхгүй.
      </div>
      <fieldset
        disabled={saving || uploading}
        className="grid gap-4 sm:grid-cols-2"
      >
        <legend className="sr-only">Нэгдсэн барааны мэдээлэл</legend>
        {fields.map((field) => (
          <label
            key={field.key}
            className={`text-sm font-semibold text-slate-700 ${field.key === "canonicalName" ? "sm:col-span-2" : ""}`}
          >
            {field.label}
            {field.key === "canonicalName" ? " *" : ""}
            <input
              className={inputClass}
              value={draft[field.key] ?? ""}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  [field.key]: event.target.value,
                }))
              }
              maxLength={field.max}
              required={field.key === "canonicalName"}
              minLength={field.key === "canonicalName" ? 2 : undefined}
              type="text"
              placeholder={field.placeholder}
            />
          </label>
        ))}
        <CatalogImageUpload
          value={draft.imageUrl}
          onChange={(imageUrl) =>
            setDraft((current) => ({ ...current, imageUrl }))
          }
          onBusy={(busy) => {
            setUploading(busy);
            setBusy(busy);
          }}
        />
        <CatalogCategorySelect
          value={draft.categoryName ?? ""}
          onChange={(categoryName) =>
            setDraft((current) => ({ ...current, categoryName }))
          }
          className={inputClass}
        />
        <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
          Тайлбар
          <textarea
            rows={4}
            maxLength={5000}
            className={inputClass}
            value={draft.description ?? ""}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            placeholder="Орц, зориулалт, хэмжээ болон савлагааны мэдээлэл"
          />
        </label>
      </fieldset>
      <p className="text-xs leading-5 text-slate-500">
        Нэрийг товчлолгүй бичиж, хэмжээ болон савлагааг тодруулна уу. Өмнөх нэр
        хайлтаар олдох хэвээр үлдэнэ.
      </p>
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <div className="flex justify-end border-t border-slate-100 pt-4">
        <button
          type="submit"
          disabled={saving || uploading}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Save aria-hidden="true" className="h-4 w-4" />
          )}
          {saving ? "Хадгалж байна…" : "Өөрчлөлт хадгалах"}
        </button>
      </div>
    </form>
  );
}

export function MasterProductEditor({
  id,
  onClose,
  onSaved,
}: {
  id: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const { data, error, loading, reload } = useAdminResource<CatalogProduct>(
    `${API}/products/master-catalog/admin/${id}`,
  );
  useEffect(() => {
    const previous = document.activeElement;
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="catalog-edit-heading"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/50"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4">
        <h2
          id="catalog-edit-heading"
          className="text-lg font-black text-slate-950"
        >
          Нэгдсэн бараа засах
        </h2>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Хаах"
          className="rounded-lg p-2 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
      <div className="p-5" aria-busy={loading}>
        {loading && (
          <p role="status" className="py-12 text-center text-sm text-slate-500">
            Барааны мэдээлэл ачааллаж байна…
          </p>
        )}
        {error && (
          <div
            role="alert"
            className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
            <button
              type="button"
              onClick={reload}
              className="ml-2 font-bold underline"
            >
              Дахин оролдох
            </button>
          </div>
        )}
        {data && (
          <CatalogEditForm
            key={data.updatedAt}
            product={data}
            setBusy={setBusy}
            onSaved={onSaved}
          />
        )}
      </div>
    </dialog>
  );
}
