"use client";

import { CalendarDays } from "lucide-react";

export type OrderDateRange = "TODAY" | "7_DAYS" | "30_DAYS" | "ALL";

const DATE_OPTIONS: Array<{ value: OrderDateRange; label: string }> = [
  { value: "TODAY", label: "Өнөөдөр" },
  { value: "7_DAYS", label: "7 хоног" },
  { value: "30_DAYS", label: "30 хоног" },
  { value: "ALL", label: "Бүх хугацаа" },
];

export function OrderDateFilter({
  value,
  onChange,
}: {
  value: OrderDateRange;
  onChange: (value: OrderDateRange) => void;
}) {
  return (
    <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
      <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-gray-400">
        <CalendarDays size={14} />
        Хугацаа
      </span>
      <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {DATE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={`h-8 shrink-0 rounded-lg px-3 text-[11px] font-black transition ${
              value === option.value
                ? "bg-gray-950 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function getOrderDateQuery(range: OrderDateRange): string {
  if (range === "ALL") return "";

  const now = new Date();
  const from = new Date(now);
  if (range === "TODAY") {
    from.setHours(0, 0, 0, 0);
  } else {
    from.setDate(now.getDate() - (range === "7_DAYS" ? 6 : 29));
    from.setHours(0, 0, 0, 0);
  }
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
  });
  return `?${params.toString()}`;
}
