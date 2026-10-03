"use client";
import Link from "next/link";
import { useState } from "react";
import { SalesStoresSection } from "./SalesStoresSection";
import { dayOptions, type StatisticsWindow } from "./statistics-format";
export function SalesStoresDirectory({
  initialDays,
  initialStatus,
}: {
  initialDays: StatisticsWindow;
  initialStatus: "all" | "active" | "inactive";
}) {
  const [days, setDays] = useState(initialDays);
  return (
    <div className="space-y-4 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/statistics"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          ← Статистик руу буцах
        </Link>
        <div
          role="group"
          aria-label="Бүртгэсэн хугацаа"
          className="flex flex-wrap gap-2"
        >
          {dayOptions.map((option) => (
            <button
              type="button"
              key={option.value}
              aria-pressed={days === option.value}
              onClick={() => setDays(option.value)}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-lime-600 ${days === option.value ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-lime-50"}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <SalesStoresSection
        key={days}
        days={days}
        initialStatus={initialStatus}
      />
    </div>
  );
}
