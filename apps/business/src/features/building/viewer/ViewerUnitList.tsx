"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import {
  money,
  unitTitle,
  unitStatusLabel,
  unitAreaLabel,
  type SalesUnit,
} from "../sales/demo-inventory";

export function ViewerUnitList({
  units,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  availableOnly,
  onFilter,
  query,
  onQuery,
  compact = false,
}: {
  units: SalesUnit[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  availableOnly: boolean;
  onFilter: (value: boolean) => void;
  query: string;
  onQuery: (value: string) => void;
  compact?: boolean;
}) {
  const [page, setPage] = useState(0);
  const filtered = units.filter(
    (unit) =>
      (!availableOnly || unit.status === "available") &&
      `${unit.label ?? ""} ${unit.number}`
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
  );
  const pageSize = compact ? 12 : 50;
  const pageCount = Math.ceil(filtered.length / pageSize);
  const currentPage = Math.min(page, Math.max(0, pageCount - 1));
  const first = compact ? currentPage * pageSize : 0;
  return (
    <>
      <div className="viewer-list-filters">
        <label className="viewer-search">
          <Search size={15} />
          <input
            value={query}
            onChange={(event) => {
              setPage(0);
              onQuery(event.target.value);
            }}
            placeholder="Байрны нэр, тоотоор хайх"
            aria-label="Байрны нэр, тоотоор хайх"
          />
        </label>
        <label className="viewer-available-filter">
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(event) => {
              setPage(0);
              onFilter(event.target.checked);
            }}
          />
          Зөвхөн боломжтой
        </label>
      </div>
      <p className="viewer-list-count" role="status">
        {filtered.length} нэгж ·{" "}
        {units.filter((unit) => unit.status === "available").length} боломжтой
      </p>
      <div
        className={`viewer-unit-list${compact ? " viewer-unit-list-compact" : ""}`}
      >
        {filtered.slice(first, first + pageSize).map((unit) => (
          <button
            key={unit.id}
            className={`viewer-unit ${unit.status} ${selectedId === unit.id || hoveredId === unit.id ? "active" : ""}`}
            aria-pressed={selectedId === unit.id}
            onClick={() => onSelect(unit.id)}
            onMouseEnter={() => onHover(unit.id)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(unit.id)}
            onBlur={() => onHover(null)}
          >
            <div>
              <strong title={unitTitle(unit)}>{unitTitle(unit)}</strong>
              {!compact && <b>{unitAreaLabel(unit)}</b>}
            </div>
            {compact ? (
              <p className="viewer-unit-meta">
                {unit.number && `№ ${unit.number} · `}
                {unit.area === null ? "Талбай —" : `${unit.area} м²`}
              </p>
            ) : (
              <p>
                {unit.rooms
                  ? `${unit.rooms} өрөө`
                  : unit.kind === "commercial"
                    ? "Үйлчилгээ"
                    : "Зогсоол"}
                <span className={`viewer-status ${unit.status}`}>
                  {unitStatusLabel(unit)}
                </span>
              </p>
            )}
            {compact && (
              <span className={`viewer-status ${unit.status}`}>
                {unitStatusLabel(unit)}
              </span>
            )}
            {!compact && (
              <small>
                {unit.priceKnown === false
                  ? "Үнэ тодорхойгүй"
                  : money(unit.price)}
              </small>
            )}
          </button>
        ))}
        {!filtered.length && (
          <div className="viewer-empty">
            Тохирох нэгж алга. Хайлтаа өөрчилнө үү.
          </div>
        )}
        {!compact && filtered.length > 50 && (
          <p className="viewer-empty">
            Эхний 50 нэгжийг харуулж байна. Дугаараар хайж сонгоно уу.
          </p>
        )}
      </div>
      {compact && pageCount > 1 && (
        <nav
          className="live-unit-pagination"
          aria-label="Байрны жагсаалтын хуудас"
        >
          <button
            type="button"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
            aria-label="Өмнөх байрууд"
          >
            ←
          </button>
          <span aria-live="polite">
            {first + 1}–{Math.min(first + pageSize, filtered.length)} /{" "}
            {filtered.length}
          </span>
          <button
            type="button"
            disabled={currentPage + 1 >= pageCount}
            onClick={() => setPage(currentPage + 1)}
            aria-label="Дараагийн байрууд"
          >
            →
          </button>
        </nav>
      )}
    </>
  );
}
