"use client";

export function KpiCard({
  label,
  value,
  icon,
  color,
  sub,
  alert,
  onClick,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  sub?: string;
  alert?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border bg-white p-5 ${alert ? `border-${color}-200 bg-${color}-50/30` : "border-slate-200"} ${onClick ? "cursor-pointer transition-shadow hover:shadow-md" : ""}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-black text-slate-900">
        {value}
        {sub && (
          <span className="ml-1 text-sm font-normal text-slate-400">
            {sub}
          </span>
        )}
      </p>
    </div>
  );
}
