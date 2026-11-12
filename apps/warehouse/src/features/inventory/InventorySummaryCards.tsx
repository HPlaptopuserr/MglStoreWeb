import { BarChart3, Layers3, Package, ShieldCheck, Wallet } from "lucide-react";
import type { InventorySummary } from "./inventory.types";

interface Props {
  summary: InventorySummary;
  warehouseName: string;
  loading: boolean;
  unavailable: boolean;
}

export function InventorySummaryCards({
  summary,
  warehouseName,
  loading,
  unavailable,
}: Props) {
  const cost =
    summary.totalCost === undefined ? null : Number(summary.totalCost);
  const hasCost = cost !== null && Number.isFinite(cost);
  const missing = summary.missingCostCount ?? 0;
  return (
    <section
      aria-label="Агуулахын нөөцийн тойм"
      aria-busy={loading}
      className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,1fr)]"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Нийт бараа",
            value: summary.total,
            icon: Package,
            color: "bg-indigo-50 text-indigo-600",
          },
          {
            label: "Хэвийн нөөцтэй",
            value: summary.healthy,
            icon: ShieldCheck,
            color: "bg-emerald-50 text-emerald-600",
          },
          {
            label: "Нийт үлдэгдэл",
            value: summary.totalStock,
            icon: BarChart3,
            color: "bg-amber-50 text-amber-600",
          },
          {
            label: "Байрлалтай",
            value: summary.located,
            icon: Layers3,
            color: "bg-blue-50 text-blue-600",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
          >
            <span
              className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${color}`}
            >
              <Icon size={18} aria-hidden="true" />
            </span>
            <div className="text-xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-2xl">
              {loading ? (
                <span
                  className="inline-block h-7 w-16 rounded bg-slate-100 motion-safe:animate-pulse"
                  aria-label="Ачааллаж байна"
                />
              ) : unavailable ? (
                "—"
              ) : (
                value.toLocaleString("mn-MN")
              )}
            </div>
            <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
          </div>
        ))}
      </div>
      <div className="min-w-0 rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-700">
            Нөөцийн нийт өртөг
          </p>
          <Wallet
            size={20}
            className="shrink-0 text-blue-600"
            aria-hidden="true"
          />
        </div>
        <div className="mt-3 break-words text-[clamp(1.5rem,2.5vw,2rem)] font-bold leading-tight tabular-nums tracking-tight text-slate-950">
          {loading ? (
            <span
              className="inline-block h-9 w-48 max-w-full rounded bg-blue-100/60 motion-safe:animate-pulse"
              aria-label="Өртөг ачааллаж байна"
            />
          ) : unavailable || !hasCost ? (
            "—"
          ) : (
            <>
              {cost.toLocaleString("mn-MN", { maximumFractionDigits: 2 })}
              <span className="ml-1.5 text-lg font-medium text-blue-600">
                ₮
              </span>
            </>
          )}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          {warehouseName} · Бүх барааны үлдэгдэл × нэгжийн өртөг
        </p>
        {!loading && !unavailable && missing > 0 && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs leading-relaxed text-amber-800">
            Нөөцтэй {missing.toLocaleString("mn-MN")} барааны өртөг бүртгэлгүй
            тул дүнд ороогүй.
          </p>
        )}
      </div>
    </section>
  );
}
