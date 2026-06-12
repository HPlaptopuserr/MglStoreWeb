import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";

export function StatisticsTrendBadge({ value }: { value: number }) {
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : ArrowRight;
  const tone =
    value > 0
      ? "bg-emerald-50 text-emerald-700"
      : value < 0
        ? "bg-red-50 text-red-700"
        : "bg-slate-100 text-slate-600";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${tone}`}>
      <Icon className="h-3.5 w-3.5" />
      {value > 0 ? `+${value}%` : `${value}%`}
    </span>
  );
}
