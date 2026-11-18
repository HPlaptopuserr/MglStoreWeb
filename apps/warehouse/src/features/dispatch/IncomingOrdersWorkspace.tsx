"use client";

import { useState } from "react";
import { RetailOrdersPanel } from "../retail-orders/RetailOrdersPanel";
import { OnlineOrdersPanel } from "../online-orders/OnlineOrdersPanel";
import { WarehouseStockRequestQueue } from "./WarehouseStockRequestQueue";

export function IncomingOrdersWorkspace({
  warehouseId,
  onDecision,
}: {
  warehouseId: string;
  onDecision: () => void;
}) {
  const [retail, setRetail] = useState<number | null>(null);
  const [online, setOnline] = useState<number | null>(null);
  const [requests, setRequests] = useState<number | null>(null);
  const sources = [
    { id: "app-orders", label: "Аппын захиалга", count: retail },
    { id: "online-orders", label: "Онлайн захиалга", count: online },
    { id: "stock-requests", label: "Агуулахын хүсэлт", count: requests },
  ];
  return (
    <div className="space-y-5">
      <section
        aria-label="Шалгах бүх захиалга"
        className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5"
      >
        <h2 className="font-bold text-slate-950">Ирсэн бүх захиалга нэг дор</h2>
        <p className="mt-1 text-sm text-slate-600">
          Апп, онлайн дэлгүүр, байгууллагын хүсэлтүүдийг эндээс шалгаж бэлтгэнэ.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3" aria-live="polite">
          {sources.map((source) => (
            <a
              key={source.id}
              href={`#${source.id}`}
              className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 hover:border-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
            >
              {source.label}
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-900">
                {source.count === null
                  ? "Төлөв шалгах"
                  : `${source.count} шалгах`}
              </span>
            </a>
          ))}
        </div>
      </section>
      <section
        id="app-orders"
        className="scroll-mt-24"
        aria-label="Аппын захиалга"
      >
        <RetailOrdersPanel
          warehouseId={warehouseId}
          includePending
          onCountChange={setRetail}
        />
      </section>
      <section
        id="online-orders"
        className="scroll-mt-24"
        aria-label="Онлайн захиалга"
      >
        <OnlineOrdersPanel onCountChange={setOnline} />
      </section>
      <section
        id="stock-requests"
        className="scroll-mt-24"
        aria-label="Агуулахын хүсэлт"
      >
        <WarehouseStockRequestQueue
          warehouseId={warehouseId}
          onDecision={onDecision}
          onCountChange={setRequests}
        />
      </section>
    </div>
  );
}
