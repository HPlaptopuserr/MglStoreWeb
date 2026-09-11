"use client";

export interface ChecklistQuestion { id: string; text: string; weight: number; required: boolean }
export interface ChecklistSection { id: string; title: string; questions: ChecklistQuestion[] }
export const newQuestion = (): ChecklistQuestion => ({ id: crypto.randomUUID(), text: "", weight: 1, required: true });

export function ChecklistSectionEditor({ section, onChange, disabled }: {
  section: ChecklistSection; onChange: (section: ChecklistSection) => void; disabled: boolean;
}) {
  return <fieldset disabled={disabled} className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-5">
    <label className="block text-sm font-semibold">Бүлгийн нэр<input required value={section.title} onChange={(e) => onChange({ ...section, title: e.target.value })} className="mt-2 w-full rounded-xl border p-3" /></label>
    {section.questions.map((question, index) => <div key={question.id} className="space-y-3 rounded-xl border bg-white p-4">
      <label className="block text-sm font-medium">Асуулт {index + 1}<input required value={question.text} onChange={(e) => onChange({ ...section, questions: section.questions.map((q) => q.id === question.id ? { ...q, text: e.target.value } : q) })} className="mt-2 w-full rounded-lg border p-3" /></label>
      <div className="flex flex-wrap items-center gap-4">
        <label className="text-sm">Оноо <input aria-label={`Асуулт ${index + 1} оноо`} type="number" min={1} max={100} required value={question.weight} onChange={(e) => onChange({ ...section, questions: section.questions.map((q) => q.id === question.id ? { ...q, weight: Number(e.target.value) } : q) })} className="w-20 rounded-lg border p-2" /></label>
        <label className="text-sm"><input type="checkbox" checked={question.required} onChange={(e) => onChange({ ...section, questions: section.questions.map((q) => q.id === question.id ? { ...q, required: e.target.checked } : q) })} /> Заавал бөглөх</label>
        <button type="button" disabled={section.questions.length === 1} onClick={() => onChange({ ...section, questions: section.questions.filter((q) => q.id !== question.id) })} className="text-sm text-red-600 disabled:opacity-40">Асуулт хасах</button>
      </div>
    </div>)}
    <button type="button" onClick={() => onChange({ ...section, questions: [...section.questions, newQuestion()] })} className="rounded-lg px-3 py-2 text-blue-700 hover:bg-blue-100">+ Асуулт нэмэх</button>
  </fieldset>;
}
