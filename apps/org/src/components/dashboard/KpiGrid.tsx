import { getDashboardKpis } from "@/components/dashboard/dashboardConfig";
import { DashboardStats } from "@/lib/org-types";

type KpiGridProps = {
  loading: boolean;
  stats: DashboardStats | null;
};

export default function KpiGrid({ loading, stats }: KpiGridProps) {
  const kpis = getDashboardKpis(stats);

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {kpis.map((item) => {
        const Icon = item.icon;
        return (
          <article
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black text-slate-600">{item.label}</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-5 text-3xl font-black text-slate-950">
              {loading ? "..." : item.value}
            </p>
            <p className="mt-1 text-xs font-bold text-slate-400">{item.sub}</p>
          </article>
        );
      })}
    </section>
  );
}
