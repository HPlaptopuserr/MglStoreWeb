"use client";

import Link from "next/link";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { useMemo, useState } from "react";
import { API } from "@/lib/api";
import { FormFieldCard } from "./_components/FormFieldCard";
import { FormProgressPanel } from "./_components/FormProgressPanel";
import { FormSubmitBar } from "./_components/FormSubmitBar";
import { FormSuccessState } from "./_components/FormSuccessState";
import type { FormData, FormValue } from "./_components/form-types";
import { useFormDraft } from "./_components/useFormDraft";

type FormFillClientProps = {
  form: FormData;
  variant?: "embedded" | "page";
};

const isFilled = (value: FormValue | undefined) => {
  if (!value) return false;
  return Array.isArray(value) ? value.length > 0 : value.trim().length > 0;
};

export default function FormFillClient({
  form,
  variant = "embedded",
}: FormFillClientProps) {
  const { clearDraft, hydrated, savedAt, setValues, values } = useFormDraft(
    form.slug,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const answerFields = useMemo(
    () => form.fields.filter((field) => field.type !== "label"),
    [form.fields],
  );
  const requiredCount = answerFields.filter((field) => field.required).length;
  const answeredCount = answerFields.filter((field) =>
    isFilled(values[field.id]),
  ).length;

  const setFieldValue = (id: string, value: FormValue) => {
    setValues((previous) => ({ ...previous, [id]: value }));
    setErrors((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
  };

  const toggleCheckbox = (fieldId: string, optionValue: string) => {
    const current = (values[fieldId] as string[]) || [];
    const next = current.includes(optionValue)
      ? current.filter((value) => value !== optionValue)
      : [...current, optionValue];
    setFieldValue(fieldId, next);
  };

  const resetForm = () => {
    clearDraft();
    setErrors({});
  };

  const handleSubmit = async () => {
    const nextErrors: Record<string, string> = {};

    for (const field of answerFields) {
      if (field.required && !isFilled(values[field.id])) {
        nextErrors[field.id] = "Энэ талбарыг заавал бөглөнө үү";
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API}/forms/${form.slug}/responses`, {
        body: JSON.stringify({ data: values }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to submit form");
      }

      clearDraft();
      setErrors({});
      setSubmitted(true);
    } catch {
      setErrors((previous) => ({
        ...previous,
        root: "Илгээх үед алдаа гарлаа. Түр хүлээгээд дахин оролдоно уу.",
      }));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <FormSuccessState
        onReset={() => {
          setSubmitted(false);
          resetForm();
        }}
      />
    );
  }

  const formContent = (
    <>
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-600">
              HR маягт
            </p>
            <h1 className="mt-1 text-2xl font-black leading-tight text-slate-950">
              {form.title}
            </h1>
            {form.description && (
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {form.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {form.fields.map((field) => (
          <FormFieldCard
            key={field.id}
            error={errors[field.id]}
            field={field}
            onChange={setFieldValue}
            onToggleCheckbox={toggleCheckbox}
            value={values[field.id]}
          />
        ))}
      </div>

      {errors.root && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600">
          {errors.root}
        </div>
      )}

      {form.fields.length > 0 && (
        <FormSubmitBar
          disabled={!hydrated}
          onClear={resetForm}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      )}
    </>
  );

  if (variant === "embedded") {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-4">{formContent}</div>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_48%,#eef7f2_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="mb-5 inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Буцах
        </Link>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <FormProgressPanel
            answeredCount={answeredCount}
            draftSavedAt={savedAt}
            fieldCount={answerFields.length}
            requiredCount={requiredCount}
            title={form.title}
          />
          <section className="space-y-4">{formContent}</section>
        </div>
      </div>
    </main>
  );
}
