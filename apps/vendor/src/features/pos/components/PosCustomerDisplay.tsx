"use client";

import { Star, ShoppingBag } from "lucide-react";
import type { CartLine, CartTotals } from "../types/pos.types";

type Props = {
  lines: CartLine[];
  totals: CartTotals;
  storeName?: string;
};

export function PosCustomerDisplay({ lines, totals, storeName = "MGLSTORE" }: Props) {
  const savings = totals.discountTotal;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl font-black tracking-tight text-amber-400">{storeName}</span>
          <span className="text-xs font-semibold text-emerald-300 bg-emerald-950 border border-emerald-800 px-2.5 py-0.5 rounded-full">
            Тавтай морилно уу
          </span>
        </div>
        <div className="text-xs text-zinc-600">Terminal #1</div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Current sale items */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <p className="text-sm font-bold text-zinc-300 mb-1">Одоогийн худалдан авалт</p>
          <p className="text-xs text-zinc-600 mb-6">{lines.length} бараа</p>

          {lines.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-zinc-700">
              <ShoppingBag size={36} className="mb-3" />
              <p className="text-sm">Бараа нэмэгдэж байна...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {lines.map((line) => (
                <div key={line.productId} className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xl font-black text-amber-500 shrink-0 select-none">
                    {line.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{line.name}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Тоо: {line.qty}</p>
                    {line.discountAmount > 0 && (
                      <p className="text-xs text-emerald-400 mt-0.5 font-semibold">
                        ▼ ₮{(line.discountAmount * line.qty).toLocaleString()} хэмнэлт
                      </p>
                    )}
                  </div>

                  {/* Line total */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-zinc-200 tabular-nums">
                      ₮{(line.qty * line.unitPrice).toLocaleString()}
                    </p>
                    {line.discountAmount > 0 && (
                      <p className="text-xs text-zinc-600 line-through tabular-nums">
                        ₮{(line.qty * (line.unitPrice + line.discountAmount)).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Summary panel */}
        <div className="w-[300px] shrink-0 border-l border-zinc-800 px-6 py-6 flex flex-col gap-4 overflow-y-auto">
          {/* Totals */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 px-5 py-5 space-y-2.5">
            <div className="flex justify-between text-sm text-zinc-500">
              <span>Дүн</span>
              <span className="tabular-nums">₮{totals.subTotal.toLocaleString()}</span>
            </div>
            {totals.taxTotal > 0 && (
              <div className="flex justify-between text-sm text-zinc-500">
                <span>НӨАТ</span>
                <span className="tabular-nums">₮{totals.taxTotal.toLocaleString()}</span>
              </div>
            )}
            {savings > 0 && (
              <div className="flex justify-between text-sm text-emerald-400 font-semibold">
                <span>Хөнгөлөлт</span>
                <span className="tabular-nums">-₮{savings.toLocaleString()}</span>
              </div>
            )}
            <div className="pt-3 border-t border-zinc-700 text-center">
              <p className="text-[10px] uppercase tracking-widest text-zinc-600">Нийт</p>
              <p className="text-4xl font-black text-amber-400 tabular-nums mt-1 leading-none">
                ₮{totals.grandTotal.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Savings badge */}
          {savings > 0 && (
            <div className="rounded-2xl bg-emerald-950 border border-emerald-800 px-5 py-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">
                Өнөөдрийн хэмнэлт
              </p>
              <p className="text-3xl font-black text-emerald-300 mt-1 tabular-nums">
                ₮{savings.toLocaleString()}
              </p>
            </div>
          )}

          {/* Loyalty */}
          <div className="rounded-2xl bg-amber-950 border border-amber-800 px-5 py-4 flex items-start gap-3">
            <Star size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-400">Loyalty Points</p>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                Худалдан авалт бүрээс оноо цуглуулаарай
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="shrink-0 px-8 py-3 border-t border-zinc-800 flex justify-between text-xs text-zinc-700">
        <span>Нууцлалын бодлого • Үйлчилгээний нөхцөл</span>
        <span>© 2025 MGL Store Industrial & Commerce</span>
      </footer>
    </div>
  );
}
