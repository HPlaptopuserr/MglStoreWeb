"use client";

import Image from "next/image";
import { useState } from "react";
import { planAsset, type FloorPlan } from "./floor-plans";

export function FloorPlanPreview({ plan, floor }: { plan: FloorPlan; floor: number }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  return (
    <figure className="floor-plan-preview" aria-busy={status === "loading"}>
      {status === "loading" && <p role="status">Давхрын зураг ачааллаж байна…</p>}
      {status === "error" ? <p role="alert">Зураг ачаалагдсангүй. <a href={planAsset(plan, "pdf")} target="_blank" rel="noreferrer">Эх PDF-ийг нээх ↗</a></p> : (
        <a href={planAsset(plan, "png")} target="_blank" rel="noreferrer" aria-label={`${floor}-р давхрын зургийг томоор нээх`}>
          <Image src={planAsset(plan, "png")} alt={`${floor}-р давхрын байгуулалт — ${plan.label}`} width={2400} height={1697} sizes="(max-width: 760px) 100vw, 65vw" priority onLoad={() => setStatus("ready")} onError={() => setStatus("error")} />
        </a>
      )}
      <figcaption>{floor}-р давхрын байгуулалт · Зураг дээр дарж томоор үзэх ↗</figcaption>
    </figure>
  );
}
