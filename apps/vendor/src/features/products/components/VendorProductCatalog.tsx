"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Loader2, Pencil, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import {
  ProductCatalogView,
  type ProductCatalogItem,
  type ProductCatalogViewMode,
} from "@mgl/ui";
import type { Product } from "../types";

interface Props {
  products: Product[];
  deletingId: string | null;
  onSelect: (product: Product) => void;
  onEdit: (product: Product) => void;
  onToggleActive: (product: Product) => void;
  onDelete: (productId: string) => void;
  toolbar?: ReactNode;
}

function formatExpiryDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString("mn-MN")
    : null;
}

function toCatalogItem(product: Product): ProductCatalogItem {
  const receiptLotCount = product.receiptLots?.length || 0;
  const expiryDate =
    product.supplyType !== "CHINA_PREORDER"
      ? formatExpiryDate(product.expiryDate)
      : null;

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    imageUrl: product.images[0]?.url ?? null,
    code: product.sku,
    barcode: product.barcode,
    category: product.businessCategory?.name ?? null,
    price: product.price,
    secondaryPrice: product.costPrice,
    stock: product.stock,
    expiry:
      expiryDate && receiptLotCount > 0
        ? `${expiryDate} · ${receiptLotCount} парт`
        : expiryDate ||
          (receiptLotCount > 0 ? `${receiptLotCount} парт` : null),
    statusLabel: product.isActive ? "Идэвхтэй" : "Идэвхгүй",
    statusTone: product.isActive ? "success" : "neutral",
    badge:
      product.supplyType === "CHINA_PREORDER"
        ? "Хятадаас захиалгаар"
        : product.marketplacePriority > 0
          ? `Эхэнд #${product.marketplacePriority}`
          : null,
  };
}

export function VendorProductCatalog({
  products,
  deletingId,
  onSelect,
  onEdit,
  onToggleActive,
  onDelete,
  toolbar,
}: Props) {
  const [view, setView] = useState<ProductCatalogViewMode>("list");
  const items = useMemo(() => products.map(toCatalogItem), [products]);
  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  return (
    <ProductCatalogView
      items={items}
      view={view}
      onViewChange={setView}
      toolbar={toolbar}
      onItemClick={(item) => {
        const product = productsById.get(item.id);
        if (product) onSelect(product);
      }}
      renderActions={(item) => {
        const product = productsById.get(item.id);
        if (!product) return null;

        return (
          <div className="flex items-center gap-0.5 opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100">
            <button
              type="button"
              onClick={() => onEdit(product)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-indigo-100 hover:text-indigo-700"
              aria-label={`${product.name} засах`}
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              onClick={() => onToggleActive(product)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label={
                product.isActive
                  ? `${product.name} идэвхгүй болгох`
                  : `${product.name} идэвхжүүлэх`
              }
            >
              {product.isActive ? (
                <ToggleLeft size={15} />
              ) : (
                <ToggleRight size={15} />
              )}
            </button>
            <button
              type="button"
              onClick={() => onDelete(product.id)}
              disabled={deletingId === product.id}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              aria-label={`${product.name} устгах`}
            >
              {deletingId === product.id ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Trash2 size={15} />
              )}
            </button>
          </div>
        );
      }}
    />
  );
}
