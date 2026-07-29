"use client";

import { useState, type FormEvent } from "react";
import { FileUp, Loader2, Plus, Settings2, Trash2, X } from "lucide-react";
import { registerScannedContract } from "./api";
import {
  createInitialContractForm,
  OPTIONAL_CONTRACT_FIELDS,
  STANDARD_CONTRACT_FIELDS,
  type StandardContractFieldKey,
} from "./contract-form.config";

export function RegisterContractModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => Promise<void>;
}) {
  const [form, setForm] = useState(createInitialContractForm);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [visibleFields, setVisibleFields] = useState(
    () => new Set(STANDARD_CONTRACT_FIELDS.map((field) => field.key)),
  );
  const [customFieldLabel, setCustomFieldLabel] = useState("");
  const [customFieldType, setCustomFieldType] = useState<"text" | "date">(
    "text",
  );

  const removeField = (
    key: StandardContractFieldKey,
  ) => {
    setVisibleFields((current) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    });
    setForm((current) => ({ ...current, [key]: "" }));
  };

  const restoreField = (
    key: StandardContractFieldKey,
  ) => {
    setVisibleFields((current) => new Set(current).add(key));
  };

  const addCustomField = () => {
    const label = customFieldLabel.trim();
    if (!label) return;
    setForm((current) => ({
      ...current,
      customFields: [
        ...current.customFields,
        { id: crypto.randomUUID(), label, value: "", type: customFieldType },
      ],
    }));
    setCustomFieldLabel("");
  };

  const removedFields = OPTIONAL_CONTRACT_FIELDS.filter(
    (field) => !visibleFields.has(field.key),
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError("PDF эсвэл зураг файл сонгоно уу.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await registerScannedContract(form, file);
      await onSuccess();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Гэрээ бүртгэхэд алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="register-contract-title">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur">
          <div>
            <h2 id="register-contract-title" className="text-xl font-black text-slate-950">Скан гэрээ бүртгэх</h2>
            <p className="mt-1 text-sm text-slate-500">Гэрээний үндсэн мэдээлэл болон эх файлыг архивлана.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Хаах" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </header>

        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 sm:col-span-2">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px_auto] sm:items-end">
              <label className="flex-1 space-y-1.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-blue-700">
                  <Settings2 className="h-3.5 w-3.5" /> Шинэ талбарын нэр
                </span>
                <input
                  value={customFieldLabel}
                  maxLength={80}
                  placeholder="Жишээ: Хариуцсан менежер"
                  onChange={(event) => setCustomFieldLabel(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addCustomField();
                    }
                  }}
                  className="h-10 w-full rounded-xl border border-blue-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-black uppercase tracking-wide text-blue-700">
                  Талбарын төрөл
                </span>
                <select
                  value={customFieldType}
                  onChange={(event) =>
                    setCustomFieldType(event.target.value as "text" | "date")
                  }
                  className="h-10 w-full rounded-xl border border-blue-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="text">Текст</option>
                  <option value="date">Огноо</option>
                </select>
              </label>
              <button
                type="button"
                onClick={addCustomField}
                disabled={!customFieldLabel.trim()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-4 w-4" /> Талбар нэмэх
              </button>
            </div>
            {removedFields.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Буцааж нэмэх:</span>
                {removedFields.map((field) => (
                  <button
                    key={field.key}
                    type="button"
                    onClick={() => restoreField(field.key)}
                    className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100"
                  >
                    <Plus className="h-3 w-3" /> {field.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {STANDARD_CONTRACT_FIELDS.filter((field) => visibleFields.has(field.key)).map((field) => (
            <label key={field.key} className="relative space-y-1.5">
              <span className="flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wide text-slate-600">
                <span>{field.label}{field.required && <span className="text-rose-500"> *</span>}</span>
                {field.removable && (
                  <button
                    type="button"
                    onClick={() => removeField(field.key)}
                    aria-label={`${field.label} талбарыг хасах`}
                    title="Талбарыг хасах"
                    className="rounded-md p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </span>
              <input
                type={field.type ?? "text"}
                required={field.required}
                value={form[field.key]}
                placeholder={field.placeholder}
                onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                className="h-11 w-full rounded-xl border border-slate-300 px-3.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />
            </label>
          ))}
          {form.customFields.map((field) => (
            <label key={field.id} className="space-y-1.5">
              <span className="flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wide text-blue-700">
                <span>{field.label}</span>
                <button
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      customFields: current.customFields.filter(
                        (item) => item.id !== field.id,
                      ),
                    }))
                  }
                  aria-label={`${field.label} талбарыг устгах`}
                  className="rounded-md p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </span>
              <input
                type={field.type}
                value={field.value}
                maxLength={500}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    customFields: current.customFields.map((item) =>
                      item.id === field.id
                        ? { ...item, value: event.target.value }
                        : item,
                    ),
                  }))
                }
                className="h-11 w-full rounded-xl border border-blue-200 bg-blue-50/30 px-3.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </label>
          ))}
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-xs font-black uppercase tracking-wide text-slate-600">Гэрээний файл *</span>
            <span className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center transition hover:border-blue-400 hover:bg-blue-50">
              <FileUp className="h-7 w-7 text-blue-600" />
              <span className="mt-2 text-sm font-bold text-slate-700">{file?.name || "PDF, JPG, PNG эсвэл WebP файл сонгох"}</span>
              <span className="mt-1 text-xs text-slate-400">Хамгийн ихдээ 15 MB</span>
              <input className="sr-only" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            </span>
          </label>
          {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 sm:col-span-2">{error}</p>}
        </div>

        <footer className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
          <button type="button" onClick={onClose} disabled={saving} className="h-11 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 hover:bg-slate-50">Болих</button>
          <button type="submit" disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-black text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Архивт хадгалах
          </button>
        </footer>
      </form>
    </div>
  );
}
