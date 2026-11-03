import { useState } from "react";
import { union, type Polygon } from "polygon-clipping";
import type { PlanShape } from "./plan-model";

export function PlanMergeParts({ shapes, selected, onChange, onError }: {
  shapes: PlanShape[];
  selected: PlanShape;
  onChange: (shapes: PlanShape[]) => void;
  onError: (message: string) => void;
}) {
  const [checked, setChecked] = useState<string[]>([]);
  const parts = shapes.filter((shape) => shape.kind === "unit" && (shape.id === selected.id || checked.includes(shape.id)));
  function merge() {
    if (parts.length < 2) return;
    const slots = new Set(parts.flatMap((part) => part.unitSlot === null ? [] : [part.unitSlot]));
    if (slots.size > 1) { onError("Өөр өөр байртай холбосон хэсгүүд байна. Холбоосыг шалгана уу."); return; }
    try {
      const polygons: Polygon[] = parts.map((part) => [part.points.map((p): [number, number] => [p.x, p.y])]);
      const result = union(polygons[0], ...polygons.slice(1));
      if (result.length !== 1 || result[0].length !== 1) {
        onError("Хэсгүүдийг хүргэлцүүлж эсвэл давхцуулж байрлуулаарай. Хоорондын хоосон зайг автоматаар дүүргэхгүй."); return;
      }
      const points = result[0][0].slice(0, -1).map(([x, y]) => ({ x, y }));
      if (points.length > 50) { onError("Нэгдсэн хүрээ 50-аас олон цэгтэй байна. Илүүдэл цэгийг багасгана уу."); return; }
      const ids = new Set(parts.map((part) => part.id));
      onChange(shapes.filter((shape) => shape.id === selected.id || !ids.has(shape.id)).map((shape) => shape.id === selected.id ? { ...shape, points, unitSlot: [...slots][0] ?? null } : shape));
      setChecked([]);
      onError("");
    } catch { onError("Хүрээнүүдийг нэгтгэж чадсангүй. Огтлолцсон цэгүүдийг шалгана уу."); }
  }
  return <fieldset className="plan-merge-parts">
    <legend>Олон хэсгийг нэгтгэх</legend>
    <p>Сонгосон хэсэг дээр нэмэх хэсгүүдээ тэмдэглэнэ үү.</p>
    <div style={{ maxHeight: 200, overflowY: "auto" }}>{shapes.filter((shape) => shape.kind === "unit").map((shape, index) => <label key={shape.id} style={{ display: "flex", flexDirection: "row", gap: 8 }}>
      <input type="checkbox" checked={shape.id === selected.id || checked.includes(shape.id)} disabled={shape.id === selected.id} onChange={(event) => setChecked((previous) => event.target.checked ? [...previous, shape.id] : previous.filter((id) => id !== shape.id))} />
      {index + 1}. {shape.label}{shape.id === selected.id ? " (сонгосон)" : ""}
    </label>)}</div>
    <button type="button" disabled={parts.length < 2} onClick={merge}>{parts.length} хэсгийг нэгтгэх</button>
    <small>Доторх зааг арилж нэг хүрээ болно. «Буцаах» товчоор сэргээнэ.</small>
  </fieldset>;
}
