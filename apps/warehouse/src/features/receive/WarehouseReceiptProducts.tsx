"use client";
import { useRef, useState } from "react";
import { MasterCatalogSuggestions, type MasterCatalogProduct } from "@mgl/ui";
import { API, wmsFetch } from "@/lib/api";
import {
  WarehouseQuickProductCreate,
  type WarehouseProductDraft,
} from "./WarehouseQuickProductCreate";
import { classifyReceiptSearch } from "./receipt-product-search";
import { Search, Loader2, Plus, FileSpreadsheet } from "lucide-react";
import {
  WarehouseVendorProductResults,
  type WarehouseVendorProduct,
} from "./WarehouseVendorProductResults";
import { ReceiptLinesTable, type ReceiptLine } from "@mgl/ui";
import { ReceiptBarcodeEditor } from "./ReceiptBarcodeEditor";
import { ReceiptUnitSelect } from "./ReceiptUnitSelect";
import type { ReceiveItem } from "./receipt-types";
interface Props {
  productSearch: string;
  setProductSearch: (value: string) => void;
  searchResults: WarehouseVendorProduct[];
  searching: boolean;
  searchError: string;
  items: ReceiveItem[];
  onAddBarcode: (id: string, barcode: string) => void;
  onDraftProduct: (query: string, master?: MasterCatalogProduct) => void;
  onDraftChange: (
    id: string,
    field: "name" | "price" | "unit" | "barcode" | "autoCode",
    value: string,
  ) => void;
  selectedProductIds: ReadonlySet<string>;
  warehouseId: string;
  organizationName: string;
  addItem: (product: WarehouseVendorProduct) => void;
  updateQuantity: (id: string, value: number) => void;
  updateCost: (id: string, value: number) => void;
  updateItemMetadata: (
    id: string,
    field: "batchNumber" | "expiryDate" | "location",
    value: string,
  ) => void;
  removeItem: (id: string) => void;
  onCreateProduct: (draft: WarehouseProductDraft) => void;
  onRetrySearch: () => void;
  onImport: () => void;
}
export function WarehouseReceiptProducts({
  productSearch,
  setProductSearch,
  searchResults,
  searching,
  searchError,
  items,
  onDraftProduct,
  onAddBarcode,
  onDraftChange,
  selectedProductIds,
  warehouseId,
  organizationName,
  addItem,
  updateQuantity,
  updateCost,
  updateItemMetadata,
  removeItem,
  onCreateProduct,
  onRetrySearch,
  onImport,
}: Props) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [creation, setCreation] = useState<{
    query: string;
    master?: MasterCatalogProduct;
  } | null>(null);
  const openCreate = (query: string, master?: MasterCatalogProduct) =>
    setCreation({ query, master });
  const hasWarehouse = Boolean(warehouseId);
  const query = productSearch.trim();
  const searchKind = classifyReceiptSearch(query);
  const addEnteredProduct = () => {
    if (!query || !hasWarehouse || searching || searchError) return;
    const exact = searchResults.find(
      (product) =>
        product.barcode === query ||
        product.sku === query ||
        product.barcodeAliases?.includes(query),
    );
    if (exact) addItem(exact);
    else onDraftProduct(query);
  };
  const lines: ReceiptLine[] = items.map((item) => ({
    id: item.productId,
    product: {
      id: item.productId,
      name: item.name,
      sku: item.sku,
      stock: 0,
      unit: item.unit || "pcs",
    },
    quantity: item.quantity,
    unitCost: String(item.cost),
    salePrice: "",
    manualPrice: false,
    batchNumber: item.batchNumber,
    expiryDate: item.expiryDate,
  }));
  return (
    <>
      {/* Product search + list */}
      <div className="border-b border-slate-200 p-4 sm:p-6 [overflow-anchor:none]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <div className="h-1 w-1 rounded-full bg-blue-600" />
            Барааны жагсаалт
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openCreate(query)}
              disabled={!hasWarehouse}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
              Шинэ бараа бүртгэх
            </button>
            <button
              type="button"
              onClick={onImport}
              disabled={!hasWarehouse}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-40"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Excel-ээс оруулах
            </button>
          </div>
        </div>

        {searchError && (
          <div
            role="alert"
            className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700"
          >
            <span>{searchError}</span>
            <button
              type="button"
              onClick={onRetrySearch}
              className="rounded-lg border border-red-200 bg-white px-3 py-2 font-semibold transition hover:bg-red-100"
            >
              Дахин оролдох
            </button>
          </div>
        )}
        {creation && (
          <WarehouseQuickProductCreate
            key={`${warehouseId}:${creation.query}:${creation.master?.id || "new"}`}
            warehouseId={warehouseId}
            organizationName={organizationName}
            query={creation.query}
            master={creation.master}
            onClose={() => setCreation(null)}
            onDetailedCreate={(draft) => {
              setCreation(null);
              onCreateProduct(draft);
            }}
            onCreated={(product) => {
              addItem(product);
              setCreation(null);
            }}
          />
        )}
        {/* Item list */}
        <ReceiptLinesTable
          lines={lines}
          renderUnit={(line) => {
            const item = items.find((item) => item.productId === line.id);
            if (item?.draftProduct)
              return (
                <ReceiptUnitSelect
                  value={item.unit ?? "pcs"}
                  onChange={(value) => onDraftChange(line.id, "unit", value)}
                />
              );
            const unit = item?.unit || "pcs";
            return (
              <span>{unit === "pcs" ? "ш" : unit === "kg" ? "кг" : unit}</span>
            );
          }}
          renderProduct={(line) => {
            const item = items.find((item) => item.productId === line.id);
            if (!item) return null;
            if (!item.draftProduct)
              return (
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{item.name}</span>
                  <ReceiptBarcodeEditor
                    name={item.name}
                    barcode={item.barcode || ""}
                    sku={item.sku || ""}
                    warehouseId={warehouseId}
                    organizationName={organizationName}
                    aliases={item.barcodeAliases}
                    onAddBarcode={(code) => onAddBarcode(item.productId, code)}
                    onChange={() => undefined}
                  />
                </div>
              );
            return (
              <div className="flex items-center gap-2">
                <span
                  title="Баримттай хамт хадгалагдана"
                  className="shrink-0 rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600"
                >
                  Шинэ
                </span>
                <input
                  aria-label="Шинэ барааны нэр"
                  placeholder="Барааны нэр"
                  value={item.name}
                  readOnly={Boolean(item.draftProduct.masterProductId)}
                  onChange={(event) =>
                    onDraftChange(line.id, "name", event.target.value)
                  }
                  className="h-10 min-w-40 flex-1 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500"
                />
                <ReceiptBarcodeEditor
                  name={item.name}
                  organizationName={organizationName}
                  warehouseId={warehouseId}
                  barcode={item.draftProduct.barcode}
                  aliases={item.barcodeAliases}
                  onAddBarcode={(code) => onAddBarcode(item.productId, code)}
                  sku={item.sku || ""}
                  onChange={(field, value) =>
                    onDraftChange(line.id, field, value)
                  }
                />
              </div>
            );
          }}
          onAddProduct={() =>
            query ? addEnteredProduct() : searchInputRef.current?.focus()
          }
          productSearch={
            <div className="min-w-64">
              <label htmlFor="receipt-product-search" className="sr-only">
                Бараа хайх
              </label>
              <p id="receipt-search-help" className="sr-only">
                Баркод уншуулах эсвэл нэр, SKU кодоор хайна уу. Олдохгүй бол
                нэгдсэн сангаас шалгана. Баркодгүй барааг нэрээр нь бүртгэж
                болно.
              </p>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-[22px] h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  id="receipt-product-search"
                  aria-describedby="receipt-search-help"
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setCreation(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" || event.nativeEvent.isComposing)
                      return;
                    event.preventDefault();
                    addEnteredProduct();
                  }}
                  aria-label="Нэр, SKU эсвэл баркодоор бараа хайх"
                  placeholder="Барааны нэр, баркод эсвэл SKU код"
                  className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-[22px] h-4 w-4 -translate-y-1/2 animate-spin text-blue-500" />
                )}
              </div>
              <button
                type="button"
                onClick={addEnteredProduct}
                disabled={
                  !query || !hasWarehouse || searching || Boolean(searchError)
                }
                className="mt-2 inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Plus size={14} aria-hidden="true" /> Шууд нэмэх
              </button>
            </div>
          }
          total={items.reduce(
            (sum, item) => sum + item.quantity * item.cost,
            0,
          )}
          showSalePrice={items.some((item) => Boolean(item.draftProduct))}
          renderSalePrice={(line) => {
            const item = items.find((item) => item.productId === line.id);
            if (!item?.draftProduct)
              return <span className="text-slate-400">—</span>;
            return (
              <input
                aria-label={`${item.name || "Шинэ бараа"} зарах үнэ`}
                type="number"
                inputMode="decimal"
                min="0"
                max="1000000000"
                step="0.01"
                placeholder="Оруулах"
                value={item.draftProduct.price}
                onChange={(event) =>
                  onDraftChange(line.id, "price", event.target.value)
                }
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-right text-sm tabular-nums outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            );
          }}
          onQuantity={updateQuantity}
          onRemove={removeItem}
          onField={(id, field, value) => {
            if (field === "unitCost")
              updateCost(id, Math.max(0, Number(value) || 0));
            else if (field === "batchNumber" || field === "expiryDate")
              updateItemMetadata(id, field, value);
          }}
          renderMetadata={(line) => (
            <label>
              Байрлал
              <input
                value={
                  items.find((item) => item.productId === line.id)?.location ||
                  ""
                }
                onChange={(event) =>
                  updateItemMetadata(line.id, "location", event.target.value)
                }
                placeholder="A-1-3"
                className="mt-1 block h-10 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-cyan-500"
              />
            </label>
          )}
        />
        {!creation && query.length >= 2 && (
          <section
            aria-label="Барааны хайлтын санал"
            className="mt-3 h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 [overflow-anchor:none]"
          >
            {searching ? (
              <p role="status" className="p-3 text-sm text-slate-500">
                Бараа хайж байна…
              </p>
            ) : searchError ? (
              <p className="p-3 text-sm text-red-600">{searchError}</p>
            ) : searchResults.length > 0 ? (
              <WarehouseVendorProductResults
                inline
                products={searchResults}
                selectedIds={selectedProductIds}
                onSelect={addItem}
              />
            ) : (
              <MasterCatalogSuggestions
                key={query}
                apiBase={API}
                fetcher={wmsFetch}
                name={query}
                barcode={searchKind === "barcode" ? query : ""}
                selectedId=""
                onSelect={(master) => onDraftProduct(query, master)}
              />
            )}
          </section>
        )}
      </div>
    </>
  );
}
