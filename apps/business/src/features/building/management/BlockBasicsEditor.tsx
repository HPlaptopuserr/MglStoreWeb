"use client";
import { useState } from "react";
import { TowerElevation } from "../euro-plaza/masterplan/TowerElevation";
import type { BlockDraft } from "./inventory-draft";

export function BlockBasicsEditor({
  block,
  onChange,
  onComplete,
}: {
  block: BlockDraft;
  onChange: (block: BlockDraft) => void;
  onComplete: (block: BlockDraft) => void;
}) {
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const count = Number(block.floorCount);
  const validCount = Number.isInteger(count) && count >= 1 && count <= 100;
  const [error, setError] = useState("");
  function complete() {
    const count = Number(block.floorCount);
    if (
      !block.name.trim() ||
      !Number.isInteger(count) ||
      count < 1 ||
      count > 100
    ) {
      setError("Блокийн нэр болон 1–100 хооронд давхрын тоо оруулна уу.");
      return;
    }
    if (block.facade?.floorRegions?.some((region) => region.floor > count)) {
      setError("Давхрын тооноос хэтэрсэн хүрээг хасна уу.");
      return;
    }
    if (
      block.floors.some(
        (floor) => Number(floor.number) > count && floor.units.length,
      )
    ) {
      setError(
        "Хувилсан байртай давхруудыг хадгалахын тулд давхрын тоог багасгахгүй байна уу. Нэмсний дараа давхар тус бүрээр засаж болно.",
      );
      return;
    }
    const floors = Array.from(
      { length: count },
      (_, i) =>
        block.floors.find((floor) => Number(floor.number) === i + 1) ?? {
          id: crypto.randomUUID(),
          number: String(i + 1),
          units: [],
        },
    );
    onComplete({
      ...block,
      name: block.name.trim(),
      floors,
      floorTemplates: block.floorTemplates?.map((template) => ({
        ...template,
        floorIds: template.floorIds.filter((id) =>
          floors.some((floor) => floor.id === id),
        ),
      })),
    });
  }
  return (
    <div className="project-block-fields">
      <label>
        Блокийн нэр
        <input
          value={block.name}
          maxLength={100}
          placeholder="Жишээ: А блок"
          onChange={(event) => onChange({ ...block, name: event.target.value })}
        />
      </label>
      <label>
        Нийт хэдэн давхар вэ?
        <input
          type="number"
          min={1}
          max={100}
          value={block.floorCount}
          onChange={(event) =>
            onChange({ ...block, floorCount: event.target.value })
          }
        />
      </label>
      <section aria-label="Фасадын урьдчилсан харагдац">
        <p>
          Давхрын тоогоор фасад автоматаар үүснэ. Давхар дээр дарж сонгоорой.
        </p>
        {validCount ? (
          <div className="default-facade-preview default-facade-preview--compact">
            <TowerElevation
              floorCount={count}
              selected={
                selectedFloor !== null && selectedFloor <= count
                  ? selectedFloor
                  : count
              }
              onSelect={setSelectedFloor}
            />
          </div>
        ) : (
          <p role="status">
            1–100 хооронд давхрын тоо оруулбал барилгын дүрслэл харагдана.
          </p>
        )}
        {validCount && (
          <p aria-live="polite">
            {block.name || "Шинэ блок"} · {count} давхар · Сонгосон:{" "}
            {selectedFloor !== null && selectedFloor <= count
              ? selectedFloor
              : count}{" "}
            давхар
          </p>
        )}
      </section>
      {error && (
        <p role="alert" className="building-error-message">
          {error}
        </p>
      )}
      <div className="block-flow-actions">
        <span />
        <button type="button" className="building-primary" onClick={complete}>
          Блок нэмэх
        </button>
      </div>
    </div>
  );
}
