"use client";

import { useState } from "react";
import { BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import {
  SUPPLY_UNITS,
  type MaterialSupplySummary,
  type SupplyUnit,
} from "@mgl/types";

const units: Record<SupplyUnit, string> = { kg: "кг", l: "л", pcs: "ширхэг" };
const number = (value: number) =>
  new Intl.NumberFormat("mn-MN", { maximumFractionDigits: 6 }).format(value);
const pageSize = 5;
type Props = {
  rows: Array<MaterialSupplySummary | null>;
  month: string;
  valid: boolean;
};

export function SupplyOverviewChart({ rows, month, valid }: Props) {
  const [chosenUnit, setChosenUnit] = useState<SupplyUnit>("kg");
  const [chosenMaterial, setChosenMaterial] = useState("");
  const [page, setPage] = useState(0);
  const complete = rows.filter(
    (row): row is MaterialSupplySummary => row !== null,
  );
  const availableUnits = SUPPLY_UNITS.filter((unit) =>
    complete.some((row) => row.unit === unit),
  );
  const unit = availableUnits.includes(chosenUnit)
    ? chosenUnit
    : (availableUnits[0] ?? "kg");
  const matching = complete.filter((row) => row.unit === unit);
  const selected = matching.some((row) => row.id === chosenMaterial)
    ? chosenMaterial
    : "";
  const lastPage = Math.max(0, Math.ceil(matching.length / pageSize) - 1);
  const currentPage = Math.min(page, lastPage);
  const visible = selected
    ? matching.filter((row) => row.id === selected)
    : matching.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const negativeCount = matching.filter(
    (row) => row.remainingQuantity < 0,
  ).length;

  // Draft validity changes while typing; reserve preview space so the form stays still.
  return (
    <section
      aria-label="Хангамжийн хөдөлгөөний график"
      className="flex h-[440px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white"
    >
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <BarChart3 className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Нөөцийн ашиглалт
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {month} · Орцын зарцуулалт ба үлдэгдэл
            </p>
          </div>
        </div>
        {valid && matching.length > 0 && (
          <div className="flex max-w-full flex-wrap items-center gap-3">
            <div
              role="group"
              aria-label="Графикийн хэмжих нэгж"
              className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-1"
            >
              {availableUnits.map((value) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={unit === value}
                  onClick={() => {
                    setChosenUnit(value);
                    setChosenMaterial("");
                    setPage(0);
                  }}
                  className={`min-h-8 min-w-10 rounded px-3 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 ${unit === value ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                >
                  {units[value]}
                </button>
              ))}
            </div>
            <select
              aria-label="Графикт харуулах материал"
              className="min-h-10 max-w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={selected}
              onChange={(event) => {
                setChosenMaterial(event.target.value);
                setPage(0);
              }}
            >
              <option value="">Бүх материал ({matching.length})</option>
              {matching.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>
      {!valid ? (
        <p
          role="status"
          className="flex flex-1 items-center justify-center px-5 py-10 text-center text-sm text-slate-500"
        >
          Дутуу хэмжээ, үнийн мэдээллээ бөглөхөд график шинэчлэгдэнэ.
        </p>
      ) : !visible.length ? (
        <p className="flex flex-1 items-center justify-center px-5 py-10 text-center text-sm text-slate-500">
          Түүхий эдээ бүртгэхэд нөөцийн ашиглалт энд харагдана.
        </p>
      ) : (
        <>
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-5 py-3 text-[11px] text-slate-500">
            <p>Материал бүрийн нийт нөөц = 100%</p>
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="size-2 rounded-sm bg-indigo-500"
                />
                Зарцуулсан
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="size-2 rounded-sm bg-emerald-200"
                />
                Үлдэгдэл
              </span>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
            <table className="w-full min-w-[680px] table-fixed text-sm">
              <caption className="sr-only">
                Материалын нийт нөөц, зарцуулалт, үлдэгдэл ({units[unit]})
              </caption>
              <colgroup>
                <col className="w-[24%]" />
                <col className="w-[31%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
              </colgroup>
              <thead className="border-y border-slate-100 bg-slate-50/80 text-[11px] font-medium text-slate-500">
                <tr>
                  <th scope="col" className="px-5 py-2 text-left">
                    Материал
                  </th>
                  <th scope="col" className="px-4 py-2 text-left">
                    Ашиглалт
                  </th>
                  <th scope="col" className="px-4 py-2 text-right">
                    Нийт нөөц, {units[unit]}
                  </th>
                  <th scope="col" className="px-4 py-2 text-right">
                    Зарцуулсан
                  </th>
                  <th scope="col" className="px-5 py-2 text-right">
                    Үлдэгдэл
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((row) => {
                  const available = row.openingQuantity + row.receivedQuantity;
                  const percent =
                    available > 0 ? (row.usedQuantity / available) * 100 : null;
                  const overdrawn = row.remainingQuantity < 0;
                  const width = overdrawn
                    ? 100
                    : Math.min(100, Math.max(0, percent ?? 0));
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <th
                        scope="row"
                        className="break-words px-5 py-2 text-left text-xs font-semibold text-slate-800"
                      >
                        <span className="block truncate" title={row.name}>
                          {row.name || "Түүхий эд"}
                        </span>
                      </th>
                      <td className="px-4 py-2">
                        <div
                          role="img"
                          aria-label={`${row.name}: нийт ${number(available)} ${units[unit]}, зарцуулсан ${number(row.usedQuantity)}, үлдсэн ${number(row.remainingQuantity)}`}
                        >
                          <div
                            className={`h-2 overflow-hidden rounded-full ${available > 0 ? "bg-emerald-100" : "bg-slate-100"}`}
                          >
                            <div
                              className={`h-full rounded-full ${overdrawn ? "bg-rose-500" : "bg-indigo-500"}`}
                              style={{ width: `${width}%` }}
                            />
                          </div>
                          <p
                            className={`mt-1.5 text-[10px] tabular-nums ${overdrawn ? "text-rose-600" : "text-slate-400"}`}
                          >
                            {percent === null
                              ? overdrawn
                                ? "Орлогоос давсан зарцуулалт"
                                : "Хөдөлгөөнгүй"
                              : `${new Intl.NumberFormat("mn-MN", { maximumFractionDigits: 2 }).format(percent)}% зарцуулсан`}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right text-xs tabular-nums text-slate-600">
                        {number(available)}
                      </td>
                      <td className="px-4 py-2 text-right text-xs tabular-nums text-indigo-600">
                        {number(row.usedQuantity)}
                      </td>
                      <td
                        className={`px-5 py-2 text-right text-xs font-bold tabular-nums ${overdrawn ? "text-rose-600" : "text-slate-900"}`}
                      >
                        {number(row.remainingQuantity)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <footer className="flex min-h-15 shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-3">
            <p aria-live="polite" className="text-[11px] text-slate-500">
              {selected
                ? "Сонгосон материал"
                : `${currentPage * pageSize + 1}–${Math.min((currentPage + 1) * pageSize, matching.length)} / ${matching.length} материал`}
              {negativeCount > 0 && (
                <span className="ml-3 font-medium text-rose-600">
                  {negativeCount} материал сөрөг үлдэгдэлтэй
                </span>
              )}
            </p>
            {!selected && lastPage > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Өмнөх материалууд"
                  disabled={currentPage === 0}
                  onClick={() => setPage(currentPage - 1)}
                  className="flex size-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="text-[11px] tabular-nums text-slate-500">
                  {currentPage + 1} / {lastPage + 1}
                </span>
                <button
                  type="button"
                  aria-label="Дараах материалууд"
                  disabled={currentPage === lastPage}
                  onClick={() => setPage(currentPage + 1)}
                  className="flex size-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}
          </footer>
        </>
      )}
    </section>
  );
}
