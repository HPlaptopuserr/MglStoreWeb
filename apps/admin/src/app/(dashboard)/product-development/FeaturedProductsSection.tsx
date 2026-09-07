import { PackageSearch, Sparkles } from "lucide-react";
import {
  HOMEPAGE_FEATURED_PRODUCTS_LIMIT,
  type Product,
} from "./product-development.model";

type FeaturedProductsSectionProps = {
  products: Product[];
  selectedProducts: Product[];
  selectedIds: string[];
  onToggle: (productId: string) => void;
  onClear: () => void;
};

export function FeaturedProductsSection({
  products,
  selectedProducts,
  selectedIds,
  onToggle,
  onClear,
}: FeaturedProductsSectionProps) {
  return (
    <section className="rounded-2xl border border-orange-200 bg-white p-4 shadow-sm ring-4 ring-orange-50">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-orange-600">
            <Sparkles className="h-4 w-4" /> Нүүр хуудасны урд хэсэг
          </div>
          <h3 className="mt-3 text-lg font-black text-slate-950">
            Нүүр хуудасны эхний бараанууд
          </h3>
          <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
            Энд сонгосон {HOMEPAGE_FEATURED_PRODUCTS_LIMIT} хүртэлх бараа
            жагсаалтын эхэнд сонгосон дарааллаараа байрлана.
          </p>
        </div>
        <ClearButton disabled={selectedIds.length === 0} onClick={onClear} />
      </div>

      {selectedProducts.length > 0 && (
        <SelectedItems
          items={selectedProducts.map((product) => ({
            id: product.id,
            label: product.name,
          }))}
        />
      )}

      <div className="grid max-h-[360px] gap-2 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3 md:grid-cols-2">
        {products.map((product) => {
          const selectedIndex = selectedIds.indexOf(product.id);
          const selected = selectedIndex >= 0;
          return (
            <button
              key={product.id}
              type="button"
              onClick={() => onToggle(product.id)}
              disabled={
                !selected &&
                selectedIds.length >= HOMEPAGE_FEATURED_PRODUCTS_LIMIT
              }
              className={`flex items-center gap-3 rounded-xl border bg-white p-2 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${selected ? "border-orange-300 ring-2 ring-orange-100" : "border-slate-100 hover:border-slate-200"}`}
            >
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                {product.images?.[0]?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.images[0].url}
                    alt={product.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <PackageSearch className="m-3 h-6 w-6 text-slate-300" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-800">
                  {product.name}
                </p>
                <p className="truncate text-xs font-semibold text-slate-400">
                  {product.organization?.name || "MGL Store"} · ₮
                  {product.price.toLocaleString()}
                </p>
              </div>
              {selected && <OrderBadge index={selectedIndex} color="orange" />}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function ClearButton({
  disabled,
  onClick,
}: {
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-xs font-black text-slate-400 transition hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
    >
      Сонголт цэвэрлэх
    </button>
  );
}

export function SelectedItems({
  items,
}: {
  items: Array<{ id: string; label: string }>;
}) {
  return (
    <div className="mb-4 grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
      {items.map((item, index) => (
        <div
          key={item.id}
          className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-100"
        >
          <OrderBadge index={index} color="slate" />
          <span className="truncate">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export function OrderBadge({
  index,
  color,
}: {
  index: number;
  color: "orange" | "emerald" | "slate";
}) {
  const colorClass =
    color === "orange"
      ? "bg-orange-500"
      : color === "emerald"
        ? "bg-emerald-600"
        : "bg-slate-700";
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black text-white ${colorClass}`}
    >
      {index + 1}
    </span>
  );
}
