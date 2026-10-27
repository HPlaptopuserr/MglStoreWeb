"use client";
import { useState, type FormEvent } from "react";
import type { WebsiteProject } from "@mgl/types/building-website";
import { managementFetch, responseError } from "@/features/building/api/management-client";

export function ProjectPriceEditor({ project, onSaved }: { project: WebsiteProject; onSaved: () => void }) {
  const [rate, setRate] = useState(project.website.pricePerM2?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await managementFetch(`admin/projects/${project.id}/website`, {
        method: "PATCH", body: JSON.stringify({ updatedAt: project.updatedAt, pricePerM2: Number(rate) }),
      });
      if (!response.ok) throw new Error(await responseError(response, "Үнэ хадгалж чадсангүй."));
      const verification = await managementFetch(`admin/projects/${project.id}/website`);
      if (!verification.ok) throw new Error("Хадгалсан үнийг шалгаж чадсангүй. Оруулсан үнэ хэвээр байна.");
      const result = await verification.json() as { project: WebsiteProject };
      if (result.project.website.pricePerM2 !== Number(rate)) {
        throw new Error("Үнэ серверт хадгалагдсангүй. Оруулсан үнэ хэвээр байна. Дахин оролдоно уу.");
      }
      onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Алдаа гарлаа."); }
    finally { setSaving(false); }
  }
  return <form className="website-form-section" onSubmit={save}>
    <h2>Байрны үнэ</h2>
    <fieldset disabled={saving} className="website-field-grid">
      <label>1 м²-ийн үнэ, ₮<input required type="number" min={0} max={1000000000} step={0.01} value={rate} onChange={event => setRate(event.target.value)} /></label>
      <button type="submit" className="building-primary">{saving ? "Тооцож хадгалж байна…" : "Бүх байрны үнийг шинэчлэх"}</button>
    </fieldset>
    <p>Бүх блокийн байрны нийт үнэ = талбай × 1 м²-ийн үнэ. {rate !== "" && `100 м² = ${(Number(rate) * 100).toLocaleString("mn-MN")} ₮.`}</p>
    {error && <p role="alert" className="building-alert">{error}</p>}
  </form>;
}
