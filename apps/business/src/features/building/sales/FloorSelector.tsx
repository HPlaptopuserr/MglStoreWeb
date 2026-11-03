import { Building2 } from "lucide-react";
import { floorLabel, type SalesUnit } from "./demo-inventory";
export function FloorSelector({
  units,
  floor,
  onSelect,
}: {
  units: SalesUnit[];
  floor: number | null;
  onSelect: (floor: number | null) => void;
}) {
  const floors = Array.from({ length: 16 }, (_, i) => 16 - i).concat([
    -1, -2, 0,
  ]);
  return (
    <aside className="sales-floors">
      <div className="sales-section-title">
        <Building2 size={18} />
        <h2>Давхраар харах</h2>
      </div>
      <p>Давхраа сонгоод нэгжээ үзээрэй</p>
      <button
        className={`sales-all-floors ${floor === null ? "selected" : ""}`}
        onClick={() => onSelect(null)}
        aria-pressed={floor === null}
      >
        Бүх давхар
      </button>
      <div className="sales-tower">
        {floors.map((value) => {
          const items = units.filter((unit) => unit.floor === value);
          const available = items.filter(
            (unit) => unit.status === "available",
          ).length;
          return (
            <button
              key={value}
              aria-pressed={floor === value}
              aria-label={`${floorLabel(value)}, ${available} боломжтой`}
              className={`sales-floor ${value > 3 ? "residential" : value > 0 ? "commercial" : "parking"} ${floor === value ? "selected" : ""}`}
              onClick={() => onSelect(value)}
            >
              <strong>
                {value > 0 ? String(value).padStart(2, "0") : floorLabel(value)}
              </strong>
              <span className="sales-floor-windows" aria-hidden="true">
                {(value > 3 ? items : [items[0]]).map(
                  (unit) => unit && <i key={unit.id} className={unit.status} />,
                )}
              </span>
              <small>
                {value > 3
                  ? `${available}/4`
                  : value > 0
                    ? "400 м²"
                    : value === 0
                      ? "1,000"
                      : "500"}
              </small>
            </button>
          );
        })}
      </div>
      <div className="sales-legend">
        <span>
          <i className="available" />
          Боломжтой
        </span>
        <span>
          <i className="reserved" />
          Захиалгатай
        </span>
        <span>
          <i className="sold" />
          Зарагдсан
        </span>
      </div>
    </aside>
  );
}
