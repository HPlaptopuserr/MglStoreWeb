"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Barcode,
  Check,
  Database,
  ImageIcon,
  Loader2,
  PackagePlus,
  X,
} from "lucide-react";
import { registerProductFromPos } from "../api/product-registration";
import type { PosProduct } from "../types/pos.types";
import type { SharedCatalogSuggestion } from "../types/product-registration.types";

interface UnknownBarcodeDialogProps {
  open: boolean;
  barcode: string;
  organizationId: string;
  suggestions: SharedCatalogSuggestion[];
  lookupLoading: boolean;
  lookupError: string;
  onClose: () => void;
  onCreated: (product: PosProduct) => void;
}

const toNonNegativeNumber = (value: string) => {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};

export function UnknownBarcodeDialog({
  open,
  barcode,
  organizationId,
  suggestions,
  lookupLoading,
  lookupError,
  onClose,
  onCreated,
}: UnknownBarcodeDialogProps) {
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const selectedSuggestion = useMemo(
    () => suggestions.find((suggestion) => suggestion.id === selectedId) ?? null,
    [selectedId, suggestions],
  );

  useEffect(() => {
    if (!open) return;
    setSelectedId("");
    setName("");
    setPrice("");
    setCostPrice("");
    setStock("1");
    setSaveError("");
  }, [barcode, open]);

  useEffect(() => {
    if (suggestions.length !== 1 || selectedId) return;
    setSelectedId(suggestions[0].id);
    setName(suggestions[0].canonicalName);
  }, [selectedId, suggestions]);

  if (!open) return null;

  const selectSuggestion = (suggestion: SharedCatalogSuggestion) => {
    setSelectedId(suggestion.id);
    setName(suggestion.canonicalName);
    setSaveError("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsedPrice = toNonNegativeNumber(price);
    const parsedCostPrice = costPrice.trim() ? toNonNegativeNumber(costPrice) : null;
    const parsedStock = toNonNegativeNumber(stock);

    if (!organizationId) return setSaveError("Байгууллагын мэдээлэл олдсонгүй");
    if (!name.trim()) return setSaveError("Барааны нэр оруулна уу");
    if (parsedPrice === null) return setSaveError("Борлуулах үнэ зөв оруулна уу");
    if (costPrice.trim() && parsedCostPrice === null)
      return setSaveError("Өртөг үнэ зөв оруулна уу");
    if (parsedStock === null || !Number.isInteger(parsedStock))
      return setSaveError("Эхний үлдэгдлийг бүхэл тоогоор оруулна уу");

    setSaving(true);
    setSaveError("");
    try {
      const product = await registerProductFromPos({
        organizationId,
        masterProductId: selectedSuggestion?.id ?? null,
        name,
        barcode,
        price: parsedPrice,
        costPrice: parsedCostPrice,
        stock: parsedStock,
        imageUrl: selectedSuggestion?.imageUrl ?? null,
      });
      onCreated(product);
    } catch (error: unknown) {
      setSaveError(error instanceof Error ? error.message : "Бараа бүртгэхэд алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="unknown-barcode-title"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex min-w-0 gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <PackagePlus size={22} />
            </span>
            <div>
              <h2 id="unknown-barcode-title" className="text-xl font-black text-slate-950">
                Бараа танай санд бүртгэлгүй байна
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                <Barcode size={15} /> {barcode}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Цонх хаах"
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </header>

        <form onSubmit={submit} className="min-h-0 overflow-y-auto">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.05fr_0.95fr]">
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Database size={17} className="text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900">Нэгдсэн сангийн санал</h3>
              </div>

              {lookupLoading ? (
                <div className="flex min-h-36 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50/60 text-sm font-bold text-indigo-700">
                  <Loader2 size={18} className="mr-2 animate-spin" /> Barcode хайж байна…
                </div>
              ) : lookupError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
                  {lookupError}
                </div>
              ) : suggestions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                  <p className="text-sm font-black text-slate-800">Нэгдсэн сангаас олдсонгүй</p>
                  <p className="mt-1 text-xs text-slate-500">Нэрийг гараар оруулж шинэ ерөнхий мэдээлэл үүсгэнэ.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {suggestions.map((suggestion) => {
                    const selected = selectedId === suggestion.id;
                    return (
                      <button
                        key={suggestion.id}
                        type="button"
                        onClick={() => selectSuggestion(suggestion)}
                        aria-pressed={selected}
                        className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                          selected
                            ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100"
                            : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                        }`}
                      >
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                          {suggestion.imageUrl ? (
                            <img src={suggestion.imageUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon size={19} className="text-slate-300" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-black text-slate-950">{suggestion.canonicalName}</span>
                          <span className="block truncate text-xs font-medium text-slate-500">
                            {[suggestion.brand, suggestion.unit, suggestion.categoryName].filter(Boolean).join(" · ") || "Ерөнхий мэдээлэл"}
                          </span>
                          <span className="mt-1 block text-[11px] font-bold text-indigo-600">{suggestion.usageCount} дэлгүүр ашиглаж байна</span>
                        </span>
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full ${selected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                          <Check size={15} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                Энд бусад байгууллагын үнэ, өртөг, үлдэгдэл харагдахгүй. Зөвхөн бүтээгдэхүүний нийтлэг мэдээллийг ашиглана.
              </p>
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div>
                <label htmlFor="quick-product-name" className="mb-1.5 block text-xs font-black text-slate-700">Барааны нэр *</label>
                <input
                  id="quick-product-name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setSelectedId("");
                  }}
                  placeholder="Жишээ: Цэвэр ус 500 мл"
                  autoComplete="off"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="quick-product-price" className="mb-1.5 block text-xs font-black text-slate-700">Зарах үнэ *</label>
                  <input id="quick-product-price" inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold tabular-nums outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" />
                </div>
                <div>
                  <label htmlFor="quick-product-cost" className="mb-1.5 block text-xs font-black text-slate-700">Өртөг үнэ</label>
                  <input id="quick-product-cost" inputMode="decimal" value={costPrice} onChange={(event) => setCostPrice(event.target.value)} placeholder="0" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold tabular-nums outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" />
                </div>
              </div>
              <div>
                <label htmlFor="quick-product-stock" className="mb-1.5 block text-xs font-black text-slate-700">Эхний үлдэгдэл *</label>
                <input id="quick-product-stock" inputMode="numeric" value={stock} onChange={(event) => setStock(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold tabular-nums outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" />
              </div>
              {saveError ? (
                <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" /> {saveError}
                </div>
              ) : null}
            </section>
          </div>

          <footer className="flex items-center justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
            <button type="button" onClick={onClose} disabled={saving} className="h-11 rounded-xl px-5 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50">Алгасах</button>
            <button type="submit" disabled={saving || lookupLoading} className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-black text-white shadow-lg transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? <Loader2 size={17} className="mr-2 animate-spin" /> : <PackagePlus size={17} className="mr-2" />}
              Өөрийн санд оруулах
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
