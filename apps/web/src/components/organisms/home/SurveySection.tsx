"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  X,
} from "lucide-react";
import { API } from "@/lib/api";
import FormFillClient from "@/app/forms/[slug]/FormFillClient";

type SurveySettings = {
  enabled: boolean;
  title: string;
  eyebrow: string;
  description: string;
  formSlug: string;
  formTitle?: string;
  actionLabel: string;
};

type SurveyForm = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  fields: Array<{
    id: string;
    type: string;
    label: string;
    required: boolean;
    options?: { id: string; value: string }[];
    placeholder?: string;
  }>;
};

const DEFAULT_SETTINGS: SurveySettings = {
  enabled: false,
  title: "Судалгаа",
  eyebrow: "Survey",
  description:
    "Богино асуулгад оролцож, MGL Store-ийн үйлчилгээний чанарыг сайжруулахад туслаарай.",
  formSlug: "",
  formTitle: "",
  actionLabel: "Судалгаа бөглөх",
};

function parseSettings(payload: unknown): SurveySettings | null {
  if (!payload || typeof payload !== "object") return null;
  const raw = (payload as Record<string, unknown>)["survey-section"];
  if (typeof raw !== "string") return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      enabled: Boolean(parsed.enabled),
      title: String(parsed.title || DEFAULT_SETTINGS.title),
      eyebrow: String(parsed.eyebrow || DEFAULT_SETTINGS.eyebrow),
      description: String(parsed.description || DEFAULT_SETTINGS.description),
      formSlug: String(parsed.formSlug || ""),
      formTitle: String(parsed.formTitle || ""),
      actionLabel: String(parsed.actionLabel || DEFAULT_SETTINGS.actionLabel),
    };
  } catch {
    return null;
  }
}

export function SurveySection() {
  const [settings, setSettings] = useState<SurveySettings | null>(null);
  const [form, setForm] = useState<SurveyForm | null>(null);
  const [open, setOpen] = useState(false);
  const [loadingForm, setLoadingForm] = useState(false);

  useEffect(() => {
    fetch(`${API}/site-settings`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const next = parseSettings(data);
        if (next?.enabled && next.formSlug) setSettings(next);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!settings?.formSlug || !open || form) return;
    setLoadingForm(true);
    fetch(`${API}/forms/${encodeURIComponent(settings.formSlug)}`, {
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setForm(data);
      })
      .finally(() => setLoadingForm(false));
  }, [form, open, settings?.formSlug]);

  if (!settings) return null;

  return (
    <section className="border-y border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] py-10 sm:py-12">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.25fr] lg:items-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
                <ClipboardCheck className="h-6 w-6" />
              </div>
              <span className="rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">
                Идэвхтэй
              </span>
            </div>

            <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-violet-600">
              {settings.eyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              {settings.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              {settings.description}
            </p>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                {settings.formTitle || "Сонгосон маягт"}
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Товч дарахад маягт энэ хуудсан дээр нээгдэнэ.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-black text-white transition hover:bg-slate-950"
              >
                {open ? "Маягт хаах" : settings.actionLabel}
                <ArrowRight className="h-4 w-4" />
              </button>
              <Link
                href={`/forms/${settings.formSlug}`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Тусдаа нээх
              </Link>
            </div>
          </div>

          <div
            className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition ${
              open ? "min-h-[420px]" : "min-h-[260px]"
            }`}
          >
            {!open ? (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex h-full min-h-[260px] w-full flex-col items-center justify-center bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.10),transparent_42%),#ffffff] px-6 text-center transition hover:bg-violet-50/30"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
                  <ClipboardCheck className="h-7 w-7" />
                </span>
                <span className="mt-4 text-lg font-black text-slate-950">
                  Маягтыг энд нээх
                </span>
                <span className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Хэрэглэгч хуудсаас гарахгүйгээр судалгаагаа бөглөх боломжтой.
                </span>
              </button>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                  aria-label="Маягт хаах"
                >
                  <X className="h-4 w-4" />
                </button>
                {loadingForm ? (
                  <div className="flex min-h-[420px] items-center justify-center text-sm font-bold text-slate-500">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Маягт ачаалж байна...
                  </div>
                ) : form ? (
                  <div className="max-h-[760px] overflow-y-auto">
                    <FormFillClient form={form} />
                  </div>
                ) : (
                  <div className="flex min-h-[420px] items-center justify-center px-6 text-center text-sm font-bold text-slate-500">
                    Маягт олдсонгүй. Admin дээр сонголтоо шалгана уу.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
