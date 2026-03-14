"use client";

import React, { ReactNode } from "react";

export interface PieChartProps {
  title?: ReactNode;
  total: number;
  label?: string;
  items?: { label: string; colorClass: string }[];
}

export function PieChart({
  title,
  total = 0,
  label = "нийт",
  items = [{ label: "NEW", colorClass: "bg-orange-400" }],
}: PieChartProps) {
  // Simple donut with CSS conic-gradient based on item count
  const segmentColors = ["#fb923c", "#34d399", "#f87171", "#60a5fa"];
  const segmentSize = items.length > 0 ? 100 / items.length : 100;
  const conicStops = items
    .map((_, i) => {
      const start = i * segmentSize;
      const end = (i + 1) * segmentSize;
      return `${segmentColors[i % segmentColors.length]} ${start}% ${end}%`;
    })
    .join(", ");

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6 flex flex-col h-full transition-shadow duration-200 hover:shadow-md">
      {title && (
        <div className="w-full text-left mb-4 md:mb-6">
          <h5 className="font-bold text-slate-800 text-sm md:text-base tracking-tight">
            {title}
          </h5>
        </div>
      )}

      <div className="flex-1 flex flex-col justify-center items-center w-full">
        <div
          className="w-28 h-28 md:w-36 md:h-36 rounded-full flex items-center justify-center mb-5 md:mb-6 relative"
          style={{
            background: `conic-gradient(${conicStops})`,
          }}
        >
          <div className="w-[70%] h-[70%] bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
            <span className="text-xl md:text-2xl font-extrabold text-slate-800 leading-none">
              {total}
            </span>
            <span className="text-[10px] md:text-xs font-medium text-slate-400 mt-0.5">
              {label}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 text-xs md:text-sm font-medium text-slate-600"
            >
              <div className={`w-2 h-2 rounded-full ${item.colorClass}`} />
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
