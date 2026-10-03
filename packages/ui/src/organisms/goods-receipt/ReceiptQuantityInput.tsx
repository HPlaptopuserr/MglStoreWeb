"use client";

import { useState } from "react";

interface Props {
  label: string;
  value: number;
  min: number;
  step: number;
  className: string;
  onChange: (value: number) => void;
}

export function ReceiptQuantityInput({
  label,
  value,
  min,
  step,
  className,
  onChange,
}: Props) {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <input
      aria-label={label}
      type="number"
      inputMode={step < 1 ? "decimal" : "numeric"}
      min={min}
      max={1000000}
      step={step}
      value={draft ?? value}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        if (next !== "" && event.target.validity.valid) {
          onChange(Number(next));
        }
      }}
      onBlur={() => setDraft(null)}
      className={`${className} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
    />
  );
}
