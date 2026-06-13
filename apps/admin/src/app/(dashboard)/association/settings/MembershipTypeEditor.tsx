"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import type { MembershipType, Duration } from "./_types";
import { MembershipCardPreview } from "./MembershipCardPreview";
import { getFeatureRows } from "./membershipTypeUtils";

// ── Duration row ──────────────────────────────────────────────────────────────
function DurationRow({
  dur, onRemove, onChange,
}: {
  dur: Duration;
  onRemove: () => void;
  onChange: (u: Duration) => void;
}) {
  const cell = "w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-400 bg-white";

  return (
    <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
      <GripVertical size={13} className="text-slate-300 shrink-0 cursor-grab" />
      <div className="flex-1 grid grid-cols-3 gap-2">
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Сар</p>
          <input
            type="number"
            min={1}
            value={dur.months ?? ""}
            onChange={(e) => onChange({ ...dur, months: e.target.value ? Number(e.target.value) : null })}
            placeholder="1"
            className={cell}
          />
        </div>
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Үнэ (₮)</p>
          <input
            type="number"
            min={0}
            value={dur.price || ""}
            onChange={(e) => onChange({ ...dur, price: Number(e.target.value) })}
            placeholder="60000"
            className={cell}
          />
        </div>
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Харуулах нэр</p>
          <input
            type="text"
            value={dur.label}
            onChange={(e) => onChange({ ...dur, label: e.target.value })}
            placeholder="1 Сар – 60,000₮"
            className={cell}
          />
        </div>
      </div>
      <button
        onClick={onRemove}
        className="w-6 h-6 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 flex items-center justify-center transition-colors shrink-0"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  type: MembershipType;
  idx: number;
  onChange: (updated: MembershipType) => void;
  onRemove: () => void;
}

export function MembershipTypeEditor({ type, idx, onChange, onRemove }: Props) {
  const [open, setOpen] = useState(false);

  const inp = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white";

  const updateDuration = (dIdx: number, updated: Duration) => {
    const next = [...type.durations];
    next[dIdx] = updated;
    onChange({ ...type, durations: next });
  };

  const removeDuration = (dIdx: number) =>
    onChange({ ...type, durations: type.durations.filter((_, i) => i !== dIdx) });

  const addDuration = () =>
    onChange({ ...type, durations: [...type.durations, { months: null, price: 0, label: "" }] });

  // color accent per index
  const accents = [
    "bg-slate-100 text-slate-600",
    "bg-blue-100 text-blue-700",
    "bg-violet-100 text-violet-700",
    "bg-amber-100 text-amber-700",
  ];
  const accent = accents[idx % accents.length];
  const featureRows = getFeatureRows(type.desc);
  const activeFeatureCount = featureRows.filter((row) => row.enabled).length;
  const disabledFeatureCount = featureRows.length - activeFeatureCount;

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${open ? "border-indigo-200 shadow-sm" : "border-slate-200"} bg-white`}>
      {/* Collapsed header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50/80 transition-colors select-none"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${accent}`}>
          {idx + 1}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">
            {type.label || <span className="text-slate-400 font-normal italic">Нэргүй төрөл</span>}
          </p>
          {/* desc preview — always one line, truncated */}
          <p className="text-[11px] text-slate-400 truncate leading-snug">
            {featureRows.length > 0
              ? `${featureRows.length} feature · ${type.durations.length} хугацаа`
              : "Feature мөр байхгүй"}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {type.price && (
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg truncate max-w-[100px]">
              {type.price}
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="w-6 h-6 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 flex items-center justify-center transition-colors"
          >
            <Trash2 size={11} />
          </button>
          {open
            ? <ChevronUp size={14} className="text-slate-400" />
            : <ChevronDown size={14} className="text-slate-400" />
          }
        </div>
      </div>

      {/* Expanded body */}
      {open && (
        <div className="border-t border-slate-100 bg-gradient-to-b from-white to-slate-50/70 px-4 pb-5 pt-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Feature</p>
                  <p className="mt-0.5 text-lg font-black text-slate-900">{featureRows.length}</p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                  <p className="text-[9px] font-black uppercase tracking-wide text-emerald-600">Active</p>
                  <p className="mt-0.5 text-lg font-black text-emerald-700">{activeFeatureCount}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Disabled</p>
                  <p className="mt-0.5 text-lg font-black text-slate-500">{disabledFeatureCount}</p>
                </div>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2">
                  <p className="text-[9px] font-black uppercase tracking-wide text-indigo-500">Duration</p>
                  <p className="mt-0.5 text-lg font-black text-indigo-700">{type.durations.length}</p>
                </div>
              </div>

              {/* Label + price */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">
                    Нэр <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={type.label}
                    onChange={(e) => onChange({ ...type, label: e.target.value })}
                    className={inp}
                    placeholder="Silver"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">
                    Үнийн дүн (текст)
                  </label>
                  <input
                    value={type.price}
                    onChange={(e) => onChange({ ...type, price: e.target.value })}
                    className={inp}
                    placeholder="30,000₮ / сар"
                  />
                </div>
              </div>

              {/* Card feature text */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      Card feature мөрүүд
                    </label>
                    <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                      Мөр бүр popup card дээр тусдаа bullet болж харагдана.
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">
                    {featureRows.length} мөр
                  </span>
                </div>
                <textarea
                  value={type.desc}
                  onChange={(e) => onChange({ ...type, desc: e.target.value })}
                  rows={6}
                  className={`${inp} resize-y min-h-[144px] max-h-[260px] overflow-y-auto whitespace-pre-line text-[13px] leading-6`}
                  placeholder={"Стандарт бүтээгдэхүүний хөнгөлөлт\nСтандарт хэрэглэгчийн дэмжлэг\n- Priority хүргэлтийн үйлчилгээ"}
                />
                <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold">
                  <span className="rounded-full bg-orange-50 px-2 py-1 text-orange-600">
                    Энгийн мөр = active
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-500">
                    - эхэлсэн мөр = disabled
                  </span>
                </div>
              </div>

              {/* Durations */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      Хугацааны сонголтууд
                    </label>
                    <p className="text-[9px] text-slate-400 mt-0.5">
                      {type.durations.length === 0 ? "Үнэгүй — хугацаа байхгүй" : `${type.durations.length} сонголт`}
                    </p>
                  </div>
                  <button
                    onClick={addDuration}
                    className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 px-3 py-2 text-xs font-black text-indigo-600 transition-colors hover:bg-indigo-50 hover:text-indigo-800"
                  >
                    <Plus size={12} />Нэмэх
                  </button>
                </div>

                {type.durations.length === 0 ? (
                  <div className="border border-dashed border-slate-200 rounded-xl py-4 text-center">
                    <p className="text-xs text-slate-400">Хугацааны сонголт байхгүй</p>
                    <p className="text-[10px] text-slate-300 mt-0.5">Энгийн гишүүнчлэлд тохиромжтой</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {type.durations.map((d, dIdx) => (
                      <DurationRow
                        key={dIdx}
                        dur={d}
                        onChange={(u) => updateDuration(dIdx, u)}
                        onRemove={() => removeDuration(dIdx)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <MembershipCardPreview type={type} idx={idx} />
          </div>
        </div>
      )}
    </div>
  );
}
