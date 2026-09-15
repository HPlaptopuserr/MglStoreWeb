"use client";

import { useMemo, useState } from "react";
import { RankedBarChart } from "./RankedBarChart";

export type StoreOrder = {
  id: string;
  storeId: string | null;
  storeName: string;
  quantity: number;
};

type StoreMetric = "orders" | "quantity";

type StoreSummary = {
  id: string;
  name: string;
  orders: number;
  quantity: number;
};

type TopOrderingStoresChartProps = {
  orders: readonly StoreOrder[];
  periodLabel: string;
};

const METRICS: ReadonlyArray<{ key: StoreMetric; label: string }> = [
  { key: "orders", label: "Захиалга" },
  { key: "quantity", label: "Тоо ширхэг" },
];

function summarizeStores(orders: readonly StoreOrder[]): StoreSummary[] {
  const stores = new Map<string, StoreSummary>();

  for (const order of orders) {
    const storeKey = order.storeId || order.storeName;
    const current = stores.get(storeKey);

    if (current) {
      current.orders += 1;
      current.quantity += order.quantity;
      continue;
    }

    stores.set(storeKey, {
      id: storeKey,
      name: order.storeName,
      orders: 1,
      quantity: order.quantity,
    });
  }

  return [...stores.values()];
}

export function TopOrderingStoresChart({
  orders,
  periodLabel,
}: TopOrderingStoresChartProps) {
  const [metric, setMetric] = useState<StoreMetric>("orders");
  const stores = useMemo(() => summarizeStores(orders), [orders]);
  const rankedStores = useMemo(
    () =>
      [...stores]
        .sort(
          (a, b) =>
            b[metric] - a[metric] || b.quantity - a.quantity,
        )
        .slice(0, 5),
    [metric, stores],
  );

  return (
    <RankedBarChart
      title="Хамгийн их захиалга хийсэн дэлгүүрүүд"
      subtitle={`${periodLabel} · Эхний 5`}
      color="emerald"
      items={rankedStores.map((store) => ({
        id: store.id,
        label: store.name,
        secondaryLabel: `${store.orders.toLocaleString("mn-MN")} захиалга · ${store.quantity.toLocaleString("mn-MN")} ширхэг`,
        value: store[metric],
      }))}
      action={
        <div
          aria-label="Хэмжих үзүүлэлт"
          className="grid grid-cols-2 rounded-lg bg-slate-100 p-1"
          role="group"
        >
          {METRICS.map(({ key, label }) => (
            <button
              key={key}
              aria-pressed={metric === key}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                metric === key
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              onClick={() => setMetric(key)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      }
      emptyTitle="Дэлгүүрийн захиалга алга"
    />
  );
}
