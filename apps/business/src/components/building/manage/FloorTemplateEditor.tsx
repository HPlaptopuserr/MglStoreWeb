"use client";
import { useState } from "react";
import { UnitFields } from "./UnitFields";
import { newUnit, inventoryError, type BlockDraft } from "./inventory-draft";
import { applyFloorTemplates, inferFloorTemplates, type FloorTemplate } from "./floor-templates";
import "./floor-templates.css";

export function FloorTemplateEditor({ block, onComplete }: { block: BlockDraft; onComplete: (block: BlockDraft) => void }) {
  const [templates, setTemplates] = useState(() => block.floorTemplates ?? inferFloorTemplates(block));
  const [activeId, setActiveId] = useState(templates[0]?.id ?? "");
  const [error, setError] = useState("");
  const active = templates.find(t => t.id === activeId);
  const occupiedFloorIds = new Set(templates.filter(t => t.id !== activeId).flatMap(t => t.floorIds));
  const availableFloors = block.floors.filter(floor => !occupiedFloorIds.has(floor.id));
  function update(patch: Partial<FloorTemplate>) {
    setTemplates(current => current.map(t => t.id === activeId ? { ...t, ...patch } : t));
  }
  function assign(floorIds: string[], checked: boolean) {
    setTemplates(current => {
      const occupied = new Set(current.filter(t => t.id !== activeId).flatMap(t => t.floorIds));
      const allowed = floorIds.filter(id => !occupied.has(id));
      return current.map(t => t.id !== activeId ? t : {
        ...t,
        floorIds: checked ? [...new Set([...t.floorIds, ...allowed])] : t.floorIds.filter(id => !floorIds.includes(id)),
      });
    });
  }

  function save() {
    for (const template of templates) {
      if (!template.name.trim() || !template.units.length) { setError("Загварын нэр болон байруудаа оруулна уу."); return; }
      const validation = inventoryError([{ ...block, floors: [{ id: "validation", number: "1", units: template.units.map((unit, i) => ({ ...unit, unitNo: String(i + 1) })) }] }]);
      if (validation) { setError(template.name + ": " + validation); return; }
    }
    const next = applyFloorTemplates(block, templates);
    const validation = inventoryError([next]);
    if (validation) { setError(validation); return; }
    onComplete(next);
  }
  return <section className="floor-template-editor">
    <p>Байрны бүрдлээ нэг удаа оруулаад ижил зохион байгуулалттай давхруудад онооно. Тоотыг давхрын дугаараар автоматаар үүсгэнэ.</p>
    <div className="floor-template-tabs" role="group" aria-label="Давхрын загварууд">
      {templates.map(t => <button type="button" className={t.id === activeId ? "building-primary" : "building-secondary"} aria-pressed={t.id === activeId} key={t.id} onClick={() => setActiveId(t.id)}>{t.name} · {t.floorIds.length} давхар</button>)}
      <button type="button" className="building-secondary" disabled={templates.length >= 20} onClick={() => { const template = { id: crypto.randomUUID(), name: `Загвар ${templates.length + 1}`, units: [newUnit()], floorIds: [] }; setTemplates([...templates, template]); setActiveId(template.id); }}>+ Загвар нэмэх</button>
    </div>
    {active && <>
      <label>Бүрдлийн нэр<input maxLength={100} value={active.name} onChange={e => update({ name: e.target.value })} /></label>
      <div className="floor-template-units">
        {active.units.map((unit, index) => <article key={unit.id}>
          <strong>Байр {index + 1}</strong>
          <UnitFields unit={unit} onChange={patch => update({ units: active.units.map(u => u.id === unit.id ? { ...u, ...patch } : u) })} />
          <button type="button" className="building-secondary" onClick={() => update({ units: active.units.filter(u => u.id !== unit.id) })}>Хасах</button>
        </article>)}
      </div>
      <button type="button" className="building-secondary" disabled={active.units.length >= 50} onClick={() => update({ units: [...active.units, newUnit()] })}>+ Бүрдэлд байр нэмэх</button>
      <h3>Энэ загварыг оноох давхрууд</h3>
      <p>Өөр загварт оноосон давхрууд энд харагдахгүй. Шилжүүлэх бол өмнөх загвараас сонголтыг нь эхлээд арилгана.</p>
      <div className="floor-template-tabs"><button type="button" className="building-secondary" onClick={() => assign(availableFloors.map(f => f.id), true)} disabled={!availableFloors.length}>Үлдсэн давхруудыг сонгох</button><button type="button" className="building-secondary" onClick={() => update({ floorIds: [] })}>Сонголт арилгах</button></div>
      {!availableFloors.length && <p role="status">Бүх давхрыг бусад загварт оноосон байна.</p>}
      <div className="floor-template-floors">
        {availableFloors.map(floor => {
          const assigned = templates.find(t => t.floorIds.includes(floor.id));
          return <label key={floor.id}><input type="checkbox" checked={assigned?.id === activeId} onChange={e => assign([floor.id], e.target.checked)} /><span>{floor.number}-р давхар<small>{assigned?.name ?? "Оноогоогүй"}</small></span></label>;
        })}
      </div>
      <p>{active.units.length} байр × {active.floorIds.length} давхар = {active.units.length * active.floorIds.length} байр</p>
    </>}
    {error && <p role="alert" className="building-error-message">{error}</p>}
    <button type="button" className="building-primary" onClick={save}>Загваруудыг давхарт оноож хадгалах</button>
  </section>;
}
