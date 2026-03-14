"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export type TimeRange = "7d" | "30d" | "6m" | "1y" | "all";

interface ChartPayloadItem {
  dataKey: string;
  value: number;
  color?: string;
  payload: {
    date: string;
    fullDate: string;
    leads: number;
    revenue: number;
    name: string;
    isCurrent?: boolean;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomizedDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (payload.isCurrent) {
    return (
      <svg x={cx - 10} y={cy - 10} width={20} height={20} viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="10" fill="#4f46e5" opacity="0.2">
          <animate
            attributeName="r"
            from="5"
            to="10"
            dur="1.5s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            from="0.6"
            to="0"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>
        <circle
          cx="10"
          cy="10"
          r="4"
          fill="#4f46e5"
          stroke="white"
          strokeWidth="2"
        />
      </svg>
    );
  }
  return null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const items = payload as ChartPayloadItem[];

    return (
      <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-indigo-100 shadow-xl shadow-indigo-100/50 min-w-40">
        <p className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">
          {label}{" "}
          <span className="text-slate-400 font-normal text-xs ml-2">
            {data.fullDate}
          </span>
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-semibold text-indigo-600 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              Хүсэлт:
            </p>
            <p className="text-xs font-bold text-slate-700">
              {items.find((p) => p.dataKey === "leads")?.value || 0}
            </p>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

interface RevenueChartProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  activeRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
}

export function RevenueChart({
  data,
  activeRange,
  onRangeChange,
}: RevenueChartProps) {
  const ranges: { label: string; value: TimeRange }[] = [
    { label: "7 хоног", value: "7d" },
    { label: "1 сар", value: "30d" },
    { label: "6 сар", value: "6m" },
    { label: "1 жил", value: "1y" },
    { label: "Бүгд", value: "all" },
  ];

  return (
    <div className="lg:col-span-2 bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden transition-shadow duration-200 hover:shadow-md flex flex-col min-h-80 md:min-h-100 min-w-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 md:mb-6 relative z-10 gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-slate-800 text-base md:text-lg tracking-tight">
            Статистик
          </h3>
          <div className="flex items-center gap-1 text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-bold">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
            Хүсэлт
          </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto max-w-full">
          {ranges.map((range) => (
            <button
              key={range.value}
              onClick={() => onRangeChange(range.value)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 whitespace-nowrap ${
                activeRange === range.value
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 md:mt-4 h-60 md:h-80 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f1f5f9"
            />

            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              dy={10}
              minTickGap={30}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#4f46e5", fontSize: 11 }}
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: "#4f46e5", strokeDasharray: "5 5" }}
            />

            <Area
              type="monotone"
              dataKey="leads"
              stroke="#4f46e5"
              strokeWidth={3}
              fill="url(#colorLeads)"
              animationDuration={1500}
              dot={<CustomizedDot />}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
