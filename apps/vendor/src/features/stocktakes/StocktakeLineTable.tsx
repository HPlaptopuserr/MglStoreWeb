"use client";
import type { StocktakeCountEdit, StocktakeLineDto } from "@mgl/types";
import { fieldClass, secondaryClass } from "./StocktakeOverview";
import { StocktakeRow } from "./StocktakeRow";

export function StocktakeLineTable({
  filtered,
  filter,
  changedIds,
  currentPage,
  editable,
  selectedId,
  onEdit,
  onFilter,
  onPage,
}: {
  filtered: StocktakeLineDto[];
  filter: string;
  changedIds: ReadonlySet<string>;
  currentPage: number;
  editable: boolean;
  selectedId: string | null;
  onEdit: (edit: StocktakeCountEdit) => void;
  onFilter: (value: string) => void;
  onPage: (page: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap gap-3 p-4">
        <span className="flex-1 self-center text-sm text-slate-500">
          {filtered.length} бараа
        </span>
        <select
          aria-label="Мөр шүүх"
          value={filter}
          onChange={(event) => {
            onFilter(event.target.value);
          }}
          className={`${fieldClass} sm:max-w-52`}
        >
          <option value="all">Бүх бараа</option>
          <option value="uncounted">Тоолоогүй</option>
          <option value="difference">Зөрүүтэй</option>
          <option value="changed">Мэдээлэл өөрчлөгдсөн</option>
        </select>
      </div>
      {changedIds.size > 0 && (
        <p
          role="status"
          className="border-t border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {changedIds.size} барааны мэдээлэл өөрчлөгдсөн тул жагсаалтын эхэнд
          гаргалаа. Засварт буцааж «Өөрчлөгдсөн барааг дахин тоолох» үйлдлийг
          хийнэ үү.
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              {[
                "Бараа",
                "Системийн тоо",
                "Бодит тоо",
                "Зөрүү",
                "Шалтгаан / тайлбар",
              ].map((label) => (
                <th key={label} scope="col" className="p-3">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered
              .slice(currentPage * 50, currentPage * 50 + 50)
              .map((line) => (
                <StocktakeRow
                  key={line.id}
                  line={line}
                  requiresRecount={changedIds.has(line.id)}
                  editable={editable}
                  focused={selectedId === line.id}
                  onEdit={onEdit}
                />
              ))}
          </tbody>
        </table>
      </div>
      {!filtered.length && (
        <p className="p-8 text-center text-slate-500">
          {filter === "changed"
            ? "Мэдээлэл өөрчлөгдсөн бараа алга байна."
            : filter === "difference"
              ? "Зөрүүтэй бараа алга байна."
              : filter === "uncounted"
                ? "Бүх барааг тоолсон байна."
                : "Тохирох бараа алга байна."}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-sm text-slate-500">
        <span>
          {filtered.length} бараа · Хуудас {currentPage + 1} /{" "}
          {Math.max(1, Math.ceil(filtered.length / 50))}
        </span>
        <div className="flex gap-2">
          <button
            className={secondaryClass}
            disabled={currentPage === 0}
            onClick={() => onPage(currentPage - 1)}
          >
            Өмнөх
          </button>
          <button
            className={secondaryClass}
            disabled={(currentPage + 1) * 50 >= filtered.length}
            onClick={() => onPage(currentPage + 1)}
          >
            Дараах
          </button>
        </div>
      </div>
    </div>
  );
}
