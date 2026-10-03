"use client";

import { Fragment, useId, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { PosReceipt } from "@mgl/types";
import { summarizeSoldProducts } from "../pos/utils/sold-product-summary";
import { SoldProductSalesDetails } from "./SoldProductSalesDetails";
import {
  formatHistoricalCost,
  formatReportPercent,
  formatReportMoney,
  formatReportQuantity,
} from "./sales-report-format";

import { ReportPagination } from "./pagination/ReportPagination";
import { useReportPagination } from "./pagination/useReportPagination";

export function SoldProductSummaryList({
  receipts,
}: {
  receipts: PosReceipt[];
}) {
  const rows = useMemo(() => summarizeSoldProducts(receipts), [receipts]);
  const { anchorRef, ...pagination } = useReportPagination(rows);
  const listId = useId();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  if (!rows.length)
    return (
      <div className="space-y-4">
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
          Сонгосон шүүлтүүрт зарагдсан бараа байхгүй байна.
        </p>
      </div>
    );
  return (
    <div
      ref={anchorRef}
      tabIndex={-1}
      aria-label="Бараагаар нэгтгэсэн тайлан"
      className="scroll-mt-[var(--report-scroll-offset,5rem)] space-y-4 outline-none"
    >
      <p className="text-xs text-slate-500">
        Их зарагдсан хэмжээгээр эрэмбэлсэн. Барааны нэр дээр дарж борлуулалт
        бүрийн үнэ, өртөг, ашгийг харна уу. Нэгтгэлийн үнэ нь тоо хэмжээгээр
        жигнэсэн дундаж.
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
                "Дундаж авсан үнэ",
                "Дундаж зарсан үнэ",
                "Нийт өртөг",
                "Борлуулалтын дүн",
                "Барааны ашиг",
                "Ашгийн хувь",
                "Өртгийн нэмэгдэл",
              ].map((title) => (
                <th key={title} scope="col" className="px-4 py-3 font-semibold">
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pagination.rows.map((row, index) => {
              const expanded = row.key === expandedKey;
              const detailsId = `${listId}-product-sales-${pagination.start + index}`;
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
                    <td className="whitespace-nowrap px-4 py-4 tabular-nums">
                      {formatHistoricalCost(row.unitCost)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 tabular-nums">
                      {row.sellingPrice == null
                        ? "—"
                        : formatReportMoney(row.sellingPrice)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 tabular-nums">
                      {formatHistoricalCost(row.cost)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-bold tabular-nums">
                      {formatReportMoney(row.amount)}
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-4 font-bold tabular-nums ${row.profit != null && row.profit < 0 ? "text-rose-700" : "text-emerald-700"}`}
                    >
                      {formatHistoricalCost(row.profit)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 tabular-nums">
                      {formatReportPercent(row.margin)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 tabular-nums">
                      {formatReportPercent(row.markup)}
                    </td>
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={10} id={detailsId} className="bg-slate-50">
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
      <ReportPagination
        {...pagination}
        label="Бараагаар нэгтгэсэн тайлангийн хуудас"
        onPageChange={(page) => {
          setExpandedKey(null);
          pagination.onPageChange(page);
        }}
        onPageSizeChange={(size) => {
          setExpandedKey(null);
          pagination.onPageSizeChange(size);
        }}
      />
      <p className="text-xs text-slate-500">
        Хураангуй болон Excel нь бүх шүүгдсэн барааг хамарна.
      </p>
    </div>
  );
}
