"use client";

import { MasterCatalogSuggestions } from "@/features/products/components/MasterCatalogSuggestions";
import type { MasterCatalogProduct } from "@/features/products/types";
import { normalizePosMeasureUnit } from "@mgl/types";
import { markedUpPrice } from "./receipt-pricing";
import { FormEvent, useEffect, useState } from "react";
import { Loader2, PackagePlus, X } from "lucide-react";
import { EBARIMT_GROCERY_FALLBACK_CLASSIFICATION_CODE } from "@mgl/types";
import { API, authFetch } from "@/lib/api";

export interface CreatedReceiptProduct {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  stock: number;
  costPrice?: number | null;
  manualReceiptPrice?: string;
  unit: "pcs" | "kg" | null;
  isActive: boolean;
  supplyType: string;
}

interface QuickProductCreateModalProps {
  open: boolean;
  markupPercent?: string;
  organizationId: string;
  initialCode: string;
  initialMaster?: MasterCatalogProduct | null;
  onClose: () => void;
  onCreated: (product: CreatedReceiptProduct) => void;
}

type FormState = {
  name: string;
  sku: string;
  barcode: string;
  price: string;
  costPrice: string;
  unit: "pcs" | "kg";
};

function createInitialForm(code: string): FormState {
  const trimmed = code.trim();
  const isBarcode = /^\d{4,}$/.test(trimmed);
  return {
    name: "",
    sku: isBarcode ? "" : trimmed,
    barcode: isBarcode ? trimmed : "",
    price: "",
    costPrice: "",
    unit: "pcs",
  };
}

async function readError(response: Response) {
  const body = (await response.json().catch(() => null)) as {
    message?: string;
  } | null;
  return body?.message || "Бараа бүртгэхэд алдаа гарлаа";
}

export function QuickProductCreateModal({
  open,
  markupPercent = "",
  organizationId,
  initialCode,
  initialMaster,
  onClose,
  onCreated,
}: QuickProductCreateModalProps) {
  const [form, setForm] = useState<FormState>(() =>
    createInitialForm(initialCode),
  );
  const [selectedMaster, setSelectedMaster] = useState<MasterCatalogProduct | null>(null);
  const [manualPrice, setManualPrice] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setSelectedMaster(initialMaster ?? null);
    setForm({ ...createInitialForm(initialCode), ...(initialMaster ? {
      name: initialMaster.canonicalName,
      barcode: initialMaster.barcode || "",
      sku: "",
      unit: normalizePosMeasureUnit(initialMaster.unit),
    } : {}) });
    setManualPrice(false);
    setError("");
  }, [initialCode, initialMaster, open]);

  if (!open) return null;

  const update = (field: keyof FormState, value: string) => {
    if (field === "barcode") setSelectedMaster(null);
    if (field === "price") setManualPrice(true);
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "costPrice" && !manualPrice && markupPercent
        ? { price: markedUpPrice(value, markupPercent) }
        : {}),
    }));
    setError("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const price = Number(form.price);
    const costPrice = form.costPrice.trim() ? Number(form.costPrice) : null;
    if (!form.name.trim()) return setError("Барааны нэрийг оруулна уу.");
    if (!form.sku.trim() && !form.barcode.trim()) {
      return setError("SKU эсвэл баркодын аль нэгийг оруулна уу.");
    }
    if (!Number.isFinite(price) || price < 0) {
      return setError("Борлуулах үнийг зөв оруулна уу.");
    }
    if (costPrice !== null && (!Number.isFinite(costPrice) || costPrice < 0)) {
      return setError("Авсан үнийг зөв оруулна уу.");
    }

    setSaving(true);
    setError("");
    try {
      const response = await authFetch(`${API}/products`, {
        method: "POST",
        body: JSON.stringify({
          organizationId,
          masterProductId: selectedMaster?.id ?? null,
          businessCategoryId: selectedMaster?.businessCategoryId ?? null,
          description: selectedMaster?.description ?? null,
          name: form.name.trim(),
          sku: form.sku.trim() || null,
          barcode: form.barcode.trim() || null,
          price,
          costPrice,
          stock: 0,
          unit: form.unit,
          supplyType: "IN_STOCK",
          taxType: "VAT_ABLE",
          cityTaxRate: 0,
          classificationCode: EBARIMT_GROCERY_FALLBACK_CLASSIFICATION_CODE,
          taxProductCode: null,
          marketplacePriority: 0,
          images: selectedMaster?.imageUrl ? [selectedMaster.imageUrl] : [],
        }),
      });
      if (!response.ok) throw new Error(await readError(response));
      onCreated({
        ...((await response.json()) as CreatedReceiptProduct),
        manualReceiptPrice: form.price,
      });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Бараа бүртгэхэд алдаа гарлаа",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-product-title"
      onMouseDown={(event) => !saving && event.target === event.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
          <div className="flex gap-3">
            <span className="rounded-2xl bg-cyan-50 p-3">
              <PackagePlus className="h-5 w-5 text-cyan-700" />
            </span>
            <div>
              <h2
                id="quick-product-title"
                className="text-lg font-black text-slate-950"
              >
                Баримтад шинэ бараа нэмэх
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Нэр, үнийг шалгаад нэмнэ. Хүлээн авах тоог баримтын мөрөнд оруулна.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            aria-label="Хаах"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <div className="sm:col-span-2">
            {selectedMaster ? <div className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800"><span>Нэгдсэн сангаас сонгосон · {selectedMaster.categoryName || "Ангилалгүй"}</span><button type="button" disabled={saving} onClick={() => setSelectedMaster(null)} className="shrink-0 font-semibold underline">Сонголт солих</button></div> : <MasterCatalogSuggestions name={form.name} barcode={form.barcode} selectedId="" disabled={saving} onSelect={(product) => {
              setSelectedMaster(product);
              setForm(current => ({ ...current, name: product.canonicalName, barcode: product.barcode || current.barcode, unit: normalizePosMeasureUnit(product.unit) }));
            }} />}
          </div>
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Барааны нэр *
            </span>
            <input
              autoFocus
              required
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              placeholder="Барааны бүтэн нэр"
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
          <details open={!form.barcode} className="rounded-xl border border-slate-200 p-3 sm:col-span-2">
            <summary className="cursor-pointer text-sm text-slate-600">Баркод: {form.barcode || "Баркодгүй · SKU оруулах"}</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Баркод
            </span>
            <input
              value={form.barcode}
              onChange={(event) => update("barcode", event.target.value)}
              placeholder="Жишээ: 8658000123456"
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              SKU
            </span>
            <input
              value={form.sku}
              onChange={(event) => update("sku", event.target.value)}
              placeholder="Жишээ: TEA-001"
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
            </div>
          </details>
          <label className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Борлуулах үнэ *
            </span>
            <input
              required
              min="0"
              step="0.01"
              type="number"
              value={form.price}
              onChange={(event) => update("price", event.target.value)}
              placeholder="0"
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Авсан үнэ
            </span>
            <input
              min="0"
              step="0.01"
              type="number"
              value={form.costPrice}
              onChange={(event) => update("costPrice", event.target.value)}
              placeholder="Заавал биш"
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Хэмжих нэгж
            </span>
            <select
              value={form.unit}
              onChange={(event) => update("unit", event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            >
              <option value="pcs">Ширхэг</option>
              <option value="kg">Килограмм</option>
            </select>
          </label>
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 sm:col-span-2"
            >
              {error}
            </p>
          )}
        </div>
        <footer className="flex justify-end gap-3 border-t border-slate-100 px-5 py-4 sm:px-6">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Болих
          </button>
          <button
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-black text-white hover:bg-cyan-700 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}Баримтад нэмэх
          </button>
        </footer>
      </form>
    </div>
  );
}
