import { Banknote, ReceiptText, Star } from "lucide-react";
import type { CartTotals } from "../../types/pos.types";
import { formatMoney } from "../../utils/pos-display-format";

export function CustomerDisplayWelcome({ points }: { points?: number | null }) {
  return (
    <section className="shrink-0 rounded-2xl bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 p-5 text-white shadow-lg shadow-slate-900/10">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold tracking-wide text-emerald-400">
          <Star size={12} fill="currentColor" />
          ЛОЯЛТИ ХӨТӨЛБӨР
        </span>
        <span className="rounded-md bg-white/10 px-2 py-1 text-[10px] font-bold text-slate-300">
          MGL Club
        </span>
      </div>
      <h2 className="mt-3 text-2xl font-extrabold tracking-tight">
        Тавтай морилно уу!
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">
        {points != null ? (
          <>
            Энэ худалдан авалтаас{" "}
            <strong className="font-extrabold text-emerald-400">
              +{points.toLocaleString("mn-MN")} оноо
            </strong>{" "}
            цуглуулах боломжтой.
          </>
        ) : (
          "Худалдан авалт хийх бүрдээ M Point цуглуулаарай."
        )}
      </p>
      <p className="mt-3 border-t border-white/15 pt-3 text-xs leading-5 text-slate-400">
        {points != null
          ? "Оноо төлбөр баталгаажсаны дараа нэмэгдэнэ."
          : "M Point ашиглах бол кассчинд мэдэгдэнэ үү."}
      </p>
    </section>
  );
}

export function CustomerDisplaySummary({
  totals,
  hasItems,
  points,
}: {
  totals: CartTotals;
  hasItems: boolean;
  points?: number | null;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <h2 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
          Тооцооны хураангуй
        </h2>
        <ReceiptText size={16} className="text-slate-400" />
      </header>
      <dl className="space-y-3 py-4 text-xs text-slate-500">
        <div className="flex justify-between gap-3">
          <dt>Барааны дүн</dt>
          <dd className="font-bold tabular-nums text-slate-800">
            {formatMoney(totals.subTotal)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>НӨАТ (үнэд багтсан)</dt>
          <dd className="font-bold tabular-nums text-slate-800">
            {formatMoney(totals.taxTotal)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Хямдрал, урамшуулал</dt>
          <dd className="font-bold tabular-nums text-emerald-600">
            −{formatMoney(totals.discountTotal)}
          </dd>
        </div>
        {points != null && (
          <div className="flex justify-between gap-3">
            <dt>Цуглуулах оноо</dt>
            <dd className="font-bold tabular-nums text-amber-600">
              +{points.toLocaleString("mn-MN")} оноо
            </dd>
          </div>
        )}
      </dl>
      <div className="mt-auto border-t border-dashed border-slate-200 pt-4">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 p-5 text-white shadow-lg shadow-slate-900/10">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-300">
              <Banknote size={17} className="text-emerald-400" />
              Төлөх дүн
            </span>
            <span className="text-[10px] text-slate-400">Төгрөг (MNT)</span>
          </div>
          <p
            className="mt-3 break-words font-mono text-[clamp(2rem,4.2vw,4.5rem)] font-bold leading-tight tracking-tight tabular-nums"
            aria-live="polite"
          >
            {formatMoney(totals.grandTotal)}
          </p>
        </div>
        <p className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] font-semibold text-slate-500">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${hasItems ? "bg-emerald-500" : "bg-slate-300"}`}
          />
          {hasItems
            ? "Төлбөр төлөхийг хүлээж байна…"
            : "Таны худалдан авалтыг хүлээж байна"}
        </p>
      </div>
    </section>
  );
}
