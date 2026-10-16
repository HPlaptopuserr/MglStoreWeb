"use client";
import { useState } from "react";
export function TransferPricingToolbar({
  disabled,
  onApply,
}: {
  disabled: boolean;
  onApply: (percent: number) => void;
}) {
  const [custom, setCustom] = useState("");
  const valid =
    custom.trim() !== "" &&
    Number.isFinite(Number(custom)) &&
    Number(custom) >= 0 &&
    Number(custom) <= 1000;
  return (
    <div className="flex flex-wrap items-center gap-2 border-y border-slate-100 bg-slate-50/70 px-5 py-4">
      <div className="mr-3">
        <p className="text-sm font-semibold text-slate-700">Үнийн нэмэгдэл</p>
        <p className="text-xs text-slate-500">
          Батлаагүй мөрүүдийн суурь үнээс тооцно
        </p>
      </div>
      {[10, 20, 30, 40].map((percent) => (
        <button
          key={percent}
          type="button"
          disabled={disabled}
          onClick={() => onApply(percent)}
          className="rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50 disabled:opacity-40"
        >
          +{percent}%
        </button>
      ))}
      <label className="ml-auto flex items-center gap-2 text-sm text-slate-500">
        <input
          aria-label="Өөр үнийн нэмэгдэл хувь"
          disabled={disabled}
          type="number"
          min={0}
          max={1000}
          step="0.1"
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          placeholder="Өөр"
          className="h-9 w-20 rounded-lg border border-slate-200 bg-white px-2 text-right outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
        %
      </label>
      <button
        type="button"
        disabled={disabled || !valid}
        onClick={() => onApply(Number(custom))}
        className="rounded-lg bg-slate-200/70 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200 disabled:opacity-40"
      >
        Хэрэглэх
      </button>
    </div>
  );
}
