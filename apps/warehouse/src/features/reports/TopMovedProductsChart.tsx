"use client";

import { useMemo, useState } from "react";
import { RankedBarChart } from "./RankedBarChart";
import {
  summarizeProductMovements,
  type ProductMovement,
} from "./top-moved-products";

type Metric = "quantity" | "frequency";

type TopMovedProductsChartProps = {
  movements: readonly ProductMovement[];
  periodLabel: string;
};

const METRICS: ReadonlyArray<{ key: Metric; label: string }> = [
  { key: "quantity", label: "Тоо ширхэг" },
  { key: "frequency", label: "Давтамж" },
];

export function TopMovedProductsChart({
  movements,
  periodLabel,
}: TopMovedProductsChartProps) {
  const [metric, setMetric] = useState<Metric>("quantity");
  const products = useMemo(
    () => summarizeProductMovements(movements),
    [movements],
  );
  const sortedProducts = useMemo(
    () =>
      [...products]
        .sort(
          (a, b) =>
            b[metric] - a[metric] || b.quantity - a.quantity,
        )
        .slice(0, 5),
    [metric, products],
  );

  return (
    <RankedBarChart
      title="Хамгийн их хөдөлгөөнтэй бараа"
      subtitle={`${periodLabel} · Эхний 5`}
      items={sortedProducts.map((product) => ({
        id: product.productId,
        label: product.name,
        secondaryLabel: product.sku || "SKU байхгүй",
        value: product[metric],
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
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                metric === key
                  ? "bg-white text-blue-700 shadow-sm"
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
      emptyTitle="Харуулах хөдөлгөөн алга"
    />
  );
}
