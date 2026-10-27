import { BuildingDialog } from "../management/BuildingDialog";
import type { PlanShape } from "./plan-model";
import "./plan-units-dialog.css";

interface Props {
  shapes: PlanShape[];
  onChange: (shapes: PlanShape[]) => void;
  onClose: () => void;
  onSave: () => Promise<boolean>;
  saving: boolean;
  error: string;
}

export function PlanUnitsDialog({ shapes, onChange, onClose, onSave, saving, error }: Props) {
  const units = shapes.filter(shape => shape.kind === "unit");
  function update(id: string, field: "label" | "unitNo" | "rooms" | "areaM2", raw: string) {
    const used = new Set(shapes.flatMap(shape => shape.unitSlot === null ? [] : [shape.unitSlot]));
    onChange(shapes.map(shape => {
      if (shape.id !== id) return shape;
      if (field === "label") return { ...shape, label: raw };
      return { ...shape,
        unitSlot: shape.unitSlot ?? Array.from({ length: 200 }, (_, index) => index).find(index => !used.has(index)) ?? null,
        inventory: { rooms: null, areaM2: null, ...shape.inventory,
          [field]: field === "unitNo" ? raw : raw === "" ? null : Number(raw) },
      };
    }));
  }
  return <BuildingDialog title="Байрны мэдээлэл" subtitle={`${units.length} байрны бүс · Нэр, тоот, өрөө, талбай`} onClose={onClose}
    footer={<button type="submit" form="plan-units-form" className="building-primary" disabled={saving}>{saving ? "Хадгалж байна…" : "Хадгалах"}</button>}>
    <form id="plan-units-form" className="plan-units-form" onSubmit={async event => { event.preventDefault(); if (await onSave()) onClose(); }}>
      <p>Байр гэж тэмдэглэсэн бүх бүс энд харагдана. Планыг давхарт онооход бүртгэл үүснэ. Тоотыг хоосон үлдээвэл автоматаар дугаарлана.</p>
      {error && <p role="alert" className="building-alert">{error}</p>}
      {!units.length && <p>План дээр «Дөрвөлжин бүс» эсвэл «Олон өнцөгт» хэрэгслээр байрны бүс үүсгэнэ үү.</p>}
      <fieldset disabled={saving}>
        {units.map((shape, index) => <div className="plan-unit-row" key={shape.id}>
          <strong>{index + 1}</strong>
          <label>Нэр<input aria-label={`Байр ${index + 1}: нэр`} required maxLength={100} value={shape.label} onChange={event => update(shape.id, "label", event.target.value)} /></label>
          <label>Тоот<input aria-label={`Байр ${index + 1}: тоот`} maxLength={30} placeholder="Автомат" value={shape.inventory?.unitNo ?? ""} onChange={event => update(shape.id, "unitNo", event.target.value)} /></label>
          <label>Өрөөний тоо<input aria-label={`Байр ${index + 1}: өрөөний тоо`} type="number" min={1} max={20} step={1} value={shape.inventory?.rooms ?? ""} onChange={event => update(shape.id, "rooms", event.target.value)} /></label>
          <label>Талбай, м²<input aria-label={`Байр ${index + 1}: талбай`} type="number" min={0.01} max={10000} step={0.01} value={shape.inventory?.areaM2 ?? ""} onChange={event => update(shape.id, "areaM2", event.target.value)} /></label>
        </div>)}
      </fieldset>
    </form>
  </BuildingDialog>;
}
