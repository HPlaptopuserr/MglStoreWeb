"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { PosReceipt } from "@mgl/types";
import { summarizeSoldProducts } from "../pos/utils/sold-product-summary";
import { SoldProductSalesDetails } from "./SoldProductSalesDetails";
import { formatReportMoney, formatReportQuantity } from "./sales-report-format";

export function SoldProductSummaryList({
  receipts,
}: {
  receipts: PosReceipt[];
}) {
  const rows = useMemo(() => summarizeSoldProducts(receipts), [receipts]);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const totals = useMemo(() => {
    const quantities = new Map<string, number>();
    for (const row of rows)
      quantities.set(row.unit, (quantities.get(row.unit) || 0) + row.quantity);
    return {
      count: new Set(rows.map((row) => row.productId)).size,
      amount: rows.reduce((sum, row) => sum + row.amount, 0),
      quantity: [...quantities]
        .map(([unit, quantity]) => `${formatReportQuantity(quantity)} ${unit}`)
        .join(" · "),
    };
  }, [rows]);
  if (!rows.length)
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
        Сонгосон шүүлтүүрт зарагдсан бараа байхгүй байна.
      </p>
    );
  return (
    <div className="space-y-4">
      <dl className="grid gap-3 sm:grid-cols-3">
        {[
          ["Зарагдсан барааны төрөл", `${totals.count}`],
          ["Нийт зарагдсан хэмжээ", totals.quantity],
          ["Барааны нийт борлуулалт", formatReportMoney(totals.amount)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-blue-100 bg-blue-50/40 p-4"
          >
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="mt-1 text-lg font-bold text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-slate-500">
        Их зарагдсан хэмжээгээр эрэмбэлсэн. Барааны нэр дээр дарж борлуулалт
        бүрийг харна уу.
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            Бараа бүрийн нийт зарагдсан хэмжээ, баримтын тоо, борлуулалтын дүн
          </caption>
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              {[
                "Бараа",
                "Нийт зарагдсан",
                "Баримтын тоо",
                "Борлуулалтын дүн",
              ].map((title) => (
                <th key={title} scope="col" className="px-4 py-3 font-semibold">
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => {
              const expanded = row.key === expandedKey;
              const detailsId = `product-sales-${index}`;
              return (
                <Fragment key={row.key}>
                  <tr
                    className={`transition-colors hover:bg-blue-50/50 ${expanded ? "bg-blue-50/50" : ""}`}
                  >
                    <td className="min-w-52 p-0">
                      <button
                        type="button"
                        aria-expanded={expanded}
                        aria-controls={expanded ? detailsId : undefined}
                        onClick={() =>
                          setExpandedKey(expanded ? null : row.key)
                        }
                        className="flex w-full items-center gap-3 px-4 py-4 text-left focus-visible:outline-blue-600"
                      >
                        {expanded ? (
                          <ChevronUp
                            size={16}
                            className="shrink-0 text-blue-600"
                          />
                        ) : (
                          <ChevronDown
                            size={16}
                            className="shrink-0 text-slate-400"
                          />
                        )}
                        <span>
                          <span className="block font-bold text-slate-900">
                            {row.name}
                          </span>
                          <span className="mt-1 block text-xs text-slate-500">
                            {row.sku || row.barcode || "Кодгүй"}
                          </span>
                        </span>
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-bold tabular-nums text-blue-700">
                      {formatReportQuantity(row.quantity)} {row.unit}
                    </td>
                    <td className="px-4 py-4 tabular-nums">
                      {row.receiptCount}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-bold tabular-nums">
                      {formatReportMoney(row.amount)}
                    </td>
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={4} id={detailsId} className="bg-slate-50">
                        <SoldProductSalesDetails
                          sales={row.sales}
                          unit={row.unit}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
