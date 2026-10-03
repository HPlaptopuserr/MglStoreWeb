"use client";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Loader2 } from "lucide-react";
import type { ProductReportRow } from "./product-report";
import { ProductBreakdownExport } from "./ProductBreakdownExport";
import { calculateMarginPercent } from "./product-report";

const money = (value: number) =>
  `${Math.round(value).toLocaleString("mn-MN")} ₮`;

export function ProductReportTable({
  products,
  loading,
  organizationName,
  filterDescription,
}: {
  products: ProductReportRow[];
  loading: boolean;
  organizationName: string;
  filterDescription: string;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [requestedPage, setRequestedPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const pageCount = Math.max(1, Math.ceil(products.length / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const start = (page - 1) * pageSize;
  const pageProducts = products.slice(start, start + pageSize);
  function goToPage(next: number) {
    setRequestedPage(next);
    requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true });
      heading.current?.scrollIntoView({ block: "start", behavior: "instant" });
    });
  }
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
        <h2
          ref={heading}
          tabIndex={-1}
          className="scroll-mt-20 text-sm font-black text-slate-800 outline-none"
        >
          Бүтээгдэхүүний задаргаа
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-400">{products.length} мөр</span>
          <ProductBreakdownExport products={products} loading={loading} organizationName={organizationName} filterDescription={filterDescription} />
        </div>
      </div>
      {loading ? (
        <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
          Тайлан ачаалж байна...
        </div>
      ) : products.length === 0 ? (
        <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
          <FileText className="mb-3 h-9 w-9 text-slate-300" />
          <p className="font-bold text-slate-600">
            Тохирох бүтээгдэхүүн олдсонгүй
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Хайлт эсвэл шүүлтүүрээ өөрчилнө үү.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[920px] w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3">
                  №
                </th>
                <th scope="col" className="px-4 py-3">
                  Бүтээгдэхүүн
                </th>
                <th scope="col" className="px-4 py-3">
                  Ангилал
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Авсан үнэ
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Зарах үнэ
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Бөөний үнэ
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Үлдэгдэл
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Ашгийн хувь
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageProducts.map((product, index) => {
                const margin = calculateMarginPercent(product);
                return (
                  <tr key={product.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-400">
                      {start + index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">{product.name}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {product.sku || product.barcode || "Кодгүй"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {product.businessCategory?.name || "Ангилалгүй"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {product.costPrice == null
                        ? "—"
                        : money(product.costPrice)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {money(product.price)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {product.wholesalePrice == null
                        ? "—"
                        : money(product.wholesalePrice)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {product.stock.toLocaleString("mn-MN")}{" "}
                      {product.unit === "kg" ? "кг" : "ш"}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-bold ${margin != null && margin < 0 ? "text-red-600" : "text-emerald-600"}`}
                    >
                      {margin == null ? "—" : `${margin.toFixed(1)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {!loading && products.length > 0 && (
        <p className="border-t border-slate-100 px-4 pt-3 text-xs text-slate-500">
          Excel татахад шүүлтүүрт тохирсон бүх {products.length} бараа
          дарааллаараа гарна.
        </p>
      )}
      {!loading && products.length > 0 && (
        <nav
          aria-label="Бүтээгдэхүүний тайлангийн хуудас"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-4"
        >
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span role="status">
              Нийт {products.length} бараанаас {start + 1}–
              {Math.min(start + pageSize, products.length)}
            </span>
            <label className="flex items-center gap-2">
              Хуудсанд
              <select
                aria-label="Хуудсанд харуулах барааны тоо"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setRequestedPage(1);
                }}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2"
              >
                {[20, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => goToPage(page - 1)}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 font-semibold transition hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
              Өмнөх
            </button>
            <span className="whitespace-nowrap text-xs text-slate-500">
              {page} / {pageCount}
            </span>
            <button
              type="button"
              disabled={page === pageCount}
              onClick={() => goToPage(page + 1)}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 font-semibold transition hover:bg-slate-50 disabled:opacity-40"
            >
              Дараах
              <ChevronRight size={16} />
            </button>
          </div>
        </nav>
      )}
    </section>
  );
}
