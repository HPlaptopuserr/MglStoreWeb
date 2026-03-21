"use client";

import { CalendarDays, Clock } from "lucide-react";
import { formatMnDate, formatMnTime } from "../../../lib/constants";

interface DashboardHeaderProps {
  currentTime: Date;
}

export function DashboardHeader({ currentTime }: DashboardHeaderProps) {
  const hour = currentTime.getHours();
  const greeting =
    hour < 12 ? "Өглөөний мэнд" : hour < 18 ? "Өдрийн мэнд" : "Оройн мэнд";

  const dateStr = formatMnDate(currentTime);
  const timeStr = formatMnTime(currentTime);

  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-3">
      <div>
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-sm">👋</span>
          <p className="text-xs sm:text-sm font-semibold text-indigo-500">
            {greeting}
          </p>
        </div>
        <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
          Хяналтын самбар
        </h1>
      </div>

      <div className="flex items-center">
        <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs md:text-sm text-slate-400 bg-white border border-slate-100 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 shadow-sm">
          <CalendarDays className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-300" />
          <span className="font-medium">{dateStr}</span>
          <span className="text-slate-300">|</span>
          <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-300" />
          <span className="font-bold text-slate-500">{timeStr}</span>
        </div>
      </div>
    </div>
  );
}