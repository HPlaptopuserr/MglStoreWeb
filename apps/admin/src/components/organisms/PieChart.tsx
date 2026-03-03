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
    items = [{ label: "NEW", colorClass: "bg-orange-400" }]
}: PieChartProps) {
    return (
        <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 p-6 flex flex-col items-center h-full">
            {title && (
                <div className="w-full text-left mb-6">
                    <h5 className="font-bold text-slate-800 text-sm tracking-tight">{title}</h5>
                </div>
            )}

            <div className="flex-1 flex flex-col justify-center items-center w-full">
                <div className="w-32 h-32 rounded-full border-[10px] border-orange-400 flex flex-col items-center justify-center mb-6 relative">
                    <span className="text-2xl font-bold text-slate-800 leading-none">{total}</span>
                    <span className="text-xs font-medium text-slate-500">{label}</span>
                </div>

                <div className="flex flex-wrap justify-center gap-4">
                    {items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                            <div className={`w-2 h-2 rounded-full ${item.colorClass}`} />
                            {item.label}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
