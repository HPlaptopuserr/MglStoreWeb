"use client";

import { resolveApiAssetUrl } from "@/lib/api";

export interface CheckoutSummaryItem {
  id: string;
  name: string;
  unit: string | null;
  quantity: number;
  price: number;
  subtotal: number;
  imageUrl: string | null;
}

interface CheckoutOrderSummaryProps {
  items?: CheckoutSummaryItem[];
  total: number;
}

export function CheckoutOrderSummary({
  items = [],
  total,
}: CheckoutOrderSummaryProps) {
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <section
      aria-label="Захиалгын барааны мэдээлэл"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
    >
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            Захиалгын мэдээлэл
          </p>
          <p className="mt-0.5 text-sm font-black text-slate-950">
            {quantity} ширхэг бараа
          </p>
        </div>
        <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-600">
          {items.length} төрөл
        </span>
      </header>

      <div className="max-h-52 space-y-2 overflow-y-auto p-2.5">
        {items.length > 0 ? items.map((item) => (
          <div
            key={item.id}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm"
          >
            {item.imageUrl ? (
              <img
                src={resolveApiAssetUrl(item.imageUrl)}
                alt=""
                loading="lazy"
                className="h-12 w-12 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-black text-slate-400">
                {item.quantity}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-slate-900">
                {item.name}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                Нэгж үнэ: ₮{item.price.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400">
                {item.quantity} {item.unit || "ш"}
              </p>
              <p className="mt-1 shrink-0 text-sm font-black tabular-nums text-slate-950">
                ₮{item.subtotal.toLocaleString()}
              </p>
            </div>
          </div>
        )) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-5 text-center">
            <p className="text-sm font-bold text-slate-500">
              Барааны мэдээллийг татаж байна...
            </p>
          </div>
        )}
      </div>
      <div className="flex items-end justify-between border-t border-slate-200 bg-white px-4 py-3">
        <span className="text-sm font-bold text-slate-500">
          Төлөх нийт дүн
        </span>
        <span className="text-2xl font-black tracking-tight tabular-nums text-slate-950">
          ₮{total.toLocaleString()}
        </span>
      </div>
    </section>
  );
}
