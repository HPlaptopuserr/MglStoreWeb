import { Loader2 } from "lucide-react";
import type { MasterCatalogResponse } from "./catalog-types";
export function MasterCatalogTable({
  data,
  loading,
  onEdit,
  onPage,
}: {
  data: MasterCatalogResponse | null;
  loading: boolean;
  onEdit: (id: string) => void;
  onPage: (page: number) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-bold text-slate-900">Барааны жагсаалт</h2>
        <p className="text-xs text-slate-500">
          Борлуулалт, татан авах хүсэлт: сүүлийн 90 хоног
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Бараа</th>
              <th className="px-4 py-3">Баркод</th>
              <th className="px-4 py-3 text-right">Ашиглаж буй дэлгүүр</th>
              <th className="px-4 py-3 text-right">Барааны бүртгэл</th>
              <th className="px-4 py-3 text-right">Нийт үлдэгдэл</th>
              <th className="px-4 py-3 text-right">Борлуулсан тоо</th>
              <th className="px-4 py-3 text-right">Татан авах хүсэлт</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-20 text-center">
                  <Loader2
                    aria-hidden="true"
                    className="mx-auto animate-spin text-blue-600"
                  />
                  <span role="status" className="sr-only">
                    Бараа ачааллаж байна…
                  </span>
                </td>
              </tr>
            ) : data?.items.length ? (
              data.items.map((item) => (
                <tr
                  key={item.id}
                  className="border-t border-slate-100 hover:bg-slate-50/70"
                >
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onEdit(item.id)}
                      className="rounded text-left font-bold text-slate-900 hover:text-blue-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                      aria-label={`${item.canonicalName} — засах`}
                    >
                      {item.canonicalName}
                      <span className="ml-2 text-xs font-semibold text-blue-600">
                        Засах
                      </span>
                    </button>
                    <p className="text-xs text-slate-400">
                      {[item.brand, item.categoryName]
                        .filter(Boolean)
                        .join(" · ") || "Ангилагдаагүй"}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {item.barcode || "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {item.organizationCount}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.linkedProductCount}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.systemStock.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-violet-700">
                    {item.systemSoldQuantity90d.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-teal-700">
                    {item.systemRequestedQuantity90d.toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-20 text-center text-slate-500">
                  Хайлтанд тохирох бараа олдсонгүй. Нэр эсвэл баркодоор дахин
                  хайна уу.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!loading && data && data.total > 100 && (
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
          <p className="text-xs font-semibold text-slate-500">
            {data.total.toLocaleString()} бараанаас {(data.page - 1) * 100 + 1}–
            {Math.min(data.page * 100, data.total)}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onPage(Math.max(1, data.page - 1))}
              disabled={data.page <= 1}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold disabled:opacity-40"
            >
              Өмнөх
            </button>
            <button
              onClick={() => onPage(data.page + 1)}
              disabled={!data.hasMore}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold disabled:opacity-40"
            >
              Дараах
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
