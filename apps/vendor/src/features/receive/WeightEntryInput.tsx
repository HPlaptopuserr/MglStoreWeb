"use client";

import { useState } from "react";
interface Props {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number | "any";
  onChange: (value: string) => void;
}
export function WeightEntryInput({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      aria-label={label}
      type="number"
      inputMode="decimal"
      min={min}
      max={max}
      step={step}
      value={draft ?? value}
      placeholder="Оруулах"
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        if (next === "" && min === 0) onChange("");
        else if (next !== "" && event.target.validity.valid) onChange(next);
      }}
      onBlur={() => setDraft(null)}
      className="h-10 w-full min-w-24 rounded-lg border border-slate-200 bg-white px-2 text-right text-sm tabular-nums outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
  );
}
