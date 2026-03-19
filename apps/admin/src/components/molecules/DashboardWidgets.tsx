import {
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

// ── StatCard ─────────────────────────────────────────────

interface StatCardProps {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  trend: string;
  trendUp: boolean;
  sparkData: number[];
}

function buildSparkPoints(sparkData: number[]): string {
  const max = Math.max(...sparkData);
  const min = Math.min(...sparkData);
  const range = max - min || 1;
  return sparkData
    .map((v, i) => {
      const x = (i / (sparkData.length - 1)) * 80;
      const y = 24 - ((v - min) / range) * 20;
      return `${x},${y}`;
    })
    .join(" ");
}

export function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  trend,
  trendUp,
  sparkData,
}: StatCardProps) {
  const points = buildSparkPoints(sparkData);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-3 sm:p-4 md:p-5 shadow-sm hover:shadow-md transition-all duration-300 group relative overflow-hidden">
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-2 sm:mb-3">
          <div
            className={`p-2 sm:p-2.5 rounded-xl ${iconBg} ${iconColor} transition-transform duration-200 group-hover:scale-110`}
          >
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>

          <svg
            width="60"
            height="24"
            viewBox="0 0 80 28"
            className="opacity-40 group-hover:opacity-70 transition-opacity hidden sm:block"
          >
            <polyline
              points={points}
              fill="none"
              stroke={trendUp ? "#10b981" : "#f43f5e"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h3 className="text-lg sm:text-2xl md:text-[28px] font-extrabold text-slate-900 leading-none tracking-tight">
          {value}
        </h3>
        <div className="flex items-center justify-between mt-1.5 sm:mt-2 gap-1">
          <p className="text-[10px] sm:text-[11px] md:text-xs font-medium text-slate-400 truncate">
            {label}
          </p>
          <div
            className={`flex items-center gap-0.5 text-[10px] sm:text-[11px] font-bold px-1 sm:px-1.5 py-0.5 rounded-md shrink-0 ${
              trendUp
                ? "text-emerald-600 bg-emerald-50"
                : "text-rose-600 bg-rose-50"
            }`}
          >
            {trendUp ? (
              <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            ) : (
              <ArrowDownRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            )}
            {trend}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── QuickAction ──────────────────────────────────────────

interface QuickActionProps {
  icon: React.ElementType;
  label: string;
  color: string;
  onClick?: () => void;
}

export function QuickAction({ icon: Icon, label, color, onClick }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 sm:gap-2 p-2.5 sm:p-3 md:p-4 rounded-xl border border-slate-100 bg-white hover:shadow-md hover:border-slate-200 transition-all duration-200 group active:scale-95"
    >
      <div
        className={`w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-xl ${color} flex items-center justify-center transition-transform group-hover:scale-110`}
      >
        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
      </div>
      <span className="text-[10px] sm:text-[11px] md:text-xs font-semibold text-slate-600 text-center leading-tight">
        {label}
      </span>
    </button>
  );
}

// ── ActivityItem ─────────────────────────────────────────

interface ActivityItemProps {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  time: string;
  isLast?: boolean;
}

export function ActivityItem({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  description,
  time,
  isLast,
}: ActivityItemProps) {
  return (
    <div className="flex gap-3 group">
      <div className="flex flex-col items-center">
        <div
          className={`w-8 h-8 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center shrink-0 transition-transform group-hover:scale-110`}
        >
          <Icon className="w-3.5 h-3.5" />
        </div>
        {!isLast && <div className="w-px flex-1 bg-slate-100 mt-1.5" />}
      </div>
      <div className={`flex-1 ${!isLast ? "pb-4" : ""}`}>
        <p className="text-sm font-semibold text-slate-800 leading-snug">
          {title}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        <p className="text-[10px] text-slate-300 mt-1 font-medium">{time}</p>
      </div>
    </div>
  );
}

// ── DetailItem ───────────────────────────────────────────

interface DetailItemProps {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
}

export function DetailItem({ icon: Icon, label, value }: DetailItemProps) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 text-slate-400" />
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-sm font-medium text-slate-800 wrap-break-word">
        {value || "-"}
      </p>
    </div>
  );
}
