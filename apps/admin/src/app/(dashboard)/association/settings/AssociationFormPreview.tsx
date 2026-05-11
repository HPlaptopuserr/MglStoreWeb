"use client";

import { useState } from "react";
import type { AssociationConfig } from "./_types";

const inputCls =
  "w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-300 select-none pointer-events-none";

interface Props {
  config: AssociationConfig;
}

export function AssociationFormPreview({ config }: Props) {
  const [selectedType, setSelectedType] = useState("");
  const selected = config.membershipTypes.find((t) => t.value === selectedType);

  return (
    /* Outer shell — phone-like frame */
    <div className="relative bg-slate-200 rounded-[28px] p-3 shadow-xl shadow-slate-300/60">
      {/* Screen */}
      <div
        className="bg-white rounded-[20px] overflow-hidden"
        style={{ height: "calc(100vh - 220px)", minHeight: 520, maxHeight: 780 }}
      >
        {/* Browser bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-3 py-2 flex items-center gap-2 shrink-0">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <div className="flex-1 bg-white rounded-md px-2 py-0.5 text-[9px] text-slate-400 font-mono border border-slate-200 truncate">
            mglstore.mn/association
          </div>
        </div>

        {/* Scrollable page content */}
        <div className="overflow-y-auto h-[calc(100%-32px)] bg-slate-50">
          <div className="max-w-xs mx-auto py-5 px-4">

            {/* Page header */}
            <div className="text-center mb-4">
              <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest mb-1">
                {config.pageLabel || "БҮРТГЭЛИЙН ХУУДАС"}
              </p>
              <h1 className="text-[11px] font-black text-slate-900 leading-snug whitespace-pre-line">
                {config.pageTitle}
              </h1>
              <p className="text-[10px] text-slate-500 mt-1">{config.pageSubtitle}</p>
            </div>

            {/* Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-2.5">
              {/* Name row */}
              <div className="grid grid-cols-2 gap-2">
                {["Овог *", "Нэр *"].map((l) => (
                  <div key={l}>
                    <p className="text-[9px] font-bold text-slate-500 mb-0.5">{l}</p>
                    <div className={inputCls}>&nbsp;</div>
                  </div>
                ))}
              </div>

              {/* Fields */}
              {["Байгууллага нэр *", "Утас *", "Байгууллагын хаяг *"].map((l) => (
                <div key={l}>
                  <p className="text-[9px] font-bold text-slate-500 mb-0.5">{l}</p>
                  <div className={inputCls}>&nbsp;</div>
                </div>
              ))}

              {/* Membership types */}
              <div>
                <p className="text-[9px] font-bold text-slate-500 mb-1.5">
                  Та ямар гишүүн болох вэ? *
                </p>
                <div className="space-y-1">
                  {config.membershipTypes.map((t) => (
                    <div
                      key={t.value}
                      onClick={() => setSelectedType(t.value)}
                      className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                        selectedType === t.value
                          ? "border-indigo-400 bg-indigo-50"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {/* Radio dot */}
                      <div className={`w-3 h-3 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${
                        selectedType === t.value ? "border-indigo-500" : "border-slate-300"
                      }`}>
                        {selectedType === t.value && (
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-slate-900 leading-tight">{t.label}</p>
                        {/* Clamp description — key fix: no overflow with long text */}
                        <p
                          className="text-[9px] text-slate-500 mt-0.5 leading-tight"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {t.desc}
                        </p>
                        <p className="text-[9px] font-bold text-indigo-600 mt-0.5">{t.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Duration select */}
              {selected && selected.durations.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold text-slate-500 mb-0.5">Хугацаа *</p>
                  <div className={`${inputCls} text-slate-400`}>Хугацаа сонгоно уу...</div>
                </div>
              )}

              {/* Submit */}
              <button className="w-full py-2 bg-indigo-600 text-white text-[10px] font-bold rounded-lg mt-1">
                Бүртгүүлэх
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
