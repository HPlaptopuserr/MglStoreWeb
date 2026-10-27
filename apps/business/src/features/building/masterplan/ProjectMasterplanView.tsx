"use client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useRef, useState } from "react";
import type { ProjectMasterplan, WebsiteProject } from "@mgl/types/building-website";
import "./masterplan.css";

interface Props {
  project: WebsiteProject;
  value: ProjectMasterplan;
  onChange?: (value: ProjectMasterplan) => void;
  base?: string;
}
export function ProjectMasterplanView({ project, value, onChange, base }: Props) {
  const router = useRouter();
  const frame = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const block = project.blocks.find((item) => item.id === active);
  const units = block?.floors.flatMap((floor) => floor.units) ?? [];
  function move(blockId: string, clientX: number, clientY: number) {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect || !onChange) return;
    const x = Math.max(0, Math.min(100, (clientX - rect.left) / rect.width * 100));
    const y = Math.max(0, Math.min(100, (clientY - rect.top) / rect.height * 100));
    onChange({ ...value, pins: value.pins.map((pin) => pin.blockId === blockId ? { ...pin, x, y } : pin) });
  }
  if (!value.image) return <div className="masterplan-empty">Дээрээс харсан ерөнхий зургаа оруулаад блокуудаа байрлуулаарай.</div>;
  return <section className="project-masterplan">
    <div className="masterplan-caption"><strong>{project.title}</strong><span>{onChange ? "Тэмдэглэгээг чирж байрлуулна · Сумтай товчоор нарийвчилна" : "Зураг дээрээс блок сонгоорой"}</span></div>
    <div className="masterplan-image" ref={frame}>
      <Image src={value.image} alt={project.title + " ерөнхий төлөвлөгөө"} width={1600} height={900} unoptimized draggable={false} />
      {value.pins.map((pin) => {
        const item = project.blocks.find((candidate) => candidate.id === pin.blockId);
        if (!item) return null;
        return <button key={pin.blockId} type="button" className="masterplan-pin" aria-label={item.name} aria-pressed={active === pin.blockId}
          style={{ left: pin.x + "%", top: pin.y + "%", touchAction: onChange ? "none" : "auto" }}
          onMouseEnter={() => setActive(pin.blockId)} onFocus={() => setActive(pin.blockId)} onClick={() => { setActive(pin.blockId); if (!onChange && base) router.push(base + "/" + encodeURIComponent(item.name)); }}
          onPointerDown={(event) => { if (onChange) { event.preventDefault(); event.currentTarget.focus({ preventScroll: true }); event.currentTarget.setPointerCapture(event.pointerId); } }}
          onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) move(pin.blockId, event.clientX, event.clientY); }}
          onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
          onKeyDown={(event) => {
            if (!onChange || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
            event.preventDefault();
            const step = event.shiftKey ? 2 : 0.25;
            onChange({ ...value, pins: value.pins.map((p) => p.blockId === pin.blockId ? { ...p, x: Math.max(0, Math.min(100, p.x + (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0))), y: Math.max(0, Math.min(100, p.y + (event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0))) } : p) });
          }}>{item.name}</button>;
      })}
    </div>
    {block && <div className="masterplan-info" aria-live="polite">
      <strong>{block.name}</strong>
      <span>{block.floors.length} давхар</span><span>{units.length} бүртгэлтэй нэгж</span>
      <span>Боломжтой: {units.filter((u) => u.status === "AVAILABLE").length}</span>
      <span>Захиалсан: {units.filter((u) => ["RESERVED", "CONTRACT_PENDING"].includes(u.status)).length}</span>
      <span>Зарагдсан: {units.filter((u) => u.status === "SOLD").length}</span>
      {base && block.floors[0] && <a href={base + "/" + encodeURIComponent(block.name)}>Давхар сонгох →</a>}
    </div>}
  </section>;
}
