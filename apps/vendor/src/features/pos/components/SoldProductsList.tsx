import { useMemo } from "react";
import type { PosReceipt } from "@mgl/types";
import { buildSalesExportRows } from "../utils/sales-export-rows";

export function SoldProductsList({ receipts }: { receipts: PosReceipt[] }) {
  const rows = useMemo(
    () => buildSalesExportRows(receipts).details,
    [receipts],
  );
  if (!rows.length)
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
        Сонгосон шүүлтүүрт зарагдсан бараа байхгүй байна.
      </p>
    );
  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200">
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
              "Тоо хэмжээ",
              "Дүн",
            ].map((title) => (
              <th key={title} scope="col" className="px-3 py-3 font-semibold">
                {title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr
              key={`${row["Борлуулалтын ID"]}-${index}`}
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
                {row["Тоо хэмжээ"].toLocaleString("mn-MN", {
                  maximumFractionDigits: 3,
                })}{" "}
                {row["Нэгж"]}
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums">
                ₮
                {row["Борлуулалтын дүн"].toLocaleString("mn-MN", {
                  maximumFractionDigits: 2,
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
