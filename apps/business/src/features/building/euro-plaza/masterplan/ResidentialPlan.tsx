"use client";

import { useState } from "react";
import { getApartmentRegions, residentialPlanViewport } from "./apartment-regions";
import { planAsset, type FloorPlan } from "./floor-plans";

export function ResidentialPlan({ plan, floor, active, onActive }: {
  plan: FloorPlan; floor: number; active: string | null; onActive: (code: string | null) => void;
}) {
  const [mode, setMode] = useState<"3d" | "source">("3d");
  const [failed, setFailed] = useState(false);
  const regions = getApartmentRegions(plan);
  const selected = regions.find((unit) => unit.code === active);
  const { x, y, width, height } = residentialPlanViewport;
  // The furnished image is a presentation reference, not a measured drawing.
  // Source coordinates remain unchanged; the reference gets its own projection.
  const projection = plan.id === "floors-11-16"
    ? { sx:1.304, sy:1.32, tx:-539.6, ty:-368.4 }
    : { sx:1.228, sy:1.267, tx:-478.5, ty:-324.9 };
  const reference = mode === "3d";
  const switchMode = (next: "3d" | "source") => { setMode(next); setFailed(false); };
  const tooltipX = selected ? (reference ? selected.x * projection.sx + projection.tx : selected.x) : 0;
  const tooltipY = selected ? (reference ? selected.y * projection.sy + projection.ty : selected.y) : 0;
  return <section className="residential-plan" aria-label="Орон сууцны интерактив төлөвлөлт">
    <div className="residential-plan-toolbar" aria-label="Зургийн харагдац">
      <button type="button" aria-pressed={reference} onClick={() => switchMode("3d")}>Тавилгатай 3D</button>
      <button type="button" aria-pressed={!reference} onClick={() => switchMode("source")}>Эх зураг</button>
      <span>{reference ? "Интерьерийн дүрслэл" : "PDF-ийн хэмжээс, төлөвлөлт"}</span>
    </div>
    {failed ? <p role="alert">Зураг ачаалсангүй. <a href={planAsset(plan,"pdf")} target="_blank" rel="noreferrer">Эх PDF зураг нээх ↗</a></p> : <svg viewBox={reference ? "60 85 1390 750" : `${x - 20} ${y - 35} ${width + 40} ${height + 65}`} className={`residential-plan-svg mode-${mode}`} aria-label={`${floor}-р давхраас байр сонгох`}>
      {reference ? <image href={`/building/euro-plaza/${plan.id}-3d.png`} width="1491" height="1055" onError={() => setFailed(true)} /> : <image href={planAsset(plan,"png")} x="0" y="0" width="1888" height="1334" onError={() => setFailed(true)} />}
      <g className="residential-plan-hit-regions" transform={reference ? `translate(${projection.tx} ${projection.ty}) scale(${projection.sx} ${projection.sy})` : undefined}>
        {regions.map((unit) => <path key={unit.code} d={reference ? unit.displayPath : unit.path} fillRule="evenodd" role="button" tabIndex={0} aria-label={`«${unit.code}» айл, ${unit.rooms} өрөө, ${unit.area.toFixed(2)} м²`} aria-pressed={active === unit.code} className={active === unit.code ? "is-active" : ""} onPointerEnter={() => onActive(unit.code)} onFocus={() => onActive(unit.code)} onBlur={() => onActive(null)} onClick={() => onActive(unit.code)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onActive(unit.code); } if (event.key === "Escape") { event.stopPropagation(); onActive(null); } }} />)}
      </g>
      {selected && <g pointerEvents="none" className="residential-render-tooltip" transform={`translate(${tooltipX} ${Math.max(reference ? 115 : 345, tooltipY - 12)})`}>
        <rect x="-93" y="-50" width="186" height="50" rx="6" /><path d="M-9 0L0 9L9 0Z" />
        <text y="-29" textAnchor="middle">«{selected.code}» · {selected.area.toFixed(2)} м²</text><text y="-12" textAnchor="middle" className="render-tooltip-detail">{selected.rooms} өрөө · {floor}-р давхар</text>
      </g>}
    </svg>}
    <div className="residential-plan-selection" aria-live="polite">{selected ? <><strong>«{selected.code}» айл · {selected.area.toFixed(2)} м²</strong><span>{selected.rooms} өрөө · {floor}-р давхар</span></> : <><strong>Өөрийн байраа сонгоорой</strong><span>Зураг эсвэл жагсаалтаас сонгоно уу</span></>}</div>
    <p className="plan-render-note">{reference ? "3D зураг нь тохижилтын жишээ. Хана, өрөөний нарийн байрлалыг «Эх зураг»-аас шалгана уу." : "Эх PDF-ийн өнгөөр ялгасан байрны хил, талбай."}</p>
  </section>;
}
