import { TrendingUp, TrendingDown } from "lucide-react";

export interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconColor: string;
  iconBgColor: string;
  trend?: string;
  trendUp?: boolean;
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  iconColor,
  iconBgColor,
  trend,
  trendUp = true,
}: MetricCardProps) {
  return (
    <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3 hover:shadow-md transition-shadow duration-200 group">
      <div className="flex items-center justify-between">
        <div
          className={`p-2.5 md:p-3 rounded-xl ${iconBgColor} ${iconColor} transition-transform duration-200 group-hover:scale-105`}
        >
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg ${
              trendUp
                ? "text-emerald-600 bg-emerald-50"
                : "text-rose-600 bg-rose-50"
            }`}
          >
            {trendUp ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {trend}
          </div>
        )}
      </div>
      <div>
        <h3 className="text-xl md:text-2xl font-extrabold text-slate-800 leading-tight">
          {value}
        </h3>
        <p className="text-[11px] md:text-xs font-semibold text-slate-400 mt-1 truncate">
          {title}
        </p>
      </div>
    </div>
  );
}
