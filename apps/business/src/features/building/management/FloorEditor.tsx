"use client";
import { UnitFields } from "./UnitFields";
import { newUnit, type FloorDraft } from "./inventory-draft";
export function FloorEditor({
  floor,
  expanded = false,
  onChange,
  onRemove,
}: {
  floor: FloorDraft;
  expanded?: boolean;
  onChange: (floor: FloorDraft) => void;
  onRemove: () => void;
}) {
  const area = floor.units.reduce(
    (sum, unit) => sum + (Number(unit.areaM2) || 0),
    0,
  );
  return (
    <details className="project-block inventory-floor" open={expanded}>
      <summary>
        {floor.number || "—"}-р давхар{" "}
        <span>
          {floor.units.length} байр ·{" "}
          {new Set(floor.units.map((u) => u.typeLabel)).size} төрөл ·{" "}
          {area.toFixed(2)} м²
        </span>
      </summary>
      <div className="project-block-fields">
        <label>
          Давхрын дугаар *
          <input
            required
            type="number"
            min={-10}
            max={200}
            step={1}
            value={floor.number}
            onChange={(e) => onChange({ ...floor, number: e.target.value })}
          />
        </label>
        <p>
          Өөр зохион байгуулалттай бол энэ давхрын байруудыг нэмж, хасаж, өрөө
          болон м²-ийг өөрчилнө. Бусад давхарт нөлөөлөхгүй.
        </p>
        {floor.units.map((unit) => (
          <div className="inventory-unit" key={unit.id}>
            <UnitFields
              numbered
              unit={unit}
              onChange={(patch) =>
                onChange({
                  ...floor,
                  units: floor.units.map((u) =>
                    u.id === unit.id ? { ...u, ...patch } : u,
                  ),
                })
              }
            />
            <button
              type="button"
              className="building-secondary"
              aria-label={`${unit.unitNo || "Шинэ"} тоотыг хасах`}
              onClick={() =>
                onChange({
                  ...floor,
                  units: floor.units.filter((u) => u.id !== unit.id),
                })
              }
            >
              Хасах
            </button>
          </div>
        ))}
        {!floor.units.length && (
          <p className="project-block-empty">
            Энэ давхарт байргүй. Байр нэмэх эсвэл давхрыг хасна уу.
          </p>
        )}
        <div className="inventory-actions">
          <button
            type="button"
            className="building-secondary"
            disabled={floor.units.length >= 50}
            onClick={() =>
              onChange({ ...floor, units: [...floor.units, newUnit()] })
            }
          >
            + Байр нэмэх
          </button>
          <button
            type="button"
            className="building-secondary"
            onClick={onRemove}
          >
            Давхар хасах
          </button>
        </div>
      </div>
    </details>
  );
}
