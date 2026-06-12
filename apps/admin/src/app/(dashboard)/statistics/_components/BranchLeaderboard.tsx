import { MapPin, Store } from "lucide-react";
import type { StatisticsInsights } from "@/lib/statistics-api";
import { money } from "./statistics-format";

type Branch = StatisticsInsights["topBranches"][number];

export function BranchLeaderboard({
  branches,
  maxRevenue,
  visibleCount,
}: {
  branches: Branch[];
  maxRevenue: number;
  visibleCount: number;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-950">
            <Store className="h-5 w-5 text-sky-500" />
            Салбарын дэлгэрэнгүй
          </h3>
          <p className="text-sm font-medium text-slate-500">
            Орлого, хөдөлгөөн, POS/online ялгаа, дундаж сагс, хаягаар харуулна.
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {branches.length === 0 && (
          <p className="rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
            Хайлтад тохирох салбар олдсонгүй.
          </p>
        )}
        {branches.slice(0, visibleCount).map((item, index) => {
          const barWidth = Math.min(100, Math.max(8, (item.revenue / Math.max(maxRevenue, 1)) * 100));
          return (
            <article key={item.branchId} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500 text-xs font-black text-white">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-slate-950">{item.name}</p>
                      <p className="truncate text-xs font-semibold text-slate-500">{item.organizationName || "Байгууллагагүй"}</p>
                    </div>
                  </div>
                  <p className="mt-3 flex items-start gap-2 text-xs font-semibold leading-5 text-slate-500">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <span className="line-clamp-2">{item.address || "Хаяг бүртгэгдээгүй"}</span>
                  </p>
                </div>
                <div className="shrink-0 text-left lg:text-right">
                  <p className="text-lg font-black text-slate-950">{money(item.revenue)}</p>
                  <p className="text-xs font-black text-emerald-600">Нийт орлогын {item.sharePercent}%</p>
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-xs font-bold text-slate-500 sm:grid-cols-4">
                <Metric label="Нийт хөдөлгөөн" value={item.orders.toLocaleString("mn-MN")} />
                <Metric label="POS" value={item.posSales.toLocaleString("mn-MN")} />
                <Metric label="Online" value={item.onlineOrders.toLocaleString("mn-MN")} />
                <Metric label="Дундаж сагс" value={money(item.avgTicket)} />
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-sky-400" style={{ width: `${barWidth}%` }} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-800">{value}</p>
    </div>
  );
}
