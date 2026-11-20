"use client";

import { useState } from "react";

export function commitStockRequestQuantity(
  text: string,
  quantity: number,
  available: number,
): number {
  if (!/^\d+$/.test(text.trim()) || available < 1) return quantity;
  const value = Number(text);
  return Number.isSafeInteger(value) && value > 0
    ? Math.min(value, available)
    : quantity;
}

/** Key by the canonical quantity so +/- controls reset any uncommitted input. */
export function StockRequestQuantityInput({
  name,
  quantity,
  available,
  disabled,
  onCommit,
}: {
  name: string;
  quantity: number;
  available: number;
  disabled: boolean;
  onCommit: (quantity: number) => void;
}) {
  const [text, setText] = useState(String(quantity));
  const commit = () => {
    const next = commitStockRequestQuantity(text, quantity, available);
    setText(String(next));
    if (next !== quantity) onCommit(next);
  };
  return (
    <input
      aria-label={`${name}-ийн тоо хэмжээ`}
      type="number"
      min={1}
      max={available}
      step={1}
      inputMode="numeric"
      value={text}
      disabled={disabled}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      className="h-10 w-11 min-w-0 border-x border-slate-200 bg-transparent text-center text-sm font-semibold tabular-nums text-slate-900 outline-none focus:bg-amber-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
  );
}
