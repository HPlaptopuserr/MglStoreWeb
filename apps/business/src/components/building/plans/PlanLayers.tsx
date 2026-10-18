import { useState } from "react";
import { Pencil, Layers, Search } from "lucide-react";
import { shapeLabels, type PlanShape } from "./plan-model";

function LayerRow({ shape, index, selected, onSelect, onRename }: {
  shape: PlanShape; index: number; selected: boolean;
  onSelect: () => void; onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(shape.label);
  function begin() { setName(shape.label); setEditing(true); onSelect(); }
  function finish() {
    const value = name.trim();
    if (value && value !== shape.label) onRename(value);
    setEditing(false);
  }
  return <li className={selected ? "is-selected" : ""}>
    <span className="studio-layer-number">{index + 1}</span>
    {editing ? <input autoFocus aria-label={`${index + 1}-р хэсгийн нэр`} maxLength={100} value={name}
      onChange={(event) => setName(event.target.value)} onBlur={finish}
      onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); finish(); } if (event.key === "Escape") { event.stopPropagation(); setEditing(false); } }} />
      : <button type="button" className="studio-layer-select" aria-pressed={selected} onClick={onSelect} onDoubleClick={begin} onKeyDown={(event) => { if (event.key === "F2") { event.preventDefault(); begin(); } }}>
        <strong title={shape.label}>{shape.label}</strong><small>{shapeLabels[shape.kind]}{shape.unitSlot !== null ? ` · ${shape.unitSlot + 1}-р нэгж` : ""}</small>
      </button>}
    <button type="button" className="studio-layer-rename" aria-label={`${index + 1}-р хэсгийн нэр солих`} onClick={begin}><Pencil size={13} /></button>
  </li>;
}
export function PlanLayers({ shapes, selectedId, onSelect, onRename }: {
  shapes: PlanShape[]; selectedId: string | null;
  onSelect: (id: string) => void; onRename: (id: string, name: string) => void;
}) {
  const [search, setSearch] = useState("");
  const matches = shapes.map((shape, index) => ({ shape, index })).filter(({ shape }) => shape.label.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return <aside className="studio-layers" aria-label="Зургийн давхаргууд">
    <header><Layers size={16} /><strong>Давхаргууд</strong><span>{shapes.length}</span></header>
    <label className="studio-layer-search"><Search size={14}/><input aria-label="Хэсгийн нэрээр хайх" placeholder="Хэсэг хайх…" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
    <p>Давхар товшиж эсвэл ✎ дарж нэрлэнэ.</p>
    <ul>{matches.map(({ shape, index }) => <LayerRow key={shape.id} shape={shape} index={index} selected={selectedId === shape.id} onSelect={() => onSelect(shape.id)} onRename={(name) => onRename(shape.id, name)} />)}</ul>
    {!matches.length && <p>{shapes.length ? "Тохирох хэсэг олдсонгүй." : "Зурсан хэсгүүд энд харагдана."}</p>}
  </aside>;
}
