"use client";
import { memo, useEffect, useRef } from "react";
import Image from "next/image";
import { Check, Info, Package, ShoppingBag } from "lucide-react";
import { formatPosQuantity } from "@mgl/types";
import type { CartLine } from "../../types/pos.types";
import { formatMoney } from "../../utils/pos-display-format";

const DisplayItem = memo(function DisplayItem({
  line,
  latest,
}: {
  line: CartLine;
  latest: boolean;
}) {
  const total = Math.max(0, line.qty * line.unitPrice - line.discountAmount);
  return (
    <article
      className={`relative grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border p-3 shadow-sm sm:grid-cols-[48px_minmax(0,1fr)_72px_minmax(80px,auto)] ${latest ? "border-[var(--cd-accent)] bg-[var(--cd-soft)] ring-1 ring-[var(--cd-accent)]" : "border-slate-200 bg-white"}`}
    >
      <div
        className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl ${latest ? "bg-[var(--cd-accent)] text-white" : "border border-amber-100 bg-amber-50 text-amber-600"}`}
      >
        {line.imageUrl ? (
          <Image
            src={line.imageUrl}
            alt=""
            width={44}
            height={44}
            unoptimized
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : latest ? (
          <Check size={25} />
        ) : (
          <Package size={25} />
        )}
      </div>
      <div className="min-w-0">
        <h3 className="line-clamp-2 break-words text-sm font-bold leading-5 text-slate-900 lg:text-base">
          {line.name}
        </h3>
        <p
          className={`mt-1 text-xs ${latest ? "text-[var(--cd-accent)]" : "text-slate-500"}`}
        >
          Нэгж үнэ:{" "}
          <span className="font-semibold tabular-nums">
            {formatMoney(line.unitPrice)}
            {line.measureUnit === "kg" ? " / кг" : " / ш"}
          </span>
        </p>
        {line.discountAmount > 0 && (
          <p className="mt-1 text-xs font-semibold text-emerald-700">
            Хямдрал −{formatMoney(line.discountAmount)}
          </p>
        )}
        <p className="mt-1 text-xs font-bold text-slate-600 sm:hidden">
          {formatPosQuantity(line.qty, line.measureUnit)}
        </p>
      </div>
      <div
        className={`hidden rounded-xl border px-2 py-2 text-center sm:block ${latest ? "border-blue-100 bg-white/70" : "border-slate-200 bg-slate-50"}`}
      >
        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
          Тоо
        </p>
        <p className="mt-1 text-sm font-bold text-slate-800">
          {formatPosQuantity(line.qty, line.measureUnit)}
        </p>
      </div>
      <p
        className={`break-words text-right text-lg font-black tabular-nums lg:text-xl ${latest ? "text-[var(--cd-accent)]" : "text-slate-900"}`}
      >
        {formatMoney(total)}
      </p>
    </article>
  );
});

export function CustomerDisplayItems({ lines }: { lines: CartLine[] }) {
  const latest = lines.at(-1);
  const lastRow = useRef<HTMLLIElement>(null);
  useEffect(() => {
    lastRow.current?.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [latest?.productId, latest?.qty]);
  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Одоогийн худалдан авалт
          </p>
          <h2 className="mt-1 flex flex-wrap items-center gap-2 text-xl font-extrabold tracking-tight text-slate-900">
            Авсан бараанууд{" "}
            <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
              {lines.length} нэр төрөл
            </span>
          </h2>
        </div>
        {latest && (
          <p
            className="max-w-64 truncate rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[10px] font-semibold text-blue-700"
            title={latest.name}
          >
            Сүүлд нэмэгдсэн: {latest.name}
          </p>
        )}
      </header>
      {lines.length ? (
        <ul
          aria-label="Худалдан авсан бараанууд"
          className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4 [scrollbar-gutter:stable]"
        >
          {lines.map((line, index) => (
            <li
              key={line.productId}
              ref={index === lines.length - 1 ? lastRow : undefined}
            >
              <DisplayItem line={line} latest={index === lines.length - 1} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex min-h-64 flex-1 flex-col items-center justify-center p-6 text-center">
          <ShoppingBag size={48} className="mb-4 text-[var(--cd-accent)]" />
          <h3 className="text-xl font-bold text-slate-800">
            Тавтай морилно уу!
          </h3>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
            Бараа уншуулах үед таны худалдан авалт энд харагдана.
          </p>
        </div>
      )}
      <footer className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-[10px] text-slate-400">
        <Info size={13} className="shrink-0" />
        Бараа нэмэх үед автоматаар шинэчлэгдэнэ.
      </footer>
    </section>
  );
}
