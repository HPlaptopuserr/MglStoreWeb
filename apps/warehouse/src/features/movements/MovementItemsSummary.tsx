import { TrendingUp, TrendingDown, ArrowLeftRight } from "lucide-react";
import type { LedgerEntry } from "./movement-ledger.model";

export function MovementItemsSummary({
  entries,
  total,
}: {
  entries: LedgerEntry[];
  total: number;
}) {
  // Stats
  const inCount = entries.filter((e) => e.change > 0).length;
  const outCount = entries.filter((e) => e.change < 0).length;
  const totalIn = entries
    .filter((e) => e.change > 0)
    .reduce((s, e) => s + e.change, 0);
  const totalOut = entries
    .filter((e) => e.change < 0)
    .reduce((s, e) => s + Math.abs(e.change), 0);

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Нийт хөдөлгөөн
        </p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{total}</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
            Орлого · энэ хуудас
          </p>
        </div>
        <p className="mt-1 text-2xl font-bold text-emerald-600">+{totalIn}</p>
        <p className="text-xs text-slate-400">{inCount} бичилт</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-red-500" />
          <p className="text-xs font-semibold uppercase tracking-wider text-red-600">
            Зарлага · энэ хуудас
          </p>
        </div>
        <p className="mt-1 text-2xl font-bold text-red-600">-{totalOut}</p>
        <p className="text-xs text-slate-400">{outCount} бичилт</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="h-4 w-4 text-blue-500" />
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            Өөрчлөлт · энэ хуудас
          </p>
        </div>
        <p
          className={`mt-1 text-2xl font-bold ${
            totalIn - totalOut >= 0 ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {totalIn - totalOut >= 0 ? "+" : ""}
          {totalIn - totalOut}
        </p>
      </div>
    </div>
  );
}
