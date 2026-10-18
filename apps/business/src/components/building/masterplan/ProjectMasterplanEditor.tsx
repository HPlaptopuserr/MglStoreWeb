"use client";
import { useState } from "react";
import Link from "next/link";
import type { ProjectMasterplan, WebsiteProject } from "@mgl/types/building-website";
import { managementFetch, responseError } from "@/lib/building-management";
import { readPlanImage } from "../plans/plan-storage";
import { ProjectMasterplanView } from "./ProjectMasterplanView";

export function ProjectMasterplanEditor({ project, onSaved }: { project: WebsiteProject; onSaved: () => void }) {
  const [value, setValue] = useState<ProjectMasterplan>(project.website.masterplan ?? { image: "", pins: [] });
  const [revision, setRevision] = useState(project.updatedAt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = JSON.stringify(value) !== JSON.stringify(project.website.masterplan ?? { image: "", pins: [] });
  async function save() {
    setBusy(true); setError("");
    try {
      const response = await managementFetch("admin/projects/" + project.id + "/website", {
        method: "PATCH", body: JSON.stringify({ updatedAt: revision, masterplan: value }),
      });
      if (!response.ok) throw new Error(await responseError(response, "Хадгалж чадсангүй."));
      const result: { project: { updatedAt: string } } = await response.json();
      setRevision(result.project.updatedAt);
      const verification = await managementFetch("admin/projects/" + project.id + "/website");
      if (!verification.ok) throw new Error(await responseError(verification, "Хадгалалтыг баталгаажуулж чадсангүй. Зураг энд хэвээр байна."));
      const saved: { project: WebsiteProject } = await verification.json();
      setRevision(saved.project.updatedAt);
      if (JSON.stringify(saved.project.website.masterplan) !== JSON.stringify(value))
        throw new Error("Сервер зураг, байрлалыг буцааж өгсөнгүй. Өөрчлөлтөө хадгалсан гэж үзээгүй; дахин хадгална уу.");
      onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Хадгалж чадсангүй."); }
    finally { setBusy(false); }
  }
  return <section className="masterplan-editor">
    <header><div><h2>Ерөнхий зураг ба блокууд</h2><p>1. Зураг оруулах → 2. Блок байрлуулах → 3. Хадгалах</p></div>
      <button className="building-primary" disabled={busy || !dirty} onClick={() => void save()}>{busy ? "Боловсруулж байна…" : "Хадгалах"}</button>
    </header>
    {error && <p role="alert" className="building-alert">{error}</p>}
    <div className="masterplan-editor-layout"><aside>
      <label className="masterplan-upload">Ерөнхий зураг оруулах
        <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={async (event) => {
          const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
          setBusy(true); setError("");
          try { const image = await readPlanImage(file); setValue((current) => ({ ...current, image })); }
          catch (cause) { setError(cause instanceof Error ? cause.message : "Зураг оруулахад алдаа гарлаа."); }
          finally { setBusy(false); }
        }} />
      </label>
      <small>PNG, JPG, WebP · 20 MB хүртэл</small>
      <h3>Блокууд</h3>
      {!project.blocks.length && <p>Эхлээд блокийн нэрээ нэмнэ үү.</p>}
      {project.blocks.map((block) => {
        const placed = value.pins.some((pin) => pin.blockId === block.id);
        return <div className="masterplan-block-row" key={block.id}><strong>{block.name}</strong>
          <button disabled={busy || !value.image} onClick={() => setValue((current) => ({ ...current, pins: placed ? current.pins.filter((pin) => pin.blockId !== block.id) : [...current.pins, { blockId: block.id, x: 50, y: 50 }] }))}>{placed ? "Зургаас авах" : "+ Байрлуулах"}</button></div>;
      })}
      <Link href={`/building/manage/${project.id}/edit`}>Блок нэмэх, нэр өөрчлөх →</Link>
      <p>Давхар, байрны мэдээллээ дараа нь бүртгэж болно. Тэмдэглэгээний мэдээлэл автоматаар шинэчлэгдэнэ.</p>
      {dirty && <p role="status">Хадгалаагүй өөрчлөлттэй</p>}
    </aside><ProjectMasterplanView project={project} value={value} onChange={busy ? undefined : setValue} /></div>
  </section>;
}
