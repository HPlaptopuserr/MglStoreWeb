"use client";
import { useState } from "react";
import type { BlockDraft } from "./inventory-draft";
import { FloorTemplateEditor } from "./FloorTemplateEditor";
import { BlockFacadeEditor } from "./BlockFacadeEditor";
import { FloorEditor } from "./FloorEditor";

export function BlockEditor({ block, onChange, onComplete }: {
  block: BlockDraft; index: number; onChange: (block: BlockDraft) => void; onComplete: (block: BlockDraft) => void;
}) {
  const [tab, setTab] = useState<"templates" | "floors" | "facade">("templates");
  const [floorId, setFloorId] = useState(block.floors[0]?.id ?? "");
  const floor = block.floors.find(item => item.id === floorId);
  return <div>
    <div className="floor-template-tabs" style={{ padding: 24 }}>
      {([["templates", "Байрны загварууд"], ["floors", "Давхар тус бүр"], ["facade", "Фасадын зураг"]] as const).map(([id, label]) =>
        <button type="button" key={id} className={tab === id ? "building-primary" : "building-secondary"} onClick={() => setTab(id)}>{label}</button>)}
    </div>
    <div hidden={tab !== "templates"}><FloorTemplateEditor key={JSON.stringify(block.floors)} block={block} onComplete={onComplete} /></div>
    {tab === "floors" && <div className="project-block-fields">
      <label>Давхар<select value={floorId} onChange={e => setFloorId(e.target.value)}>{block.floors.map(item => <option key={item.id} value={item.id}>{item.number}-р давхар · {item.units.length} байр</option>)}</select></label>
      {floor && <FloorEditor floor={floor} expanded onChange={value => onChange({ ...block, floorTemplates: undefined, floors: block.floors.map(item => item.id === value.id ? value : item) })} onRemove={() => onChange({ ...block, floorTemplates: undefined, floors: block.floors.filter(item => item.id !== floor.id) })} />}
      <button type="button" className="building-primary" onClick={() => onComplete(block)}>Өөрчлөлт хадгалах</button>
    </div>}
    {tab === "facade" && <div className="project-block-fields"><BlockFacadeEditor block={block} onChange={onChange} /><button type="button" className="building-primary" onClick={() => onComplete(block)}>Фасад хадгалах</button></div>}
  </div>;
}
