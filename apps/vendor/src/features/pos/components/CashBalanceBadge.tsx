"use client";

import { Banknote, Loader2, RefreshCw } from "lucide-react";
import { formatMoney } from "../utils/pos-display-format";

interface Props {
  balance: number | null;
  hasShift: boolean;
  loading: boolean;
  error: string;
  onRefresh: () => void;
}

export function CashBalanceBadge({ balance, hasShift, loading, error, onRefresh }: Props) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={!hasShift || loading}
      title={error || "Тооцоолсон бэлэн үлдэгдэл · Дарж шинэчлэх"}
      aria-label={error ? `Бэлэн үлдэгдэл шинэчлэх: ${error}` : "Кассын бэлэн үлдэгдэл шинэчлэх"}
      className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-default ${error ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100" : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"}`}
    >
      <Banknote size={16} aria-hidden="true" />
      <span className="text-left">
        <span className="block text-[10px] font-medium">Кассын бэлэн</span>
        <span className="block font-bold tabular-nums" aria-live="polite">
          {!hasShift ? "Ээлж нээгээгүй" : error ? "Шинэчлэх" : balance !== null ? formatMoney(balance) : loading ? "Ачаалж байна…" : "—"}
        </span>
      </span>
      {loading ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : hasShift ? <RefreshCw size={12} aria-hidden="true" /> : null}
    </button>
  );
}
