"use client";

import { memo } from "react";
import type { SoldProductSummary } from "../pos/utils/sold-product-summary";
import { summarizeSalesFinancials } from "../pos/utils/sold-product-summary";
import {
  formatReportMoney,
  formatReportQuantity,
  formatReportPercent,
} from "./sales-report-format";

export const SalesFinancialSummary = memo(function SalesFinancialSummary({
  rows,
}: {
  rows: readonly SoldProductSummary[];
}) {
  const totals = summarizeSalesFinancials(rows);
  const quantities = new Map<string, number>();
  rows.forEach((row) =>
    quantities.set(row.unit, (quantities.get(row.unit) || 0) + row.quantity),
  );
  const partial = totals.missingCostCount > 0;
  const cards = [
    [
      "Зарагдсан барааны төрөл",
      String(new Set(rows.map((row) => row.productId)).size),
    ],
    [
      "Нийт зарагдсан хэмжээ",
      [...quantities]
        .map(([unit, qty]) => `${formatReportQuantity(qty)} ${unit}`)
        .join(" · "),
    ],
    ["Барааны нийт борлуулалт", formatReportMoney(totals.revenue)],
    [
      partial ? "Бүртгэлтэй өртгийн дүн" : "Нийт авсан өртөг",
      formatReportMoney(totals.knownCost),
    ],
    [
      partial ? "Өртөгтэй мөрүүдийн ашиг" : "Барааны нийт ашиг",
      formatReportMoney(totals.profit),
    ],
    [
      partial ? "Өртөгтэй мөрүүдийн ашгийн хувь" : "Нийт ашгийн хувь",
      formatReportPercent(totals.margin),
    ],
  ];
  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        {cards.map(([label, value], index) => (
          <div
            key={label}
            className="min-w-0 rounded-xl border border-blue-100 bg-blue-50/40 p-3 sm:p-4"
          >
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd
              className={`mt-1 break-words text-base font-bold tabular-nums sm:text-lg ${index === 4 && totals.profit < 0 ? "text-rose-700" : "text-slate-900"}`}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {partial && (
        <p
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"
        >
          {totals.missingCostCount} борлуулалтын мөрийн өртөг хадгалагдаагүй.
          Өртөг, ашиг, ашгийн хувьд зөвхөн өртөгтэй мөрүүдийн{" "}
          {formatReportMoney(totals.knownRevenue)} борлуулалтыг тооцсон. Өртөг
          дутуу барааны нийт ашгийг хүснэгтэд тооцохгүй.
        </p>
      )}
      <details className="text-xs leading-5 text-slate-500">
        <summary className="w-fit cursor-pointer rounded-md font-medium text-slate-600 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600">
          Ашиг, өртгийг хэрхэн тооцсон бэ?
        </summary>
        <p className="mt-2 max-w-3xl">
          Барааны ашиг = хөнгөлөлтийн дараах зарсан дүн − тухайн үеийн авсан
          өртөг. Ашгийн хувь = ашиг / зарсан дүн; өртгийн нэмэгдэл = ашиг /
          өртөг. Борлуулалтын дүнд хадгалсан татвар багтсан. Түрээс, цалин зэрэг
          үйл ажиллагааны зардлыг хасаагүй.
        </p>
      </details>
    </div>
  );
});
