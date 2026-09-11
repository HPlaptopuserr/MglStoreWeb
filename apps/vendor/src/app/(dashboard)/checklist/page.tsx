"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { API, authFetch } from "@/lib/api";
import { ChecklistSectionEditor, newQuestion, type ChecklistSection } from "@/components/quality/checklist-section-editor";

interface Template { name: string; version: number; schema: ChecklistSection[] }

export default function ChecklistPage() {
  const [template, setTemplate] = useState<Template | null>(null);
  const [name, setName] = useState("");
  const [sections, setSections] = useState<ChecklistSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError(""); setReady(false);
    try {
      const response = await authFetch(`${API}/quality/checklists/manage`);
      if (!response.ok) {
        const result: { message?: string } = await response.json();
        throw new Error(result.message ?? "Checklist ачаалж чадсангүй.");
      }
      const result: Template | null = await response.json();
      setTemplate(result); setName(result?.name ?? ""); setSections(result?.schema ?? []); setReady(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Сервертэй холбогдож чадсангүй."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (saving || !ready || !sections.length) return;
    setSaving(true); setError(""); setSaved(false);
    try {
      const response = await authFetch(`${API}/quality/checklists/active`, { method: "PUT", body: JSON.stringify({ name, sections }) });
      if (!response.ok) {
        const result: { message?: string } = await response.json();
        throw new Error(result.message ?? "Checklist хадгалагдсангүй.");
      }
      const result: Template = await response.json(); setTemplate(result); setSaved(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Сервертэй холбогдож чадсангүй."); }
    finally { setSaving(false); }
  }
  return <main className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
    <h1 className="text-2xl font-bold">Чанарын checklist</h1>
    <p className="text-sm text-slate-600">Зөвхөн сонгосон байгууллагын стандарт. Хадгалахад шинэ хувилбар үүснэ; өмнөх шалгалтын үр дүн өөрчлөгдөхгүй.</p>
    {loading && <p role="status">Ачаалж байна…</p>}
    {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error} {!ready && <button onClick={() => void load()} className="ml-3 underline">Дахин оролдох</button>}</div>}
    {ready && <form onSubmit={save} className="space-y-5">
      <fieldset disabled={saving} className="space-y-5">
        <label className="block font-medium">Стандартын нэр<input required value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} className="mt-2 w-full rounded-xl border p-3" /></label>
        <p className="text-sm text-slate-500">{template ? `Одоогийн хувилбар: ${template.version}` : "Checklist хараахан үүсээгүй. Бүлэг нэмээд асуултуудаа оруулна уу."}</p>
        {sections.map((section) => <ChecklistSectionEditor key={section.id} section={section} disabled={saving} onChange={(updated) => { setSections((items) => items.map((item) => item.id === updated.id ? updated : item)); setSaved(false); }} />)}
        <button type="button" disabled={sections.length >= 30} onClick={() => { setSections([...sections, { id: crypto.randomUUID(), title: "", questions: [newQuestion()] }]); setSaved(false); }} className="rounded-xl border px-4 py-3 hover:bg-slate-50">+ Бүлэг нэмэх</button>
      </fieldset>
      <button disabled={saving || !sections.length} className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{saving ? "Хадгалж байна…" : "Checklist хадгалах"}</button>
      {saved && <p role="status" className="text-green-700">Шинэ хувилбар хадгалагдлаа.</p>}
    </form>}
  </main>;
}
