"use client";
import { Banknote, Loader2 } from "lucide-react";

interface Props {
  value: string;
  busy: boolean;
  ready: boolean;
  error: string;
  registerName: string;
  onChange: (value: string) => void;
  onRefresh: () => void;
  onSubmit: () => Promise<void>;
}
export function ShiftOpeningForm({
  value,
  busy,
  ready,
  error,
  registerName,
  onChange,
  onRefresh,
  onSubmit,
}: Props) {
  const amount = Number(value);
  const valid =
    value.trim() !== "" &&
    Number.isFinite(amount) &&
    amount >= 0 &&
    Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001;
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (valid && ready && !busy) void onSubmit();
      }}
      className="space-y-5"
    >
      <div className="flex items-center gap-3 rounded-xl bg-blue-50 p-4">
        <Banknote size={26} className="text-blue-600" />
        <div>
          <p className="text-sm font-bold text-slate-900">{registerName}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Ээлж эхлэхэд кассанд байгаа бэлэн мөнгөө оруулна уу.
          </p>
        </div>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700"
        >
          {error}
        </p>
      )}
      {!ready && (
        <button
          type="button"
          disabled={busy}
          onClick={onRefresh}
          className="min-h-11 rounded-lg border px-3 text-sm"
        >
          {busy ? "Ээлж шалгаж байна…" : "Ээлж дахин шалгах"}
        </button>
      )}
      <label className="block text-sm font-bold text-slate-700">
        Эхлэх бэлэн мөнгө (₮)
        <input
          type="number"
          min="0"
          step="0.01"
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="0"
          className="mt-2 h-14 w-full rounded-xl border border-slate-300 px-4 text-2xl font-bold tabular-nums outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>
      <p className="text-xs text-slate-500">
        Эхлэх бэлэн мөнгөгүй бол 0 оруулна.
      </p>
      <button
        type="submit"
        disabled={busy || !ready || !valid}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy && <Loader2 size={17} className="animate-spin" />}
        {busy ? "Ээлж нээж байна…" : "Ээлж нээх"}
      </button>
    </form>
  );
}
