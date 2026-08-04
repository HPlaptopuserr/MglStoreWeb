"use client";

import { useMemo, useState } from "react";
import { Check, Plus } from "lucide-react";
import {
  ProductCatalogView,
  type ProductCatalogItem,
  type ProductCatalogViewMode,
} from "@mgl/ui";

export interface WarehouseVendorProduct {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: string;
  stock: number;
  images?: { url: string }[];
}

interface Props {
  products: WarehouseVendorProduct[];
  selectedIds: ReadonlySet<string>;
  onSelect: (product: WarehouseVendorProduct) => void;
}

function toCatalogItem(product: WarehouseVendorProduct): ProductCatalogItem {
  return {
    id: product.id,
    name: product.name,
    imageUrl: product.images?.[0]?.url ?? null,
    code: product.sku,
    barcode: product.barcode,
    price: product.price,
    stock: product.stock,
  };
}

export function WarehouseVendorProductResults({
  products,
  selectedIds,
  onSelect,
}: Props) {
  const [view, setView] = useState<ProductCatalogViewMode>("list");
  const items = useMemo(() => products.map(toCatalogItem), [products]);
  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  return (
    <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-[440px] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-2xl shadow-slate-300/40">
      <ProductCatalogView
        items={items}
        view={view}
        onViewChange={setView}
        compact
        disabledIds={selectedIds}
        onItemClick={(item) => {
          const product = productsById.get(item.id);
          if (product) onSelect(product);
        }}
        renderActions={(item) =>
          selectedIds.has(item.id) ? (
            <Check className="h-4 w-4 text-slate-400" aria-label="Нэмсэн" />
          ) : (
            <Plus className="h-4 w-4 text-blue-600" aria-label="Нэмэх" />
          )
        }
        listLabels={{ name: "Vendor бараа", code: "SKU / Barcode" }}
      />
    </div>
  );
}
