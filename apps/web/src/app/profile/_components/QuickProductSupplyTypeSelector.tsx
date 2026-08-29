import { Boxes, PackageSearch } from "lucide-react";
import type { QuickProductSupplyType } from "./quick-product.types";

const OPTIONS = [
  {
    value: "IN_STOCK" as const,
    icon: Boxes,
    title: "Бэлэн бараа",
    description: "Одоо байгаа нөөцөөс шууд борлуулна",
  },
  {
    value: "CHINA_PREORDER" as const,
    icon: PackageSearch,
    title: "Захиалгын бараа",
    description: "Гадаадаас захиалж, тодорхой хугацаанд ирнэ",
  },
];

export function QuickProductSupplyTypeSelector({
  onChange,
  value,
}: {
  onChange: (value: QuickProductSupplyType) => void;
  value: QuickProductSupplyType;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 ${
              active
                ? "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-200"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                active
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              <Icon size={21} />
            </span>
            <span>
              <span className="block text-sm font-black text-slate-950">
                {option.title}
              </span>
              <span className="mt-0.5 block text-xs font-semibold leading-5 text-slate-500">
                {option.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
