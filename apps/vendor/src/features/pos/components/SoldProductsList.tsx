"use client";

import { useMemo } from "react";
import type { PosReceipt } from "@mgl/types";
import { SalesFinancialSummary } from "@/features/reports/SalesFinancialSummary";
import {
  formatReportMoney,
  formatReportPercent,
} from "@/features/reports/sales-report-format";
import { summarizeSoldProducts } from "../utils/sold-product-summary";
import { buildSalesExportRows } from "../utils/sales-export-rows";

import { ReportPagination } from "@/features/reports/pagination/ReportPagination";
import { useReportPagination } from "@/features/reports/pagination/useReportPagination";

export function SoldProductsList({
  receipts,
  showSummary = true,
}: {
  receipts: PosReceipt[];
  showSummary?: boolean;
}) {
  const rows = useMemo(
    () => buildSalesExportRows(receipts).details,
    [receipts],
  );
  const summaries = useMemo(() => summarizeSoldProducts(receipts), [receipts]);
  const { anchorRef, ...pagination } = useReportPagination(rows);
  if (!rows.length)
    return (
      <div className="space-y-3">
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
          Сонгосон шүүлтүүрт зарагдсан бараа байхгүй байна.
        </p>
      </div>
    );
  return (
    <div
      ref={anchorRef}
      tabIndex={-1}
      aria-label="Борлуулалт бүрийн тайлан"
      className="scroll-mt-[var(--report-scroll-offset,5rem)] space-y-3 outline-none"
    >
      {showSummary && <SalesFinancialSummary rows={summaries} />}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            Зарагдсан бараа, зарсан ажилтан, борлуулсан огноо ба цаг
          </caption>
          <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
            <tr>
              {[
                "Бараа",
                "Зарсан ажилтан",
                "Огноо / цаг",
                "Төлбөрийн хэлбэр",
                "Зарагдсан тоо хэмжээ",
                "Авсан нэгж үнэ",
                "Зарах нэгж үнэ",
                "Нийт өртөг",
                "Хөнгөлөлт",
                "Зарсан дүн",
                "Барааны ашиг",
                "Ашгийн хувь",
                "Өртгийн нэмэгдэл",
              ].map((title) => (
                <th key={title} scope="col" className="px-3 py-3 font-semibold">
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pagination.rows.map((row, index) => (
              <tr
                key={`${row["Баримт"]}-${pagination.start + index}`}
                className="transition-colors hover:bg-blue-50/50"
              >
                <td className="min-w-36 px-3 py-3">
                  <p className="font-semibold text-slate-900">{row["Бараа"]}</p>
                  <p className="mt-1 break-all text-xs text-slate-500">
                    {row["SKU"] || row["Баркод"] || row["Баримт"]}
                  </p>
                </td>
                <td className="min-w-28 break-words px-3 py-3 text-slate-700">
                  {row["Ажилтан"]}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                  {row["Огноо"]}
                  <span className="mt-1 block text-xs">
                    {row["Цаг (Улаанбаатар)"]}
                  </span>
                </td>
                <td className="min-w-28 px-3 py-3 text-slate-700">
                  {row["Төлбөрийн хэлбэр"]}
                </td>
                <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                  {row["Зарагдсан тоо хэмжээ"].toLocaleString("mn-MN", {
                    maximumFractionDigits: 3,
                  })}{" "}
                  {row["Нэгж"]}
                </td>
                {[
                  row["Нэгж өртөг (борлуулалтын үеийн)"],
                  row["Нэгж үнэ"],
                  row["Нийт өртөг (борлуулалтын үеийн)"],
                  row["Хөнгөлөлт"],
                ].map((value, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="whitespace-nowrap px-3 py-3 text-right tabular-nums"
                  >
                    {value === "" ? "Мэдээлэл дутуу" : formatReportMoney(value)}
                  </td>
                ))}
                <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums">
                  ₮
                  {row["Борлуулалтын дүн"].toLocaleString("mn-MN", {
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td
                  className={`whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums ${typeof row["Барааны ашиг"] === "number" && row["Барааны ашиг"] < 0 ? "text-rose-700" : "text-emerald-700"}`}
                >
                  {row["Барааны ашиг"] === ""
                    ? "Мэдээлэл дутуу"
                    : formatReportMoney(row["Барааны ашиг"])}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                  {formatReportPercent(
                    row["Ашгийн хувь (%)"] === ""
                      ? null
                      : row["Ашгийн хувь (%)"],
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                  {formatReportPercent(
                    row["Өртгийн нэмэгдэл (%)"] === ""
                      ? null
                      : row["Өртгийн нэмэгдэл (%)"],
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ReportPagination
        {...pagination}
        label="Борлуулалт бүрийн тайлангийн хуудас"
      />
      <p className="text-xs text-slate-500">
        Excel нь бүх шүүгдсэн борлуулалтыг хамарна.
      </p>
    </div>
  );
}
