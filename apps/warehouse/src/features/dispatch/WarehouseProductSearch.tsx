"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AlertCircle, Loader2, Search } from "lucide-react";
import { API, wmsFetch } from "@/lib/api";
import { ProductThumbnail } from "@/features/inventory/ProductThumbnail";

function formatMoney(value: string) {
  const price = Number(value);
  return Number.isFinite(price) && price > 0
    ? `${price.toLocaleString("mn-MN")}₮`
    : "Үнэ тохируулаагүй";
}

export interface WarehouseInventorySearchItem {
  id: string;
  quantity: number;
  minQuantity: number;
  product: {
    id: string;
    name: string;
    sku: string | null;
    barcode: string | null;
    price: string;
    images?: Array<{ id: string; url: string }>;
  };
}

interface WarehouseProductSearchProps {
  warehouseId: string;
  excludedProductIds: ReadonlySet<string>;
  onSelect: (item: WarehouseInventorySearchItem) => void;
}

interface InventorySearchResponse {
  inventory?: WarehouseInventorySearchItem[];
}

const SEARCH_DELAY_MS = 250;

export function WarehouseProductSearch({
  warehouseId,
  excludedProductIds,
  onSelect,
}: WarehouseProductSearchProps) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WarehouseInventorySearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const trimmedQuery = query.trim();

  useEffect(() => {
    if (!warehouseId || !trimmedQuery) {
      setResults([]);
      setLoading(false);
      setError("");
      setActiveIndex(-1);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          page: "1",
          limit: "10",
          status: "all",
          smartSearch: "true",
          search: trimmedQuery,
        });
        const response = await wmsFetch(
          `${API}/warehouses/${warehouseId}/inventory?${params}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("SEARCH_FAILED");
        const payload = (await response.json()) as InventorySearchResponse;
        const available = (payload.inventory ?? []).filter(
          (item) =>
            item.quantity > 0 && !excludedProductIds.has(item.product.id),
        );
        setResults(available);
        setActiveIndex(available.length > 0 ? 0 : -1);
      } catch (requestError) {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        )
          return;
        setResults([]);
        setError("Бараа хайхад алдаа гарлаа. Дахин оролдоно уу.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, SEARCH_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [excludedProductIds, trimmedQuery, warehouseId]);

  const select = (item: WarehouseInventorySearchItem) => {
    onSelect(item);
    setQuery("");
    setResults([]);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const hasNoResults =
    trimmedQuery.length > 0 && !loading && !error && results.length === 0;

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
      <input
        ref={inputRef}
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={results.length > 0 || hasNoResults || Boolean(error)}
        aria-activedescendant={
          activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined
        }
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && results.length > 0) {
            event.preventDefault();
            setActiveIndex((index) => (index + 1) % results.length);
          } else if (event.key === "ArrowUp" && results.length > 0) {
            event.preventDefault();
            setActiveIndex((index) =>
              index <= 0 ? results.length - 1 : index - 1,
            );
          } else if (event.key === "Enter" && activeIndex >= 0) {
            event.preventDefault();
            const item = results[activeIndex];
            if (item) select(item);
          } else if (event.key === "Escape") {
            setResults([]);
            setActiveIndex(-1);
          }
        }}
        disabled={!warehouseId}
        placeholder="Нэр, SKU эсвэл баркодоор хайх..."
        className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-11 text-sm shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/70 disabled:cursor-not-allowed disabled:opacity-60"
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-500" />
      )}

      {(results.length > 0 || hasNoResults || error) && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-900/10"
        >
          {error ? (
            <div
              role="alert"
              className="flex items-center gap-2 px-3 py-3 text-sm text-red-600"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : hasNoResults ? (
            <p className="px-3 py-4 text-center text-sm text-slate-500">
              Нөөцтэй тохирох бараа олдсонгүй
            </p>
          ) : (
            results.map((item, index) => (
              <button
                id={`${listboxId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                type="button"
                key={item.id}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => select(item)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                  index === activeIndex ? "bg-blue-50" : "hover:bg-slate-50"
                }`}
              >
                <ProductThumbnail
                  imageUrl={item.product.images?.[0]?.url}
                  productName={item.product.name}
                  className="h-11 w-11 rounded-xl"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-slate-900">
                    {item.product.name}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {[item.product.sku, item.product.barcode]
                      .filter(Boolean)
                      .join(" · ") || "Кодгүй"}
                  </span>
                  <span
                    className={`mt-1 block text-xs font-semibold ${Number(item.product.price) > 0 ? "text-blue-700" : "text-amber-600"}`}
                  >
                    {formatMoney(item.product.price)}
                  </span>
                </span>
                <span className="ml-3 shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                  Нөөц: {item.quantity}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
