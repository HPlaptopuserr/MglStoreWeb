import {
  AlertTriangle,
  CircleCheck,
  CircleX,
  Layers3,
  Package,
} from "lucide-react";
import type { WarehouseCategorySummary, WarehouseSummary } from "./types";

export function WarehouseInventorySummary({
  summary,
  categories,
}: {
  summary: WarehouseSummary;
  categories: WarehouseCategorySummary[];
}) {
  const maxCategoryQuantity = Math.max(
    ...categories.map((category) => category.totalQuantity),
    1,
  );
  const statuses = [
    {
      label: "Хэвийн нөөцтэй",
      value: summary.normalItems,
      icon: CircleCheck,
      style: "border-emerald-100 bg-emerald-50 text-emerald-700",
    },
    {
      label: "Дуусаж буй",
      value: summary.lowStockItems,
      icon: AlertTriangle,
      style: "border-amber-100 bg-amber-50 text-amber-700",
    },
    {
      label: "Дууссан",
      value: summary.outOfStockItems,
      icon: CircleX,
      style: "border-red-100 bg-red-50 text-red-700",
    },
  ];
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-bold text-slate-950">
            <span className="rounded-lg bg-indigo-50 p-2">
              <Layers3 className="h-4 w-4 text-[#5B4CFF]" />
            </span>
            Барааны хураангуй
          </h3>
          <p className="mt-1 text-sm text-slate-500 sm:ml-10">
            Бараа тус бүр биш, нөөцийн төлөв ба ангиллын нэгтгэл
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-right shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Нийт үлдэгдэл
          </p>
          <p className="text-xl font-extrabold text-slate-900">
            {summary.totalQuantity.toLocaleString()}
          </p>
        </div>
      </div>
      <div className="grid gap-4 p-6 md:grid-cols-3">
        {statuses.map(({ label, value, icon: Icon, style }) => (
          <div key={label} className={`rounded-2xl border p-4 ${style}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">{label}</span>
              <Icon className="h-5 w-5 opacity-70" />
            </div>
            <p className="mt-3 text-3xl font-extrabold tracking-tight">
              {value}
            </p>
            <p className="text-xs opacity-80">төрлийн бараа</p>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-100 px-6 pb-6 pt-5">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="font-semibold text-slate-800">Ангиллын бүтэц</h4>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {summary.categoryCount} ангилал
          </span>
        </div>
        {categories.length ? (
          <div className="grid gap-x-8 gap-y-3 lg:grid-cols-2">
            {categories.map((category, index) => (
              <div
                key={category.categoryName}
                className="rounded-xl border border-transparent p-3 transition hover:border-slate-200 hover:bg-slate-50"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-[#5B4CFF]">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {category.categoryName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {category.productCount} төрлийн бараа
                      </p>
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-slate-900">
                    {category.totalQuantity.toLocaleString()}
                  </p>
                </div>
                <div className="ml-10 mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#5B4CFF] to-indigo-400"
                    style={{
                      width: `${Math.max((category.totalQuantity / maxCategoryQuantity) * 100, 2)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center">
            <Package className="mx-auto mb-3 h-9 w-9 text-slate-300" />
            <p className="text-slate-600">Барааны бүртгэл байхгүй</p>
          </div>
        )}
      </div>
    </section>
  );
}
