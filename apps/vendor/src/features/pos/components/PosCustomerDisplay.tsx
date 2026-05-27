"use client";

import { ReceiptText, ShieldCheck, ShoppingBag, Sparkles } from "lucide-react";
import type { CartLine, CartTotals } from "../types/pos.types";

type Props = {
  lines: CartLine[];
  totals: CartTotals;
  storeName?: string;
};

function formatMoney(value: number) {
  return `₮${Math.round(Number(value) || 0).toLocaleString("mn-MN")}`;
}

export function PosCustomerDisplay({
  lines,
  totals,
  storeName = "MGLSTORE",
}: Props) {
  const savings = totals.discountTotal;
  const latestProductId = lines[lines.length - 1]?.productId;
  const hasItems = lines.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#f6f7fb] text-slate-950">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-8 py-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-base font-black text-amber-400">
            M
          </div>
          <div>
            <span className="block text-2xl font-black tracking-tight text-slate-950">
              {storeName}
            </span>
            <span className="mt-1 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              Тавтай морилно уу
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
            Customer display
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            Terminal #1
          </p>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="flex min-h-0 flex-col px-8 py-6">
          <div className="mb-5 flex shrink-0 items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-500">
                Одоогийн худалдан авалт
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
                {hasItems
                  ? `${lines.length} бараа сонгогдлоо`
                  : "Бараа хүлээж байна"}
              </h1>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm sm:flex">
              <ReceiptText size={17} className="text-amber-500" />
              Live receipt
            </div>
          </div>

          {lines.length === 0 ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white text-center shadow-sm">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-amber-500">
                <ShoppingBag size={40} />
              </div>
              <p className="text-2xl font-black text-slate-900">
                Бараа нэмэгдэхийг хүлээж байна
              </p>
              <p className="mt-2 max-w-md text-sm font-medium text-slate-500">
                Касс дээр бараа уншуулах үед таны худалдан авалтын мэдээлэл энд
                шууд харагдана.
              </p>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="sticky top-0 z-10 grid grid-cols-[72px_minmax(0,1fr)_120px_160px] gap-4 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-wide text-white">
                <span>Зураг</span>
                <span>Бараа</span>
                <span className="text-center">Тоо</span>
                <span className="text-right">Нийт</span>
              </div>

              <div className="mt-3 space-y-3">
                {lines.map((line) => {
                  const lineTotal = line.qty * line.unitPrice;
                  const isLatest = line.productId === latestProductId;

                  return (
                    <div
                      key={line.productId}
                      className={`grid grid-cols-[72px_minmax(0,1fr)_120px_160px] items-center gap-4 rounded-2xl border px-4 py-3 transition-all ${
                        isLatest
                          ? "border-amber-300 bg-amber-50 shadow-sm"
                          : "border-slate-100 bg-slate-50/70"
                      }`}
                    >
                      <div className="relative h-[72px] w-[72px] overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        {line.imageUrl ? (
                          <img
                            src={line.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-50 to-slate-100 text-2xl font-black text-amber-500">
                            {line.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-2xl font-black tracking-tight text-slate-950">
                          {line.name}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                          Нэгж үнэ: {formatMoney(line.unitPrice)}
                        </p>
                        {line.discountAmount > 0 && (
                          <p className="mt-1 text-sm font-bold text-emerald-600">
                            -{formatMoney(line.discountAmount)} хэмнэлт
                          </p>
                        )}
                      </div>

                      <div className="text-center">
                        <p className="text-3xl font-black tabular-nums text-slate-950">
                          {line.qty}
                        </p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                          ширхэг
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-3xl font-black tabular-nums text-slate-950">
                          {formatMoney(lineTotal)}
                        </p>
                        {isLatest && (
                          <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-amber-600">
                            <Sparkles size={12} />
                            Сүүлд нэмсэн
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto border-l border-slate-200 bg-white px-6 py-6">
          <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl shadow-slate-300/40">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-400">
              Нийт төлөх дүн
            </p>
            <p className="mt-3 break-words text-6xl font-black leading-none tracking-tight text-white">
              {formatMoney(totals.grandTotal)}
            </p>
            <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
              <div className="flex justify-between text-sm text-white/65">
                <span>Дүн</span>
                <span className="font-bold tabular-nums text-white">
                  {formatMoney(totals.subTotal)}
                </span>
              </div>
              {totals.taxTotal > 0 && (
                <div className="flex justify-between text-sm text-white/65">
                  <span>НӨАТ</span>
                  <span className="font-bold tabular-nums text-white">
                    {formatMoney(totals.taxTotal)}
                  </span>
                </div>
              )}
              {savings > 0 && (
                <div className="flex justify-between text-sm font-bold text-emerald-300">
                  <span>Хөнгөлөлт</span>
                  <span className="tabular-nums">-{formatMoney(savings)}</span>
                </div>
              )}
            </div>
          </div>

          {savings > 0 && (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-center">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">
                Өнөөдрийн хэмнэлт
              </p>
              <p className="mt-1 text-3xl font-black tabular-nums text-emerald-700">
                {formatMoney(savings)}
              </p>
            </div>
          )}

          <div className="flex items-start gap-3 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-black text-amber-800">
                MGL Store урамшуулал
              </p>
              <p className="mt-1 text-sm leading-relaxed text-amber-700">
                Худалдан авалт бүрээс оноо болон урамшууллаа цуглуулаарай.
              </p>
            </div>
          </div>
        </aside>
      </main>

      <footer className="flex shrink-0 justify-between border-t border-slate-200 bg-white px-8 py-3 text-xs font-semibold text-slate-400">
        <span>Баярлалаа. Таны худалдан авалт амжилттай үргэлжилж байна.</span>
        <span>© 2026 MGL Store Industrial & Commerce</span>
      </footer>
    </div>
  );
}
