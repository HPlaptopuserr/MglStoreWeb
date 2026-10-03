"use client";
import { useMemo } from "react";
import type { PosReceipt } from "@mgl/types";
import { summarizeSoldProducts } from "../pos/utils/sold-product-summary";
import { BestSellingProducts } from "./BestSellingProducts";

export function SalesReportTopProducts({
  receipts,
}: {
  receipts: PosReceipt[];
}) {
  const products = useMemo(
    () =>
      summarizeSoldProducts(receipts)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10)
        .map((row, index) => ({
          rank: index + 1,
          productId: row.productId,
          name: row.name,
          sku: row.sku,
          unit: row.unit === "кг" ? "kg" : "pcs",
          quantitySold: row.quantity,
          revenue: row.amount,
          salesCount: row.receiptCount,
        })),
    [receipts],
  );
  return (
    <details className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-slate-700">
        Өндөр борлуулалттай эхний 10 бараа
      </summary>
      <div className="mt-3">
        <BestSellingProducts
          products={products}
          loading={false}
          error={null}
          onRetry={() => {}}
          ranking="revenue"
        />
      </div>
    </details>
  );
}
