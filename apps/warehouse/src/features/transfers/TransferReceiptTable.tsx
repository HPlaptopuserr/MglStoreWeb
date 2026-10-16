"use client";
import { TransferMatchRow } from "./TransferMatchRow";
import type { AcceptanceLine, TransferLine } from "./transfer-types";
export function TransferReceiptTable({
  rows,
  lines,
  warehouseId,
  onChange,
}: {
  rows: TransferLine[];
  lines: AcceptanceLine[];
  warehouseId: string;
  onChange: (line: AcceptanceLine) => void;
}) {
  return (
    <div
      role="region"
      aria-label="Хүлээн авах барааны хүснэгт"
      tabIndex={0}
      className="overflow-x-auto outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
    >
      <table className="w-full min-w-[1120px] border-collapse text-left">
        <caption className="sr-only">
          Илгээсэн тоог хүлээн авсан тоотой тулгаж, үнэ оруулаад мөр бүрийг
          батална.
        </caption>
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            {[
              "№",
              "Бараа / код",
              "Илгээсэн",
              "Хүлээн авсан",
              "Суурь үнэ",
              "Нэмэгдэл",
              "Зарах үнэ",
              "Нийт дүн",
              "Тулгалт",
            ].map((title) => (
              <th
                key={title}
                scope="col"
                className="whitespace-nowrap px-3 py-3"
              >
                {title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => {
            const line = lines.find((line) => line.id === row.id);
            return line ? (
              <TransferMatchRow
                key={row.id}
                index={index}
                row={row}
                value={line}
                warehouseId={warehouseId}
                onChange={onChange}
              />
            ) : null;
          })}
        </tbody>
      </table>
    </div>
  );
}
