import type { PlanShape } from "./plan-model";

export function PlanUnitDetails({ shape, shapes, onChange }: {
  shape: PlanShape; shapes: PlanShape[]; onChange: (patch: Partial<PlanShape>) => void;
}) {
  function update(field: "rooms" | "areaM2", raw: string) {
    const used = new Set(shapes.flatMap(item => item.unitSlot === null ? [] : [item.unitSlot]));
    const slot = shape.unitSlot ?? Array.from({ length: 200 }, (_, i) => i).find(i => !used.has(i)) ?? null;
    onChange({ inventory: { rooms: shape.inventory?.rooms ?? null, areaM2: shape.inventory?.areaM2 ?? null, ...shape.inventory, [field]: raw ? Number(raw) : null }, unitSlot: slot });
  }
  return <fieldset className="plan-unit-details">
    <legend>Байрны мэдээлэл</legend>
    <p>Сонгосон бүсийн өрөө, бодит талбайг оруулна уу. «Хадгалах» товчоор баталгаажуулна.</p>
    <label>Өрөөний тоо<input type="number" min={1} max={20} step={1} placeholder="Жишээ: 3" value={shape.inventory?.rooms ?? ""} onChange={event => update("rooms", event.target.value)} /></label>
    <label>Талбай, м²<input type="number" min={0.01} max={10000} step={0.01} placeholder="Жишээ: 79.1" value={shape.inventory?.areaM2 ?? ""} onChange={event => update("areaM2", event.target.value)} /></label>
  </fieldset>;
}
