import type { KitchenQueuePeriod } from "@mgl/types";

interface KitchenQueuePeriodTabsProps {
  value: KitchenQueuePeriod;
  todayCount: number;
  previousCount: number;
  onChange: (period: KitchenQueuePeriod) => void;
}

export function KitchenQueuePeriodTabs({
  value,
  todayCount,
  previousCount,
  onChange,
}: KitchenQueuePeriodTabsProps) {
  const periods = [
    { value: "today", label: "Өнөөдөр", count: todayCount },
    {
      value: "previous",
      label: "Өмнөх өдрийн",
      count: previousCount,
    },
  ] as const;

  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="Захиалгын өдөр"
    >
      {periods.map((period) => (
        <button
          key={period.value}
          type="button"
          aria-pressed={value === period.value}
          onClick={() => onChange(period.value)}
          className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-200 ${
            value === period.value
              ? "border-slate-100 bg-slate-100 text-slate-950"
              : period.value === "previous" && previousCount > 0
                ? "border-amber-300/30 bg-amber-300/10 text-amber-200 hover:bg-amber-300/20"
                : "border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white"
          }`}
        >
          {period.label}
          <span className="rounded-md bg-black/10 px-2 py-0.5 tabular-nums">
            {period.count}
          </span>
        </button>
      ))}
    </div>
  );
}
