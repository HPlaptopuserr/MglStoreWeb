import type { ReactNode } from "react";
import { BarChart3 } from "lucide-react";

export type RankedBarChartItem = {
  id: string;
  label: string;
  secondaryLabel?: string;
  value: number;
};

type RankedBarChartProps = {
  title: string;
  items: readonly RankedBarChartItem[];
  subtitle?: string;
  action?: ReactNode;
  color?: "blue" | "emerald";
  emptyTitle?: string;
  emptyDescription?: string;
  formatValue?: (value: number) => string;
  dense?: boolean;
  showRank?: boolean;
};

const BAR_COLORS = {
  blue: {
    first: "from-blue-600 to-sky-400",
    rest: "from-blue-500 to-sky-300",
  },
  emerald: {
    first: "from-emerald-600 to-teal-400",
    rest: "from-emerald-500 to-teal-300",
  },
} as const;

export function RankedBarChart({
  title,
  items,
  subtitle,
  action,
  color = "blue",
  emptyTitle = "Харуулах өгөгдөл алга",
  emptyDescription = "Өөр хугацаа сонгож дахин шалгана уу.",
  formatValue = (value) => value.toLocaleString("mn-MN"),
  dense = false,
  showRank = false,
}: RankedBarChartProps) {
  const maxValue = Math.max(0, ...items.map((item) => item.value));
  const colors = BAR_COLORS[color];

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div
        className={`flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${
          dense ? "pb-2 pt-4" : "border-b border-slate-100 py-4"
        }`}
      >
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
          )}
        </div>
        {action}
      </div>

      {items.length === 0 ? (
        <div className="flex min-h-52 flex-col items-center justify-center gap-2 px-5 py-10 text-center text-slate-400">
          <span className="rounded-full bg-slate-50 p-3">
            <BarChart3 aria-hidden="true" className="h-6 w-6" />
          </span>
          <p className="text-sm font-medium text-slate-600">{emptyTitle}</p>
          <p className="text-xs">{emptyDescription}</p>
        </div>
      ) : (
        <ol
          className={dense ? "space-y-2.5 px-4 pb-5 sm:px-5" : "space-y-4 px-4 py-5 sm:px-5"}
        >
          {items.map((item, index) => {
            const width = maxValue > 0 ? (item.value / maxValue) * 100 : 0;

            return (
              <li
                key={item.id}
                className={
                  dense
                    ? "flex items-center gap-3"
                    : "grid grid-cols-[minmax(7.5rem,0.32fr)_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[minmax(11rem,0.28fr)_minmax(0,1fr)]"
                }
              >
                {showRank && (
                  <span className="w-5 shrink-0 text-right text-xs font-bold tabular-nums text-slate-300">
                    {index + 1}
                  </span>
                )}
                <div className={dense ? "min-w-0 flex-1" : "min-w-0"}>
                  <div className={dense ? "mb-1 flex items-center justify-between gap-3" : ""}>
                    <p className="truncate text-xs font-semibold text-slate-700 sm:text-sm">
                      {item.label}
                    </p>
                    {dense && (
                      <span className="shrink-0 text-xs font-bold tabular-nums text-slate-900">
                        {formatValue(item.value)}
                      </span>
                    )}
                  </div>
                  {item.secondaryLabel && !dense && (
                    <p className="truncate font-mono text-[10px] text-slate-400 sm:text-xs">
                      {item.secondaryLabel}
                    </p>
                  )}
                  {dense && (
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full min-w-0.5 rounded-full bg-gradient-to-r transition-[width] duration-500 ease-out ${
                          index === 0 ? colors.first : colors.rest
                        }`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  )}
                </div>
                {!dense && (
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-7 flex-1 overflow-hidden rounded-md bg-slate-100">
                      <div
                        className={`h-full min-w-1 rounded-md bg-gradient-to-r transition-[width] duration-500 ease-out ${
                          index === 0 ? colors.first : colors.rest
                        }`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <span className="w-14 shrink-0 text-right text-sm font-bold tabular-nums text-slate-800">
                      {formatValue(item.value)}
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
