"use client";
import { useEffect, useState } from "react";
import type { BuildingFacade } from "@mgl/types/building-website";
import { defaultFacadeRegions } from "../website/facade-regions";
import { PlanCanvas } from "../plans/PlanCanvas";
import { rectPoints, shapeBounds } from "../plans/plan-model";
import "../plans/plan-editor.css";

export function FacadeFloorEditor({
  facade,
  count,
  onChange,
}: {
  facade: BuildingFacade;
  count: number;
  onChange: (facade: BuildingFacade) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const regions = facade.floorRegions ?? [];
  const validCount = Number.isInteger(count) && count >= 1 && count <= 100;
  useEffect(() => {
    if (!validCount) return;
    const previous = facade.floorRegions ?? [];
    if (
      previous.length === count &&
      Array.from({ length: count }, (_, i) => i + 1).every((floor) =>
        previous.some((region) => region.floor === floor),
      )
    )
      return;
    const floorRegions = defaultFacadeRegions(
      Array.from({ length: count }, (_, index) => index + 1),
    ).map(
      (region) =>
        previous.find((saved) => saved.floor === region.floor) ?? region,
    );
    onChange({ ...facade, floorRegions });
  }, [count, validCount, facade, onChange]);
  return (
    <section>
      <h3>Давхрын идэвхжих хүрээ</h3>
      <p>
        Давхрын тоогоор бүх хүрээ автоматаар гарна. Зураг дээрээс хүрээг сонгон
        чирж, «Бүхэл хүрээний хэмжээ»-ээр өргөн, өндрийг тааруулна.
      </p>
      <div
        role="group"
        aria-label="Давхрын хүрээнүүд"
        style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}
      >
        {[...regions]
          .sort((a, b) => b.floor - a.floor)
          .map((region) => (
            <button
              key={region.id}
              type="button"
              className={
                selected === region.id
                  ? "building-primary"
                  : "building-secondary"
              }
              aria-pressed={selected === region.id}
              onClick={() => setSelected(region.id)}
            >
              {region.floor}-р давхар
            </button>
          ))}
      </div>
      <PlanCanvas
        tool="select"
        unitLabels="name"
        selectedId={selected}
        onSelect={setSelected}
        plan={{
          id: "facade-floors",
          name: "Давхрын хүрээ",
          background: facade.image,
          shapes: regions.map((r) => ({
            id: r.id,
            kind: "unit",
            label: r.floor + "-р давхар",
            unitSlot: null,
            points: rectPoints(r.x, r.y, r.width, r.height),
          })),
        }}
        onChange={(shapes) =>
          onChange({
            ...facade,
            floorRegions: regions.map((r) => {
              const shape = shapes.find((s) => s.id === r.id);
              return shape ? { ...r, ...shapeBounds(shape) } : r;
            }),
          })
        }
      />
      <p>
        {regions.length} / {validCount ? count : 0} давхар тэмдэглэсэн
      </p>
    </section>
  );
}
