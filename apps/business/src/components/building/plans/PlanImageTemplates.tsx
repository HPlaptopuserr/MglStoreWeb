"use client";

import { useState } from "react";
import { templateRegions } from "./template-regions";
import { readPlanImage } from "./plan-storage";
import type { FloorPlan } from "./plan-model";

const templates = [
  { id: "floor-1", name: "1-р давхар · Model01", usage: "Үйлчилгээ" },
  { id: "floors-2-3", name: "2–3-р давхар · Model02", usage: "Үйлчилгээ" },
  { id: "floors-4-10", name: "5–10-р давхар", usage: "14 айл" },
  { id: "floors-11-16", name: "11–16-р давхар", usage: "12 айл" },
] as const;

export function PlanImageTemplates({ onAdd, onError, disabled }: {
  onAdd: (plan: FloorPlan) => void;
  onError: (message: string) => void;
  disabled: boolean;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  async function addTemplate(id: string, name: string) {
    setLoading(id);
    onError("");
    try {
      const response = await fetch(`/building/euro-plaza/${id}-3d.png`);
      if (!response.ok) throw new Error("Загварын зураг ачаалж чадсангүй. Дахин оролдоно уу.");
      const file = new File([await response.blob()], `${id}.png`, { type: "image/png" });
      const background = await readPlanImage(file);
      const bitmap = await createImageBitmap(file);
      const shapes = templateRegions(id, bitmap.width, bitmap.height);
      bitmap.close();
      onAdd({ id: crypto.randomUUID(), name, background, shapes });
    } catch (error: unknown) {
      onError(error instanceof Error ? error.message : "Зураг оруулж чадсангүй.");
    } finally {
      setLoading(null);
    }
  }
  return <details className="plan-template-picker">
    <summary>Бэлдсэн Евро Плаза зургаас сонгох</summary>
    <p>Сонгосон зураг идэвхжих хүрээнүүдийн хамт шинэ план болж нэмэгдэнэ. Хүрээнүүдийг бүртгэлтэй нэгжтэй холбоод тохирох давхруудад онооно. Бусад блокт «План зураг оруулах» товчоор өөрийн зургаа оруулаарай.</p>
    <div className="plan-template-grid">
      {templates.map((template) => <button key={template.id} type="button" disabled={disabled || loading !== null} onClick={() => void addTemplate(template.id, template.name)}>
        {/* Static local previews retain their natural aspect ratio. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/building/euro-plaza/${template.id}-3d.png`} alt={`${template.name} тавилгатай төлөвлөлт`} loading="lazy" />
        <strong>{template.name}</strong><span>{loading === template.id ? "Оруулж байна…" : template.usage}</span>
      </button>)}
    </div>
    <p>Үйлчилгээний хүрээнүүд нь зурагт тулгуурласан засварлах боломжтой эхлэл. 3D нь тохижилтын дүрслэл. Байрны хүрээ, хэмжээсийг эх PDF-тэй тулгаж тохируулна. 4-р давхар үйлчилгээний зориулалттай тул тусдаа зураг оруулна.</p>
    {loading && <span role="status">Зураг ачаалж байна…</span>}
  </details>;
}
