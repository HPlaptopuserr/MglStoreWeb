"use client";

import Image from "next/image";
import { ResidentialPlan } from "./ResidentialPlan";
import { useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import { getApartmentRegions } from "./apartment-regions";
import { countPlannedUnits, planAsset } from "./floor-plans";
import type { BlockInventory } from "./inventory";

export function FloorPlanExplorer({ block, floor, onFloorChange, onBack, onClose }: {
  block: BlockInventory; floor: number; onFloorChange: (floor: number) => void; onBack: () => void; onClose: () => void;
}) {
  const plan = block.floors.find((item) => item.number === floor)?.plan;
  const [active, setActive] = useState<string | null>(null);
  const [imageStatus, setImageStatus] = useState<"loading" | "ready" | "error">("loading");
  const regions = plan ? getApartmentRegions(plan) : [];

  return <div className="plan-explorer">
    <header className="plan-explorer-header">
      <button type="button" onClick={onBack}><ArrowLeft size={16} /> Фасад руу</button>
      <h2 id="elevation-title">{block.name} <span>/ {floor}-р давхар</span></h2>
      <button type="button" onClick={onClose}><X size={16} /> Хаах</button>
    </header>
    <aside className="plan-explorer-sidebar">
      <label>ДАВХАР <select aria-label="Plan давхар сонгох" value={floor} onChange={(event) => onFloorChange(Number(event.target.value))}>{block.floors.map((item) => <option key={item.number} value={item.number}>{item.number}-р давхар</option>)}</select></label>
      <h3>{floor <= 4 ? "ҮЙЛЧИЛГЭЭНИЙ ТӨВ" : `ДАВХАРТ ${plan ? countPlannedUnits(plan) : "—"} АЙЛ`}</h3>
      <p className="plan-explorer-muted">{floor <= 4 ? "1–4-р давхар · Худалдаа, үйлчилгээ" : "Байр дээр хулганаа аваачих эсвэл товшино уу."}</p>
      {regions.length > 0 ? <div className="plan-apartment-list">{regions.map((unit) => <button key={unit.code} type="button" className={active === unit.code ? "is-active" : ""} aria-pressed={active === unit.code} onPointerEnter={() => setActive(unit.code)} onFocus={() => setActive(unit.code)} onClick={() => setActive(unit.code)}>
        <strong><span className="plan-unit-label"><i style={{ backgroundColor: unit.color }} />«{unit.code}» айл</span><span>{unit.area.toFixed(2)} м²</span></strong>
        <small>{unit.rooms} өрөө · {floor}-р давхар</small><small>Борлуулалтын төлөв ирээгүй</small>
      </button>)}</div> : <div className="plan-commercial-info">{plan ? <><p>Үйлчилгээний талбай <strong>{plan.serviceArea?.toFixed(2)} м²</strong></p><p>Давхрын нийт талбай <strong>{plan.floorArea.toFixed(2)} м²</strong></p></> : <p>4-р давхар нь үйлчилгээний төв. Шинэ зориулалтын зураглал хүлээгдэж байна.</p>}</div>}
      {plan && <a className="plan-source-link" href={planAsset(plan, "pdf")} target="_blank" rel="noreferrer">Эх PDF зураг ↗</a>}
    </aside>
    <main className="plan-explorer-canvas" aria-label={`${floor}-р давхрын plan`}>
      <div className="plan-canvas-heading"><span>{floor <= 4 ? "COMMERCIAL" : "RESIDENCES"}</span><strong>{floor}-р давхрын төлөвлөлт</strong></div>
      {plan ? <>
        <div className="plan-interactive-image" onPointerLeave={() => setActive(null)}>
          {plan.usage === "residential" ? <ResidentialPlan plan={plan} floor={floor} active={active} onActive={setActive} /> : <Image src={`/building/euro-plaza/${plan.id}-3d.png`} alt={`${floor}-р давхрын үйлчилгээний төлөвлөлт`} width={1491} height={1055} sizes="(max-width: 760px) 100vw, 80vw" priority onLoad={() => setImageStatus("ready")} onError={() => setImageStatus("error")} />}
          {plan.usage !== "residential" && imageStatus === "loading" && <p className="plan-image-status" role="status">Зураг ачааллаж байна…</p>}
          {imageStatus === "error" && <p role="alert">Зураг ачаалагдсангүй. «Эх PDF зураг» холбоосоор үзнэ үү.</p>}

        </div>
        {plan.usage !== "residential" && <p className="plan-render-note">3D тохижилтын дүрслэл · Хэмжээсийг эх PDF-ээс шалгана уу.</p>}
      </> : <div className="plan-empty"><strong>4-р давхар · Үйлчилгээний төв</strong><p>Үйлчилгээний шинэ plan зураг хүлээгдэж байна.</p></div>}
    </main>
    <nav className="plan-floor-rail" aria-label="Давхрууд"><span>ДАВХАР</span>{block.floors.map((item) => <button key={item.number} type="button" aria-label={`${item.number}-р давхрын plan`} aria-current={floor === item.number ? "true" : undefined} onClick={() => onFloorChange(item.number)}>{item.number}<small>{item.number <= 4 ? "Ү" : ""}</small></button>)}</nav>
  </div>;
}
