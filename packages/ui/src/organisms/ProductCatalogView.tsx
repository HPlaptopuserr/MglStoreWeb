"use client";

import { ProductCatalogGrid } from "./ProductCatalogGrid";
import { ProductCatalogList } from "./ProductCatalogList";
import { ProductCatalogViewToggle } from "./ProductCatalogViewToggle";
import type {
  ProductCatalogLabels,
  ProductCatalogViewProps,
} from "./product-catalog.types";

const DEFAULT_LABELS: ProductCatalogLabels = {
  name: "Бараа",
  code: "Код",
  category: "Ангилал",
  price: "Үнэ",
  stock: "Нөөц",
  expiry: "Дуусах",
  status: "Төлөв",
};

export function ProductCatalogView({
  items,
  view,
  onViewChange,
  onItemClick,
  renderActions,
  disabledIds,
  emptyState,
  toolbar,
  compact = true,
  hideViewToggle = false,
  listLabels,
}: ProductCatalogViewProps) {
  if (items.length === 0) return <>{emptyState ?? null}</>;

  const itemProps = { items, onItemClick, renderActions, disabledIds };

  return (
    <div className="space-y-2.5">
      {(toolbar || (!hideViewToggle && onViewChange)) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">{toolbar}</div>
          {!hideViewToggle && onViewChange && (
            <ProductCatalogViewToggle value={view} onChange={onViewChange} />
          )}
        </div>
      )}

      {view === "grid" ? (
        <ProductCatalogGrid {...itemProps} />
      ) : (
        <ProductCatalogList
          {...itemProps}
          compact={compact}
          labels={{ ...DEFAULT_LABELS, ...listLabels }}
        />
      )}
    </div>
  );
}

export type {
  ProductCatalogItem,
  ProductCatalogStatusTone,
  ProductCatalogViewMode,
  ProductCatalogViewProps,
} from "./product-catalog.types";
