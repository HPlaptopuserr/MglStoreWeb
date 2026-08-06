"use client";

import { useState } from "react";
import {
  CalendarDays,
  Grid2X2,
  List,
  MapPin,
  Pencil,
} from "lucide-react";
import { ProductThumbnail } from "./ProductThumbnail";

export interface WarehouseCatalogInventoryItem {
  id: string;
  quantity: number;
  minQuantity: number;
  maxQuantity: number | null;
  location: string | null;
  expiryDate: string | null;
  product: {
    name: string;
    sku: string | null;
    barcode: string | null;
    price: string;
    images: { url: string }[];
  };
}

interface WarehouseInventoryCatalogProps {
  items: WarehouseCatalogInventoryItem[];
  onSelect: (itemId: string) => void;
  onEdit: (itemId: string) => void;
}

type ViewMode = "list" | "grid";
type StatusTone = "healthy" | "low" | "out";

interface InventoryStatus {
  label: string;
  tone: StatusTone;
}

const STATUS_STYLES: Record<StatusTone, string> = {
  healthy: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  low: "bg-amber-50 text-amber-700 ring-amber-200",
  out: "bg-red-50 text-red-700 ring-red-200",
};

function getStatus(item: WarehouseCatalogInventoryItem): InventoryStatus {
  if (item.quantity === 0) return { label: "Дууссан", tone: "out" };
  if (item.quantity <= item.minQuantity) {
    return { label: "Дутагдал", tone: "low" };
  }
  return { label: "Хэвийн", tone: "healthy" };
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString("mn-MN")
    : "—";
}

function formatPrice(value: string) {
  const price = Number(value);
  return Number.isFinite(price) ? `₮${price.toLocaleString()}` : "—";
}

function StatusBadge({ status }: { status: InventoryStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ring-1 ${STATUS_STYLES[status.tone]}`}
    >
      {status.label}
    </span>
  );
}

function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-pressed={value === "list"}
        className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition ${
          value === "list"
            ? "bg-indigo-600 text-white"
            : "text-slate-500 hover:bg-slate-50"
        }`}
      >
        <List size={15} />
        Жагсаалт
      </button>
      <button
        type="button"
        onClick={() => onChange("grid")}
        aria-pressed={value === "grid"}
        className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition ${
          value === "grid"
            ? "bg-indigo-600 text-white"
            : "text-slate-500 hover:bg-slate-50"
        }`}
      >
        <Grid2X2 size={15} />
        Grid
      </button>
    </div>
  );
}

function EditButton({
  item,
  onEdit,
}: {
  item: WarehouseCatalogInventoryItem;
  onEdit: (itemId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onEdit(item.id)}
      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-indigo-100 hover:text-indigo-700"
      aria-label={`${item.product.name} засах`}
    >
      <Pencil size={15} />
    </button>
  );
}

function InventoryList({
  items,
  onSelect,
  onEdit,
}: WarehouseInventoryCatalogProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="hidden grid-cols-[minmax(240px,2fr)_minmax(130px,1fr)_minmax(120px,1fr)_110px_80px_110px_100px_44px] items-center gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-2.5 text-[11px] font-black uppercase tracking-wider text-slate-500 lg:grid">
        <span>Бараа</span>
        <span>Код</span>
        <span>Байрлал</span>
        <span className="text-right">Үнэ</span>
        <span className="text-right">Нөөц</span>
        <span>Дуусах</span>
        <span>Төлөв</span>
        <span />
      </div>
      <div className="divide-y divide-slate-100">
        {items.map((item) => {
          const status = getStatus(item);
          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(item.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(item.id);
                }
              }}
              className="group grid min-w-0 cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 transition hover:bg-indigo-50/50 focus:bg-indigo-50/50 focus:outline-none lg:grid-cols-[minmax(240px,2fr)_minmax(130px,1fr)_minmax(120px,1fr)_110px_80px_110px_100px_44px] lg:px-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <ProductThumbnail
                  imageUrl={item.product.images[0]?.url}
                  productName={item.product.name}
                  className="h-9 w-9"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900">
                    {item.product.name}
                  </p>
                  <p className="truncate text-[11px] font-medium text-slate-400 lg:hidden">
                    {item.product.sku || item.product.barcode || "Кодгүй"}
                  </p>
                </div>
              </div>
              <div className="hidden min-w-0 lg:block">
                <p className="truncate font-mono text-xs font-semibold text-slate-600">
                  {item.product.sku || "—"}
                </p>
                {item.product.barcode && (
                  <p className="truncate font-mono text-[10px] text-slate-400">
                    {item.product.barcode}
                  </p>
                )}
              </div>
              <p className="hidden truncate text-xs font-semibold text-slate-600 lg:block">
                {item.location || "Байрлалгүй"}
              </p>
              <p className="hidden text-right text-sm font-black text-slate-900 lg:block">
                {formatPrice(item.product.price)}
              </p>
              <p className="hidden text-right text-sm font-bold text-slate-700 lg:block">
                {item.quantity.toLocaleString()}
              </p>
              <p className="hidden truncate text-xs font-semibold text-slate-500 lg:block">
                {formatDate(item.expiryDate)}
              </p>
              <div className="hidden lg:block">
                <StatusBadge status={status} />
              </div>
              <div
                className="flex items-center justify-end opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <EditButton item={item} onEdit={onEdit} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InventoryGrid({
  items,
  onSelect,
  onEdit,
}: WarehouseInventoryCatalogProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {items.map((item) => {
        const status = getStatus(item);
        return (
          <article
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(item.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(item.id);
              }
            }}
            className="group min-w-0 cursor-pointer rounded-2xl border border-slate-200 bg-white p-2.5 transition hover:border-indigo-300 hover:bg-indigo-50/30 hover:shadow-md focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <ProductThumbnail
              imageUrl={item.product.images[0]?.url}
              productName={item.product.name}
              className="h-32 w-full rounded-xl"
              size={384}
              quality={65}
            />
            <div className="px-1 pb-1 pt-2.5">
              <div className="flex min-w-0 items-start gap-2">
                <h3 className="min-w-0 flex-1 truncate text-sm font-black text-slate-900">
                  {item.product.name}
                </h3>
                <div
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <EditButton item={item} onEdit={onEdit} />
                </div>
              </div>
              <p className="mt-1 truncate font-mono text-[11px] font-semibold text-slate-400">
                {item.product.sku || item.product.barcode || "Кодгүй"}
              </p>
              <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                <MapPin size={12} />
                <span className="truncate">{item.location || "Байрлалгүй"}</span>
              </div>
              {item.expiryDate && (
                <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                  <CalendarDays size={12} />
                  <span>{formatDate(item.expiryDate)}</span>
                </div>
              )}
              <div className="mt-3 flex items-end justify-between gap-2">
                <div>
                  <p className="text-sm font-black text-slate-900">
                    {formatPrice(item.product.price)}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                    Нөөц: {item.quantity.toLocaleString()}
                  </p>
                </div>
                <StatusBadge status={status} />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function WarehouseInventoryCatalog(
  props: WarehouseInventoryCatalogProps,
) {
  const [view, setView] = useState<ViewMode>("list");

  return (
    <div className="space-y-2.5">
      <div className="flex justify-end">
        <ViewToggle value={view} onChange={setView} />
      </div>
      {view === "list" ? (
        <InventoryList {...props} />
      ) : (
        <InventoryGrid {...props} />
      )}
    </div>
  );
}
