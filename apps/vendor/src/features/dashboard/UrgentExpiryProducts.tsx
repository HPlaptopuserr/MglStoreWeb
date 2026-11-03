import { AlertTriangle, ChevronDown } from "lucide-react";
import { formatReportExpiry } from "../reports/report-expiry";

export interface UrgentExpiryProduct {
  inventoryId: string;
  productId: string;
  name: string;
  sku: string | null;
  warehouseName: string;
  expiryDate: string;
  daysUntilExpiry: number;
}

export function UrgentExpiryProducts({
  count,
  products,
}: {
  count: number;
  products?: UrgentExpiryProduct[];
}) {
  return (
    <details className="group min-w-0 bg-white sm:col-span-2">
      <summary className="flex cursor-pointer list-none items-start gap-3 p-4 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-indigo-600 sm:p-5 [&::-webkit-details-marker]:hidden">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-red-100 bg-red-50 text-red-600">
          <AlertTriangle size={18} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-slate-800">
            {count} барааны хугацаа ойртсон
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            14 хоногийн дотор дуусах, үлдэгдэлтэй бараа. Түрүүлж борлуулах эсвэл
            үлдэгдлийг зохицуулна уу.
          </span>
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-indigo-600">
            <span className="group-open:hidden">Бараа харах</span>
            <span className="hidden group-open:inline">Жагсаалт хураах</span>
            <ChevronDown
              size={15}
              aria-hidden="true"
              className="transition-transform group-open:rotate-180 motion-reduce:transition-none"
            />
          </span>
        </span>
      </summary>
      <div className="border-t border-slate-100 p-4 sm:p-5">
        {!products ? (
          <p role="status" className="text-sm text-amber-700">
            Жагсаалт ачаалагдсангүй. Хуудсаа шинэчилж дахин оролдоно уу.
          </p>
        ) : products.length === 0 ? (
          <p className="text-sm text-slate-500">
            Ойрын 14 хоногт дуусах үлдэгдэлтэй бараа алга.
          </p>
        ) : (
          <ul
            aria-label="Хугацаа ойртсон бараанууд"
            className="grid gap-3 lg:grid-cols-2"
          >
            {products.map((product) => (
              <li
                key={product.inventoryId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-100 bg-amber-50/50 p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-bold text-slate-900">
                    {product.name}
                  </p>
                  <p className="mt-1 break-words text-xs text-slate-500">
                    {product.warehouseName}
                    {product.sku ? ` · ${product.sku}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums text-slate-800">
                    {formatReportExpiry(product.expiryDate)}
                  </p>
                  <p className="mt-1 text-xs font-bold text-amber-800">
                    {product.daysUntilExpiry === 0
                      ? "Өнөөдөр дуусна"
                      : `${product.daysUntilExpiry} хоног үлдсэн`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
