"use client";

import { ShoppingBag, Star } from "lucide-react";
import type { CartLine, CartTotals } from "../types/pos.types";

type Props = {
  lines: CartLine[];
  totals: CartTotals;
  storeName?: string;
};

export function PosCustomerDisplay({ lines, totals, storeName = "MGLSTORE" }: Props) {
  const savings = totals.discountTotal;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-slate-50 text-slate-950">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-8 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xl font-black tracking-tight text-slate-950">{storeName}</span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            Тавтай морилно уу
          </span>
        </div>
        <div className="text-xs font-semibold text-slate-400">Terminal #1</div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <p className="mb-1 text-sm font-bold text-slate-800">Одоогийн худалдан авалт</p>
          <p className="mb-6 text-xs text-slate-500">{lines.length} бараа</p>

          {lines.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-slate-400">
              <ShoppingBag size={36} className="mb-3" />
              <p className="text-sm font-semibold">Бараа нэмэгдэхийг хүлээж байна</p>
            </div>
          ) : (
            <div className="space-y-4">
              {lines.map((line) => (
                <div
                  key={line.productId}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                >
                  <div className="flex h-12 w-12 shrink-0 select-none items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-xl font-black text-amber-600">
                    {line.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-950">{line.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">Тоо: {line.qty}</p>
                    {line.discountAmount > 0 && (
                      <p className="mt-0.5 text-xs font-semibold text-emerald-600">
                        -₮{(line.discountAmount * line.qty).toLocaleString()} хэмнэлт
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold tabular-nums text-slate-900">
                      ₮{(line.qty * line.unitPrice).toLocaleString()}
                    </p>
                    {line.discountAmount > 0 && (
                      <p className="text-xs tabular-nums text-slate-400 line-through">
                        ₮{(line.qty * (line.unitPrice + line.discountAmount)).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex w-[300px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-slate-200 bg-white px-6 py-6">
          <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Дүн</span>
              <span className="tabular-nums">₮{totals.subTotal.toLocaleString()}</span>
            </div>
            {totals.taxTotal > 0 && (
              <div className="flex justify-between text-sm text-slate-500">
                <span>НӨАТ</span>
                <span className="tabular-nums">₮{totals.taxTotal.toLocaleString()}</span>
              </div>
            )}
            {savings > 0 && (
              <div className="flex justify-between text-sm font-semibold text-emerald-600">
                <span>Хөнгөлөлт</span>
                <span className="tabular-nums">-₮{savings.toLocaleString()}</span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-3 text-center">
              <p className="text-[10px] uppercase tracking-widest text-slate-400">Нийт</p>
              <p className="mt-1 text-4xl font-black leading-none tabular-nums text-amber-500">
                ₮{totals.grandTotal.toLocaleString()}
              </p>
            </div>
          </div>

          {savings > 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                Өнөөдрийн хэмнэлт
              </p>
              <p className="mt-1 text-3xl font-black tabular-nums text-emerald-700">
                ₮{savings.toLocaleString()}
              </p>
            </div>
          )}

          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
            <Star size={16} className="mt-0.5 shrink-0 text-amber-500" />
            <div>
              <p className="text-xs font-bold text-amber-700">Loyalty Points</p>
              <p className="mt-0.5 text-xs leading-relaxed text-amber-700">
                Худалдан авалт бүрээс оноо цуглуулаарай
              </p>
            </div>
          </div>
        </div>
      </div>

      <footer className="flex shrink-0 justify-between border-t border-slate-200 bg-white px-8 py-3 text-xs text-slate-400">
        <span>Нууцлалын бодлого • Үйлчилгээний нөхцөл</span>
        <span>© 2025 MGL Store Industrial & Commerce</span>
      </footer>
    </div>
  );
}
