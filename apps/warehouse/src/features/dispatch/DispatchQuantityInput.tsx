"use client";

import { useState } from "react";

export function commitDispatchQuantity(text: string, previous: number): number {
  if (!/^\d+$/.test(text.trim())) return previous;
  const quantity = Number(text);
  return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : previous;
}

/** Key by the committed quantity so the adjacent +/- buttons reset the draft. */
export function DispatchQuantityInput({
  name,
  quantity,
  available,
  onCommit,
}: {
  name: string;
  quantity: number;
  available: number;
  onCommit: (quantity: number) => void;
}) {
  const [text, setText] = useState(String(quantity));
  const commit = () => {
    const next = commitDispatchQuantity(text, quantity);
    setText(String(next));
    if (next !== quantity) onCommit(next);
  };
  return (
    <input
      aria-label={`${name} гаргах тоо`}
      type="number"
      inputMode="numeric"
      min={1}
      max={available}
      step={1}
      value={text}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      className={`h-8 w-14 border-0 bg-transparent text-center text-sm font-bold outline-none focus:bg-blue-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${quantity > available ? "text-red-600" : "text-slate-900"}`}
    />
  );
}
