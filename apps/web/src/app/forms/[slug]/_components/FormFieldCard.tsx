"use client";

import type { FormField, FormValue } from "./form-types";

type FormFieldCardProps = {
  error?: string;
  field: FormField;
  onChange: (id: string, value: FormValue) => void;
  onToggleCheckbox: (id: string, value: string) => void;
  value: FormValue | undefined;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100";

export function FormFieldCard({
  error,
  field,
  onChange,
  onToggleCheckbox,
  value,
}: FormFieldCardProps) {
  if (field.type === "label") {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-600">
          {field.label}
        </p>
        {field.placeholder && (
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {field.placeholder}
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition focus-within:border-emerald-200 focus-within:shadow-lg focus-within:shadow-emerald-100/60">
      <label className="mb-3 block text-base font-black text-slate-950">
        {field.label}
        {field.required && <span className="ml-1 text-rose-500">*</span>}
      </label>

      {field.type === "text" && (
        <input
          type="text"
          value={(value as string) ?? ""}
          onChange={(event) => onChange(field.id, event.target.value)}
          className={inputClass}
          placeholder={field.placeholder || "Хариултаа оруулна уу"}
        />
      )}

      {field.type === "textarea" && (
        <textarea
          value={(value as string) ?? ""}
          onChange={(event) => onChange(field.id, event.target.value)}
          rows={4}
          className={`${inputClass} resize-y leading-6`}
          placeholder={field.placeholder || "Дэлгэрэнгүй хариултаа бичнэ үү"}
        />
      )}

      {field.type === "number" && (
        <input
          type="number"
          value={(value as string) ?? ""}
          onChange={(event) => onChange(field.id, event.target.value)}
          className={inputClass}
          placeholder={field.placeholder || "Тоо оруулна уу"}
        />
      )}

      {field.type === "date" && (
        <input
          type="date"
          value={(value as string) ?? ""}
          onChange={(event) => onChange(field.id, event.target.value)}
          className={inputClass}
        />
      )}

      {field.type === "dropdown" && (
        <select
          value={(value as string) ?? ""}
          onChange={(event) => onChange(field.id, event.target.value)}
          className={inputClass}
        >
          <option value="">Сонгоно уу</option>
          {field.options?.map((option) => (
            <option key={option.id} value={option.value}>
              {option.value}
            </option>
          ))}
        </select>
      )}

      {field.type === "radio" && (
        <div className="grid gap-2 sm:grid-cols-2">
          {field.options?.map((option) => (
            <label
              key={option.id}
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50"
            >
              <input
                type="radio"
                name={field.id}
                checked={(value as string) === option.value}
                onChange={() => onChange(field.id, option.value)}
                className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              {option.value}
            </label>
          ))}
        </div>
      )}

      {field.type === "checkbox" && (
        <div className="grid gap-2 sm:grid-cols-2">
          {field.options?.map((option) => (
            <label
              key={option.id}
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50"
            >
              <input
                type="checkbox"
                checked={((value as string[]) ?? []).includes(option.value)}
                onChange={() => onToggleCheckbox(field.id, option.value)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              {option.value}
            </label>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600">
          {error}
        </p>
      )}
    </section>
  );
}
