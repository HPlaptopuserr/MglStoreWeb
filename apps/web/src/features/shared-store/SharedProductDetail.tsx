"use client";
import { StoreDialog } from "./StoreDialog";
import { money, type SharedProduct } from "./types";
export function SharedProductDetail({
  product,
  onAdd,
  onClose,
}: {
  product: SharedProduct;
  onAdd: () => void;
  onClose: () => void;
}) {
  return (
    <StoreDialog title="Барааны дэлгэрэнгүй" onClose={onClose}>
      <p className="text-xs font-bold text-emerald-700">
        {product.businessCategory?.name || "Дундын дэлгүүр"}
      </p>
      <h3 className="mt-3 text-2xl font-bold">{product.name}</h3>
      <p className="mt-3 text-2xl font-black">{money(product.price)}</p>
      <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-500">
        {product.description || "Дэлгэрэнгүй мэдээллийг дэлгүүрээс лавлана уу."}
      </p>
      <div className="mt-5 space-y-2 rounded-2xl bg-slate-50 p-4 text-xs text-slate-600">
        <p>
          Үлдэгдэл: {product.stock}{" "}
          {product.unit === "pcs" ? "ш" : product.unit || "ш"}
        </p>
        {product.sku && <p>Код: {product.sku}</p>}
        <p>{product.warehouse?.name}</p>
        <p>{product.warehouse?.address}</p>
        {product.warehouse?.phone && (
          <a
            href={`tel:${product.warehouse.phone}`}
            className="block font-bold text-emerald-800"
          >
            Утас: {product.warehouse.phone}
          </a>
        )}
      </div>
      <button
        disabled={!product.orderable || product.stock < 1}
        onClick={onAdd}
        className="mt-5 min-h-12 w-full rounded-xl bg-orange-500 text-sm font-bold text-white hover:bg-orange-600 disabled:bg-slate-200"
      >
        Сагсанд нэмэх
      </button>
    </StoreDialog>
  );
}
