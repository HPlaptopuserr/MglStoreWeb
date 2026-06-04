"use client";

import type { HrMenuService } from "./HrServiceMenuCard";

type HrServiceSummaryGridProps = {
  service: HrMenuService;
};

export function HrServiceSummaryGrid({ service }: HrServiceSummaryGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-black uppercase tracking-wider text-slate-400">
          Үнэ / санал
        </p>
        <p className="mt-1 text-base font-black text-slate-950">
          {service.priceLabel}
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-black uppercase tracking-wider text-slate-400">
          Файл
        </p>
        <p className="mt-1 line-clamp-1 text-base font-black text-slate-950">
          {service.fileName ||
            (service.fileUrl ? "Файл холбогдсон" : "Файл оруулаагүй")}
        </p>
      </div>
      {service.hasForm && (
        <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-violet-500">
            Маягт
          </p>
          <p className="mt-1 line-clamp-1 text-base font-black text-slate-950">
            {service.formTitle || "Маягт холбогдсон"}
          </p>
        </div>
      )}
    </div>
  );
}
