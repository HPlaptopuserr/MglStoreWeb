import { Search } from "lucide-react";
import { money, unitTitle, unitStatusLabel, unitAreaLabel, type SalesUnit } from "../sales/demo-inventory";
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
}) {
  const filtered = units.filter(
    (unit) =>
      (!availableOnly || unit.status === "available") &&
      `${unit.label ?? ""} ${unit.number}`.toLowerCase().includes(query.toLowerCase().trim()),
  );
  return (
    <>
      <div className="viewer-list-filters">
        <label className="viewer-search">
          <Search size={15} />
          <input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Байрны нэр, тоотоор хайх"
            aria-label="Байрны нэр, тоотоор хайх"
          />
        </label>
        <label className="viewer-available-filter">
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(event) => onFilter(event.target.checked)}
          />
          Зөвхөн боломжтой
        </label>
      </div>
      <p className="viewer-list-count" role="status">
        {filtered.length} нэгж ·{" "}
        {units.filter((unit) => unit.status === "available").length} боломжтой
      </p>
      <div className="viewer-unit-list">
        {filtered.slice(0, 50).map((unit) => (
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
              <strong>{unitTitle(unit)}</strong>
              <b>{unitAreaLabel(unit)}</b>
            </div>
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
            <small>{unit.priceKnown === false ? "Үнэ тодорхойгүй" : money(unit.price)}</small>
          </button>
        ))}
        {!filtered.length && (
          <div className="viewer-empty">
            Тохирох нэгж алга. Хайлтаа өөрчилнө үү.
          </div>
        )}
        {filtered.length > 50 && (
          <p className="viewer-empty">
            Эхний 50 нэгжийг харуулж байна. Дугаараар хайж сонгоно уу.
          </p>
        )}
      </div>
    </>
  );
}
