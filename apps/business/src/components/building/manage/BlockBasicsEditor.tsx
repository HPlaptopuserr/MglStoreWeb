"use client";
import { useState } from "react";
import { FacadeFloorEditor } from "./FacadeFloorEditor";
import { readPlanImage } from "../plans/plan-storage";
import type { BlockDraft } from "./inventory-draft";

export function BlockBasicsEditor({ block, onChange, onComplete }: {
  block: BlockDraft;
  onChange: (block: BlockDraft) => void;
  onComplete: (block: BlockDraft) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function complete() {
    const count = Number(block.floorCount);
    if (!block.name.trim() || !Number.isInteger(count) || count < 1 || count > 100) {
      setError("Блокийн нэр болон 1–100 хооронд давхрын тоо оруулна уу.");
      return;
    }
    if (block.facade?.floorRegions?.some(region => region.floor > count)) { setError("Давхрын тооноос хэтэрсэн хүрээг хасна уу."); return; }
    if (block.floors.some(floor => Number(floor.number) > count && floor.units.length)) {
      setError("Хувилсан байртай давхруудыг хадгалахын тулд давхрын тоог багасгахгүй байна уу. Нэмсний дараа давхар тус бүрээр засаж болно.");
      return;
    }
    const floors = Array.from({ length: count }, (_, i) =>
      block.floors.find(floor => Number(floor.number) === i + 1) ?? {
        id: crypto.randomUUID(), number: String(i + 1), units: [],
      });
    onComplete({ ...block, name: block.name.trim(), floors,
      floorTemplates: block.floorTemplates?.map(template => ({
        ...template, floorIds: template.floorIds.filter(id => floors.some(floor => floor.id === id)),
      })),
    });
  }
  return <div className="project-block-fields">
    <label>Блокийн нэр<input value={block.name} maxLength={100} placeholder="Жишээ: А блок" onChange={(event) => onChange({ ...block, name: event.target.value })} /></label>
    <label>Нийт хэдэн давхар вэ?<input type="number" min={1} max={100} value={block.floorCount} onChange={(event) => onChange({ ...block, floorCount: event.target.value })} /></label>
    <label>Барилгын фасадын зураг
      <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={async (event) => {
        const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
        setBusy(true); setError("");
        try { const image = await readPlanImage(file); onChange({ ...block, facade: { image, regions: [] } }); }
        catch (cause) { setError(cause instanceof Error ? cause.message : "Зураг оруулж чадсангүй."); }
        finally { setBusy(false); }
      }} />
    </label>
    <p>Барилгын бүх давхар харагдах, гаднаас эгц эсвэл бага зэрэг хажуугаас харуулсан зураг оруулна уу. PNG, JPG, WebP · 20 MB хүртэл.</p>
    {block.facade && <FacadeFloorEditor facade={block.facade} count={Number(block.floorCount)} onChange={facade => onChange({ ...block, facade })} />}
    {error && <p role="alert" className="building-error-message">{error}</p>}
    <div className="block-flow-actions"><span /><button type="button" className="building-primary" disabled={busy} onClick={complete}>{busy ? "Зураг боловсруулж байна…" : "Блок нэмэх"}</button></div>
  </div>;
}
