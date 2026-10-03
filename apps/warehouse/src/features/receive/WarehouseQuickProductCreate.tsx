"use client";

import { useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import type { MasterCatalogProduct } from "@mgl/ui";
import { API, wmsFetch } from "@/lib/api";
import SkuGenerator from "@/components/SkuGenerator";
import type { WarehouseVendorProduct } from "./WarehouseVendorProductResults";
import { classifyReceiptSearch } from "./receipt-product-search";

export interface WarehouseProductDraft {
  name: string;
  barcode: string;
  sku: string;
  costPrice: string;
  price: string;
}

interface Props {
  query: string;
  master?: MasterCatalogProduct;
  warehouseId: string;
  organizationName: string;
  onClose: () => void;
  onDetailedCreate: (draft: WarehouseProductDraft) => void;
  onCreated: (product: WarehouseVendorProduct) => void;
}
const inputClass =
  "mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100";

export function WarehouseQuickProductCreate({
  query,
  master,
  warehouseId,
  organizationName,
  onClose,
  onDetailedCreate,
  onCreated,
}: Props) {
  const kind = classifyReceiptSearch(query);
  const [name, setName] = useState(
    master?.canonicalName || (kind === "name" ? query.trim() : ""),
  );
  const [barcode, setBarcode] = useState(
    master?.barcode || (kind === "barcode" ? query.trim() : ""),
  );
  const [sku, setSku] = useState(kind === "sku" ? query.trim() : "");
  const [skuMode, setSkuMode] = useState<"automatic" | "manual">(
    kind === "sku" ? "manual" : "automatic",
  );
  const [cost, setCost] = useState("");
  const [price, setPrice] = useState(
    master?.suggestedPrice != null ? String(master.suggestedPrice) : "",
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const costValue = Number(cost);
    const priceValue = Number(price);
    if (
      !warehouseId ||
      !name.trim() ||
      !sku.trim() ||
      !cost.trim() ||
      !price.trim() ||
      !Number.isFinite(costValue) ||
      costValue < 0 ||
      costValue > 1000000000 ||
      !Number.isFinite(priceValue) ||
      priceValue < 0 ||
      priceValue > 1000000000
    ) {
      setError("Барааны нэр, SKU, авсан болон зарах үнийг зөв оруулна уу.");
      return;
    }
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      const response = await wmsFetch(
        `${API}/warehouses/${encodeURIComponent(warehouseId)}/products`,
        {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            masterProductId: master?.id,
            barcode: barcode.trim() || null,
            sku: sku.trim(),
            price: priceValue,
            costPrice: costValue,
            quantity: 0,
            unit: master?.unit || "pcs",
            description: master?.description || null,
            businessCategoryId: master?.businessCategoryId || null,
            images: master?.imageUrl ? [master.imageUrl] : [],
          }),
        },
      );
      const data = (await response.json()) as WarehouseVendorProduct & {
        message?: string;
      };
      if (!response.ok)
        throw new Error(data.message || "Бараа бүртгэхэд алдаа гарлаа.");
      onCreated({ ...data, price: String(costValue) });
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Бараа бүртгэхэд алдаа гарлаа.",
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mb-5 rounded-xl border border-cyan-200 bg-cyan-50/40 p-4 sm:p-5"
      aria-label="Бараа хурдан бүртгэх"
    >
      <fieldset disabled={saving} className="min-w-0">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900">
              {master ? "Нэгдсэн сангаас бараа нэмэх" : "Шинэ бараа бүртгэх"}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Нэр, авсан болон зарах үнээ оруулаад нэмнэ. Тоо хэмжээг баримтын
              мөрөнд засна.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Бүртгэлийг хаах"
            className="rounded-lg p-2 text-slate-500 hover:bg-white"
          >
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600">
            Барааны нэр *
            <input
              autoFocus
              required
              maxLength={200}
              value={name}
              readOnly={Boolean(master)}
              onChange={(event) => setName(event.target.value)}
              className={inputClass}
              placeholder="Жишээ: Гэрийн боорцог"
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Авсан үнэ / нэгжийн өртөг ₮ *
            <input
              required
              type="number"
              min="0"
              max="1000000000"
              step="0.01"
              value={cost}
              onChange={(event) => setCost(event.target.value)}
              className={inputClass}
              placeholder="0"
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Зарах үнэ ₮ *
            <input
              required
              type="number"
              min="0"
              max="1000000000"
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className={inputClass}
              placeholder="0"
            />
          </label>
        </div>
        <section
          className="mt-4 rounded-lg border border-slate-200 bg-white p-4"
          aria-label="SKU код үүсгэх"
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-pressed={skuMode === "automatic"}
              onClick={() => setSkuMode("automatic")}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${skuMode === "automatic" ? "bg-cyan-50 text-cyan-700" : "text-slate-500 hover:bg-slate-50"}`}
            >
              SKU автоматаар үүсгэх
            </button>
            <button
              type="button"
              aria-pressed={skuMode === "manual"}
              onClick={() => setSkuMode("manual")}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${skuMode === "manual" ? "bg-cyan-50 text-cyan-700" : "text-slate-500 hover:bg-slate-50"}`}
            >
              SKU гараар оруулах
            </button>
          </div>
          {skuMode === "automatic" ? (
            <SkuGenerator
              productName={name}
              organizationName={organizationName}
              warehouseId={warehouseId}
              value={sku}
              onChange={setSku}
            />
          ) : (
            <label className="text-xs font-semibold text-slate-600">
              SKU · дотоод код
              <input
                required
                maxLength={80}
                value={sku}
                onChange={(event) => setSku(event.target.value)}
                className={inputClass}
              />
            </label>
          )}
        </section>
        <details className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
          <summary className="cursor-pointer text-sm font-semibold text-slate-600">
            Баркод · {barcode ? `Баркод: ${barcode}` : "Баркодгүй"}
          </summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600">
              Баркод · заавал биш
              <input
                value={barcode}
                readOnly={Boolean(master)}
                maxLength={100}
                onChange={(event) => setBarcode(event.target.value)}
                className={inputClass}
                placeholder="Баркодгүй бол хоосон үлдээнэ"
              />
            </label>
          </div>
        </details>
        {!master && (
          <button
            type="button"
            onClick={() =>
              onDetailedCreate({ name, barcode, sku, costPrice: cost, price })
            }
            className="mt-4 text-sm font-semibold text-cyan-700 underline underline-offset-4 transition hover:text-cyan-900"
          >
            Зураг, ангилал болон нэмэлт мэдээлэл оруулах
          </button>
        )}
        {error && (
          <p
            role="alert"
            className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700"
          >
            {error}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-sm text-xs text-slate-500">
            Үлдэгдэл нь орлогын баримтыг баталгаажуулахад нэмэгдэнэ.
          </p>
          <button
            disabled={saving || !warehouseId}
            type="submit"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-cyan-600 px-4 text-sm font-bold text-white hover:bg-cyan-700 disabled:opacity-50"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? "Бүртгэж байна…" : "Бүртгээд баримтад нэмэх"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
