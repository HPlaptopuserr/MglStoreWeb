"use client";

import { CheckCircle2 } from "lucide-react";

export interface Duration {
  months: number | null;
  price: number;
  label: string;
}

export interface MembershipType {
  value: string;
  label: string;
  price: string;
  desc: string;
  durations: Duration[];
}

interface Props {
  types: MembershipType[];
  selectedType: string;
  onTypeChange: (val: string) => void;
  durationMonths: string;
  onDurationChange: (val: string) => void;
}

export function MembershipSelection({
  types,
  selectedType,
  onTypeChange,
  durationMonths,
  onDurationChange,
}: Props) {
  return (
    <div className="space-y-4">
      {types.map((t) => {
        const isSelected = selectedType === t.value;

        return (
          <div
            key={t.value}
            onClick={() => {
              if (!isSelected) {
                onTypeChange(t.value);
                onDurationChange(""); // Шинэ төрөл сонгоход хугацааг дахин тохируулах (reset)
              }
            }}
            className={`relative rounded-2xl border-2 cursor-pointer transition-all duration-300 overflow-hidden ${
              isSelected
                ? "border-indigo-600 bg-indigo-50/40 shadow-lg shadow-indigo-100/50"
                : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50"
            }`}
          >
            <div className="p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                
                {/* Зүүн тал: Radio болон Текст */}
                <div className="flex-1 min-w-0 flex gap-4">
                  {/* Radio Icon */}
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      isSelected ? "border-indigo-600" : "border-slate-300"
                    }`}
                  >
                    {isSelected && <div className="w-3 h-3 rounded-full bg-indigo-600" />}
                  </div>

                  {/* Гарчиг болон Тайлбар */}
                  <div className="flex-1">
                    <h3
                      className={`text-base font-black tracking-tight ${
                        isSelected ? "text-indigo-950" : "text-slate-900"
                      }`}
                    >
                      {t.label}
                    </h3>
                    
                    {/* Тайлбарыг зөвхөн сонгосон үед харуулах (accordion effect) */}
                    {isSelected && t.desc && (
                      <div
                        className="mt-3 text-sm whitespace-pre-line leading-relaxed text-indigo-900/80 animate-in fade-in slide-in-from-top-2 duration-300"
                      >
                        {t.desc}
                      </div>
                    )}
                  </div>
                </div>

                {/* Баруун тал: Үнэ */}
                <div className="shrink-0 sm:text-right">
                  <span
                    className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold ${
                      isSelected
                        ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {t.price}
                  </span>
                </div>
              </div>

              {/* Хэрэв сонгогдсон бол Хугацааны сонголтууд ДОТОРОО нээгдэнэ */}
              {isSelected && t.durations.length > 0 && (
                <div className="mt-6 pt-5 border-t border-indigo-200/60">
                  <label className="block text-xs font-bold text-indigo-900 mb-3">
                    Гишүүнчлэлийн хугацаа сонгох <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {t.durations.map((d) => {
                      const isDurationSelected = durationMonths === String(d.months);
                      return (
                        <div
                          key={d.months}
                          onClick={(e) => {
                            e.stopPropagation(); // Гаднах карт руу click очихыг зогсоох
                            onDurationChange(String(d.months));
                          }}
                          className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                            isDurationSelected
                              ? "border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-200"
                              : "border-indigo-100 bg-white hover:border-indigo-400 text-slate-700"
                          }`}
                        >
                          <span className="text-sm font-semibold">{d.label}</span>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                            isDurationSelected ? "bg-white/20" : "bg-slate-100"
                          }`}>
                            {isDurationSelected && <CheckCircle2 size={14} className="text-white" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
