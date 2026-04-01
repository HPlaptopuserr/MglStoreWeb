"use client";

import { useState } from "react";
import { API } from "@/lib/api";

interface FieldOption {
  id: string;
  value: string;
}

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options?: FieldOption[];
  placeholder?: string;
}

interface FormData {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  fields: FormField[];
}

export default function FormFillClient({ form }: { form: FormData }) {
  const [values, setValues] = useState<Record<string, string | string[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const set = (id: string, val: string | string[]) => {
    setValues((p) => ({ ...p, [id]: val }));
    setErrors((p) => {
      const next = { ...p };
      delete next[id];
      return next;
    });
  };

  const toggleCheckbox = (fieldId: string, optValue: string) => {
    const cur = (values[fieldId] as string[]) || [];
    const next = cur.includes(optValue)
      ? cur.filter((v) => v !== optValue)
      : [...cur, optValue];
    set(fieldId, next);
  };

  const handleSubmit = async () => {
    const errs: Record<string, string> = {};
    for (const f of form.fields) {
      if (f.type === "label") continue;
      if (f.required) {
        const v = values[f.id];
        if (!v || (Array.isArray(v) && v.length === 0) || v === "") {
          errs[f.id] = "Энэ талбарыг заавал бөглөнө үү";
        }
      }
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/forms/${form.slug}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: values }),
      });
      if (res.ok) {
        setSubmitted(true);
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <div className="flex flex-col items-center rounded-2xl border border-emerald-200 bg-emerald-50 py-16">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="mb-1 text-lg font-bold text-emerald-800">
            Хариулт илгээгдлээ!
          </h3>
          <p className="mb-6 text-sm text-emerald-600">
            Таны хариулт амжилттай бүртгэгдлээ.
          </p>
          <button
            onClick={() => {
              setValues({});
              setErrors({});
              setSubmitted(false);
            }}
            className="rounded-lg border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
          >
            Дахин бөглөх
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-8">
      {/* Header */}
      <div className="rounded-2xl border-t-4 border-t-violet-600 border-x border-b border-slate-200 bg-white p-5">
        <h2 className="text-xl font-bold text-slate-900">{form.title}</h2>
        {form.description && (
          <p className="mt-1 text-sm text-slate-500">{form.description}</p>
        )}
        {form.fields.some((f) => f.required) && (
          <p className="mt-3 text-xs text-rose-500">* Заавал бөглөх</p>
        )}
      </div>

      {/* Fields */}
      {form.fields.map((field) => {
        if (field.type === "label") {
          return (
            <div
              key={field.id}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <p className="text-sm font-semibold text-slate-700">
                {field.label}
              </p>
              {field.placeholder && (
                <p className="mt-1 text-sm text-slate-500">
                  {field.placeholder}
                </p>
              )}
            </div>
          );
        }

        return (
          <div
            key={field.id}
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {field.label}
              {field.required && <span className="ml-1 text-rose-500">*</span>}
            </label>

            {field.type === "text" && (
              <input
                type="text"
                value={(values[field.id] as string) ?? ""}
                onChange={(e) => set(field.id, e.target.value)}
                className="w-full border-b-2 border-slate-200 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-violet-500"
                placeholder="Хариултаа оруулна уу"
              />
            )}

            {field.type === "textarea" && (
              <textarea
                value={(values[field.id] as string) ?? ""}
                onChange={(e) => set(field.id, e.target.value)}
                rows={3}
                className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                placeholder="Хариултаа оруулна уу"
              />
            )}

            {field.type === "number" && (
              <input
                type="number"
                value={(values[field.id] as string) ?? ""}
                onChange={(e) => set(field.id, e.target.value)}
                className="w-full border-b-2 border-slate-200 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-violet-500"
                placeholder="Тоо оруулна уу"
              />
            )}

            {field.type === "date" && (
              <input
                type="date"
                value={(values[field.id] as string) ?? ""}
                onChange={(e) => set(field.id, e.target.value)}
                className="w-full border-b-2 border-slate-200 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-violet-500"
              />
            )}

            {field.type === "dropdown" && (
              <select
                value={(values[field.id] as string) ?? ""}
                onChange={(e) => set(field.id, e.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              >
                <option value="">Сонгоно уу</option>
                {field.options?.map((o) => (
                  <option key={o.id} value={o.value}>
                    {o.value}
                  </option>
                ))}
              </select>
            )}

            {field.type === "radio" &&
              field.options?.map((o) => (
                <label
                  key={o.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <input
                    type="radio"
                    name={field.id}
                    checked={(values[field.id] as string) === o.value}
                    onChange={() => set(field.id, o.value)}
                    className="h-4 w-4 border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                  {o.value}
                </label>
              ))}

            {field.type === "checkbox" &&
              field.options?.map((o) => (
                <label
                  key={o.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={((values[field.id] as string[]) ?? []).includes(
                      o.value,
                    )}
                    onChange={() => toggleCheckbox(field.id, o.value)}
                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                  {o.value}
                </label>
              ))}

            {errors[field.id] && (
              <p className="mt-2 text-xs text-rose-500">{errors[field.id]}</p>
            )}
          </div>
        );
      })}

      {/* Submit */}
      {form.fields.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
          >
            {submitting ? "Илгээж байна..." : "Илгээх"}
          </button>
          <button
            onClick={() => {
              setValues({});
              setErrors({});
            }}
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            Цэвэрлэх
          </button>
        </div>
      )}

      <p className="pb-8 text-center text-xs text-slate-400">
        MGL Store маягт
      </p>
    </div>
  );
}
