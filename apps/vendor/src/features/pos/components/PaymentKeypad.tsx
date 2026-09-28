"use client";

import { Delete, RotateCcw } from "lucide-react";

const KEYS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  ".",
  "0",
  "⌫",
] as const;
const QUICK_AMOUNTS = [10_000, 20_000, 50_000, 100_000];

interface Props {
  disabled?: boolean;
  onKey: (key: string) => void;
  onAmount: (amount: string) => void;
}

export function PaymentKeypad({ disabled, onKey, onAmount }: Props) {
  return (
    <section
      aria-label="Төлбөрийн тоон гар"
      className="flex min-h-[220px] flex-1 flex-col gap-2"
    >
      <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-4 gap-1.5">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => onKey(key)}
            aria-label={key === "⌫" ? "Сүүлийн цифр арилгах" : key}
            className={`flex min-h-10 select-none items-center justify-center rounded-xl border text-lg font-bold transition-colors focus-visible:outline-2 focus-visible:outline-amber-400 disabled:opacity-40 ${key === "⌫" ? "border-zinc-700 bg-zinc-800 text-amber-400 hover:bg-amber-950" : "border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800 active:bg-zinc-700"}`}
          >
            {key === "⌫" ? <Delete size={18} /> : key}
          </button>
        ))}
      </div>
      <div className="grid shrink-0 grid-cols-5 gap-1.5">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAmount("")}
          aria-label="Оруулсан дүнг цэвэрлэх"
          className="flex min-h-10 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-rose-400 transition-colors hover:bg-rose-950 focus-visible:outline-2 focus-visible:outline-amber-400 disabled:opacity-40"
        >
          <RotateCcw size={15} />
        </button>
        {QUICK_AMOUNTS.map((amount) => (
          <button
            key={amount}
            type="button"
            disabled={disabled}
            onClick={() => onAmount(String(amount))}
            className="min-h-10 rounded-lg border border-zinc-800 bg-zinc-900 text-xs font-bold text-zinc-300 transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-amber-400 disabled:opacity-40"
          >
            ₮{amount / 1000}К
          </button>
        ))}
      </div>
    </section>
  );
}
