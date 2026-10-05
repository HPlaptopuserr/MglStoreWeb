import type { LucideIcon } from "lucide-react";

type BusinessAppToggleProps = {
  label: string;
  icon: LucideIcon;
  enabled: boolean;
  onToggle: () => void;
};

export function BusinessAppToggle({
  label,
  icon: Icon,
  enabled,
  onToggle,
}: BusinessAppToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={onToggle}
      className={`min-w-0 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 ${
        enabled
          ? "border-emerald-200 bg-white hover:bg-emerald-50"
          : "border-slate-200 bg-slate-50 hover:bg-white"
      }`}
    >
      <span className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Icon
          size={22}
          aria-hidden="true"
          className={enabled ? "text-emerald-700" : "text-slate-400"}
        />
        <span
          aria-hidden="true"
          className={`h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors ${enabled ? "bg-emerald-500" : "bg-slate-300"}`}
        >
          <span
            className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${enabled ? "translate-x-5" : "translate-x-0"}`}
          />
        </span>
      </span>
      <span className="block break-words text-sm font-semibold text-slate-900">
        {label}
      </span>
      <span className={`mt-1 block text-xs ${enabled ? "text-emerald-700" : "text-slate-500"}`}>
        {enabled ? "Нээлттэй" : "Хаалттай"}
      </span>
    </button>
  );
}
