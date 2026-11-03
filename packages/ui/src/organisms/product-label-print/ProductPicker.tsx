import { useMemo, useState } from "react";
import { PackageSearch, Plus, Search } from "lucide-react";
import {
  productPriceText,
  PRICE_MODE_LABELS,
  type LabelPriceMode,
  resolveProductLabelCode,
  type ProductLabelDraft,
  type ProductLabelProduct,
} from "./layout";
interface Props {
  priceMode: LabelPriceMode;
  initialSearch: string;
  products: ProductLabelProduct[];
  drafts: ProductLabelDraft[];
  addProduct: (product: ProductLabelProduct) => void;
}
export function ProductPicker({
  priceMode,
  initialSearch,
  products,
  drafts,
  addProduct,
}: Props) {
  const [labelSearch, setLabelSearch] = useState(initialSearch.trim());
  const lowerSearch = labelSearch.trim().toLowerCase();
  const filteredProducts = useMemo(
    () =>
      !lowerSearch
        ? products
        : products.filter((product) =>
            [product.name, product.sku, product.barcode, product.id]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(lowerSearch),
          ),
    [products, lowerSearch],
  );
  const quantities = new Map(
    drafts.map((draft) => [draft.productId, draft.qty]),
  );
  return (
    <section className="flex min-h-[260px] flex-col border-r lg:min-h-0 border-slate-200">
      <div className="shrink-0 border-b border-slate-100 p-4">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={labelSearch}
            onChange={(event) => setLabelSearch(event.target.value)}
            aria-label="Бараа хайх"
            placeholder="Нэр, SKU, barcode"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {filteredProducts.length === 0 ? (
          <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center">
            <div>
              <PackageSearch className="mx-auto mb-3 h-9 w-9 text-slate-300" />
              <p className="text-sm font-bold text-slate-700">
                Бараа олдсонгүй
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProducts.map((product) => {
              const selectedQty = quantities.get(product.id) ?? 0;
              const labelCode = resolveProductLabelCode(product);

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addProduct(product)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-sky-300 hover:bg-sky-50"
                >
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-black text-slate-950">
                      {product.name}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
                      {labelCode.label} {labelCode.value || "-"} ·{" "}
                      {PRICE_MODE_LABELS[priceMode]}:{" "}
                      {productPriceText(product, priceMode) || "Бүртгэлгүй"}
                    </p>
                  </div>
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      selectedQty > 0
                        ? "bg-sky-600 text-white"
                        : "bg-slate-950 text-white"
                    }`}
                  >
                    {selectedQty > 0 ? selectedQty : <Plus size={16} />}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
