"use client";

import { useState } from "react";
import { Loader2, type LucideIcon } from "lucide-react";

interface RecordedAmountFormProps {
  label: string;
  description: string;
  submitLabel: string;
  icon: LucideIcon;
  busy: boolean;
  initialValue?: string;
  onSubmit: (amount: string) => Promise<boolean>;
  onSaved: () => void;
}

export function RecordedAmountForm({
  label,
  description,
  submitLabel,
  icon: Icon,
  busy,
  initialValue = "",
  onSubmit,
  onSaved,
}: RecordedAmountFormProps) {
  const [amount, setAmount] = useState(initialValue);
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (await onSubmit(amount.trim())) onSaved();
      }}
      className="mt-4 space-y-3"
    >
      <label className="block text-xs font-semibold text-slate-600">
        {label}
        <input
          type="text"
          inputMode="decimal"
          placeholder="Жишээ: 1000000"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          pattern="(0|[1-9][0-9]{0,11})(\.[0-9]{1,2})?"
          required
          maxLength={15}
          disabled={busy}
          className="mt-2 block min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
        />
      </label>
      <p className="text-xs leading-5 text-slate-500">{description}</p>
      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Icon className="size-4" />
        )}
        {submitLabel}
      </button>
    </form>
  );
}
