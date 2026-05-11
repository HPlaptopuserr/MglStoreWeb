"use client";

import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import type { MembershipType, Duration } from "./_types";

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
            {type.desc || "Тайлбар байхгүй"}
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
        <div className="border-t border-slate-100 px-4 pb-5 pt-4 space-y-4">

          {/* Label + price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">
                Нэр <span className="text-red-400">*</span>
              </label>
              <input
                value={type.label}
                onChange={(e) => onChange({ ...type, label: e.target.value })}
                className={inp}
                placeholder="А. Энгийн гишүүн"
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
                placeholder="60,000–180,000₮"
              />
            </div>
          </div>

          {/* Description — fixed height, scrollable, no overflow */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Тайлбар</label>
              <span className="text-[9px] text-slate-300">{type.desc.length} тэмдэгт</span>
            </div>
            <textarea
              value={type.desc}
              onChange={(e) => onChange({ ...type, desc: e.target.value })}
              rows={3}
              className={`${inp} resize-y min-h-[72px] max-h-[160px] overflow-y-auto`}
              placeholder="Сургалтад 50% хөнгөлөлт, 5 бараа байршуулах эрх..."
            />
            <p className="text-[9px] text-slate-400 mt-1">
              Маягт дээр 2 мөр хэмжээгээр харагдана. Урт тайлбар автоматаар хаагдана.
            </p>
          </div>

          {/* Durations */}
          <div>
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
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-lg px-2.5 py-1 hover:bg-indigo-50 transition-colors"
              >
                <Plus size={11} />Нэмэх
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
      )}
    </div>
  );
}
