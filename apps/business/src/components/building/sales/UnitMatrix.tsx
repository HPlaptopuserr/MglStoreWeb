import { floorLabel, statusLabels, type SalesUnit } from "./demo-inventory";
export function UnitMatrix({
  units,
  onSelect,
}: {
  units: SalesUnit[];
  onSelect: (unit: SalesUnit) => void;
}) {
  const floors = [...new Set(units.map((unit) => unit.floor))].sort(
    (a, b) => b - a,
  );
  return (
    <div
      className="sales-matrix"
      aria-label="Давхар бүрийн борлуулалтын матриц"
    >
      {floors.map((floor) => (
        <section className="sales-matrix-row" key={floor}>
          <h3>{floorLabel(floor)}</h3>
          <div>
            {units
              .filter((unit) => unit.floor === floor)
              .map((unit) => (
                <button
                  key={unit.id}
                  className={unit.status}
                  onClick={() => onSelect(unit)}
                  aria-label={`№ ${unit.number}, ${statusLabels[unit.status]}, дэлгэрэнгүй`}
                >
                  <strong>№ {unit.number}</strong>
                  <span>
                    {unit.rooms ? `${unit.rooms} өрөө · ` : ""}
                    {unit.area} м²
                  </span>
                  <small>{statusLabels[unit.status]}</small>
                </button>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
