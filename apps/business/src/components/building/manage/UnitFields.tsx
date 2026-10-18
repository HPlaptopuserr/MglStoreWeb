"use client";
import type { UnitDraft } from "./inventory-draft";
export function UnitFields({
  unit,
  onChange,
  numbered = false,
  showType = true,
}: {
  unit: Omit<UnitDraft, "unitNo"> & { unitNo?: string };
  onChange: (patch: Partial<UnitDraft>) => void;
  numbered?: boolean;
  showType?: boolean;
}) {
  return (
    <>
      {numbered && (
        <label>
          Тоот *
          <input
            required={numbered}
            maxLength={30}
            value={unit.unitNo ?? ""}
            onChange={(e) => onChange({ unitNo: e.target.value })}
          />
        </label>
      )}
      {showType && (
        <label>
          Загварын нэр *
          <input
            required={numbered}
            maxLength={100}
            placeholder="Жишээ: А загвар"
            value={unit.typeLabel}
            onChange={(e) => onChange({ typeLabel: e.target.value })}
          />
        </label>
      )}
      <label>
        Нэг байр хэдэн өрөөтэй вэ? *
        <input
          required={numbered}
          type="number"
          min={1}
          max={20}
          step={1}
          placeholder="Жишээ: 2"
          value={unit.rooms}
          onChange={(e) => onChange({ rooms: e.target.value })}
        />
      </label>
      <label>
        Нэг байрны нийт талбай, м² *
        <input
          required={numbered}
          type="number"
          min={0.01}
          max={10000}
          step={0.01}
          placeholder="56.50"
          value={unit.areaM2}
          onChange={(e) => onChange({ areaM2: e.target.value })}
        />
      </label>
    </>
  );
}
