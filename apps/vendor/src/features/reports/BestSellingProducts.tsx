import { AlertCircle, BarChart3, Medal, RefreshCw } from "lucide-react";
import type { BestSellingProduct } from "./best-selling-products";

const money = (value: number) =>
  `${Math.round(value).toLocaleString("mn-MN")} ₮`;

export function BestSellingProducts({
  products,
  loading,
  error,
  onRetry,
}: {
  products: BestSellingProduct[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const maximumQuantity = Math.max(
    1,
    ...products.map((item) => item.quantitySold),
  );

  return (
    <section
      data-tour="best-selling"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-600">
            <BarChart3 size={19} />
          </span>
          <div>
            <h2 className="font-black text-slate-900">
              Хамгийн их зарагдсан бараа
            </h2>
            <p className="text-xs text-slate-500">
              Борлуулсан тоо хэмжээгээр эрэмбэлсэн эхний 10 бүтээгдэхүүн
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div
          className="min-h-40 animate-pulse space-y-3 p-5"
          aria-label="Борлуулалтын тайлан ачаалж байна"
        >
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-12 rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <div className="flex min-h-44 flex-col items-center justify-center px-6 py-6 text-center">
          <span className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-red-50 text-red-500">
            <AlertCircle size={22} />
          </span>
          <p className="max-w-xl text-sm font-bold text-red-700">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-xs font-bold text-red-700 transition hover:bg-red-50"
          >
            <RefreshCw size={14} /> Дахин оролдох
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className="flex min-h-40 flex-col items-center justify-center px-6 text-center">
          <BarChart3 className="mb-2 text-slate-300" size={30} />
          <p className="text-sm font-bold text-slate-600">
            Сонгосон хугацаанд борлуулалт алга
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Огнооны мужийг өөрчлөөд дахин үзнэ үү.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {products.map((product) => (
            <div
              key={product.productId}
              className="grid gap-3 px-4 py-3.5 transition hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_110px_130px] sm:items-center sm:px-5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-black ${product.rank <= 3 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}
                >
                  {product.rank <= 3 ? <Medal size={17} /> : product.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {product.name}
                    </p>
                    <span className="shrink-0 text-xs font-black text-indigo-600 sm:hidden">
                      {product.quantitySold.toLocaleString("mn-MN")}{" "}
                      {product.unit === "kg" ? "кг" : "ш"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {product.sku || "Кодгүй"} · {product.salesCount} борлуулалт
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                      style={{
                        width: `${Math.max(4, (product.quantitySold / maximumQuantity) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
              <p className="hidden text-right text-sm font-black text-indigo-600 sm:block">
                {product.quantitySold.toLocaleString("mn-MN")}{" "}
                {product.unit === "kg" ? "кг" : "ш"}
              </p>
              <p className="text-right text-sm font-bold text-slate-700">
                {money(product.revenue)}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
