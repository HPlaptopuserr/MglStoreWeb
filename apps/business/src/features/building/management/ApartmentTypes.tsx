"use client";
import { UnitFields } from "./UnitFields";
import { newType, type BlockDraft } from "./inventory-draft";
export function ApartmentTypes({
  block,
  onChange,
}: {
  block: BlockDraft;
  onChange: (block: BlockDraft) => void;
}) {
  return (
    <div className="project-block-fields">
      <h3>Нэг давхарт ямар байрууд байх вэ?</h3>
      <p>
        Ижил хэмжээтэй байрыг нэг удаа оруулна. Бүх давхарт автоматаар давтана.
      </p>
      {block.types.map((type, typeIndex) => (
        <div className="inventory-unit inventory-type-card" key={type.id}>
          <h4>Байр {typeIndex + 1}</h4>
          <UnitFields
            unit={type}
            showType={false}
            onChange={(patch) =>
              onChange({
                ...block,
                types: block.types.map((t) =>
                  t.id === type.id ? { ...t, ...patch } : t,
                ),
              })
            }
          />
          <label>
            Давхар бүрт хэдэн ширхэг вэ? *
            <input
              type="number"
              min={1}
              max={50}
              step={1}
              value={type.count}
              onChange={(e) =>
                onChange({
                  ...block,
                  types: block.types.map((t) =>
                    t.id === type.id ? { ...t, count: e.target.value } : t,
                  ),
                })
              }
            />
          </label>
          <details className="type-floor-range">
            <summary>Зөвхөн зарим давхарт байрлах бол тохируулах</summary>
            <label>
              Эхлэх давхар
              <input
                type="number"
                min={1}
                max={Number(block.floorCount) || 100}
                value={type.fromFloor ?? "1"}
                onChange={(e) =>
                  onChange({
                    ...block,
                    types: block.types.map((t) =>
                      t.id === type.id
                        ? { ...t, fromFloor: e.target.value }
                        : t,
                    ),
                  })
                }
              />
            </label>
            <label>
              Дуусах давхар
              <input
                type="number"
                min={1}
                max={Number(block.floorCount) || 100}
                placeholder={block.floorCount || "Бүх давхар"}
                value={type.toFloor ?? ""}
                onChange={(e) =>
                  onChange({
                    ...block,
                    types: block.types.map((t) =>
                      t.id === type.id ? { ...t, toFloor: e.target.value } : t,
                    ),
                  })
                }
              />
            </label>
          </details>
          <p className="inventory-type-summary">
            {type.fromFloor || 1}–{type.toFloor || block.floorCount || "…"}
            -р давхар бүрт. Нийт{" "}
            {Math.max(
              0,
              Number(type.toFloor || block.floorCount) -
                Number(type.fromFloor || 1) +
                1,
            ) * Number(type.count || 0)}{" "}
            байр. Нэг давхарт {type.rooms || "…"} өрөөтэй, {type.areaM2 || "…"}{" "}
            м² байр {type.count || "…"} ширхэг.
          </p>
          <button
            type="button"
            className="building-secondary"
            onClick={() =>
              onChange({
                ...block,
                types: block.types.filter((t) => t.id !== type.id),
              })
            }
          >
            Энэ байрыг хасах
          </button>
        </div>
      ))}
      <button
        type="button"
        className="building-secondary"
        disabled={block.types.length >= 50}
        onClick={() =>
          onChange({
            ...block,
            types: [
              ...block.types,
              {
                ...newType(),
                typeLabel: String.fromCharCode(65 + block.types.length),
              },
            ],
          })
        }
      >
        + Өөр хэмжээтэй байр нэмэх
      </button>
    </div>
  );
}
