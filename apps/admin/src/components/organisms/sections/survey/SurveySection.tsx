"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ClipboardCheck,
  ClipboardList,
  Copy,
  Eye,
  FileText,
  Loader2,
  Save,
  Settings2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import type { SurveySectionSettings } from "@/lib/sections/types";
import { API, adminFetch } from "@/lib/api";
import { detectWebBaseUrl } from "@/lib/sections/utils";

type AdminForm = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  fields: unknown[];
  isActive?: boolean;
  _count?: { responses: number };
};

type SurveySectionProps = {
  settings: SurveySectionSettings;
  setSettings: (
    update:
      | SurveySectionSettings
      | ((prev: SurveySectionSettings) => SurveySectionSettings),
  ) => void;
  onSave: () => Promise<boolean | void> | boolean | void;
  saving?: boolean;
  saved?: boolean;
};

function formLink(slug: string) {
  return `${detectWebBaseUrl()}/forms/${slug}`;
}

export function SurveySection({
  settings,
  setSettings,
  onSave,
  saving,
  saved,
}: SurveySectionProps) {
  const [forms, setForms] = useState<AdminForm[]>([]);
  const [loadingForms, setLoadingForms] = useState(true);
  const [copied, setCopied] = useState(false);

  const selectedForm = useMemo(
    () => forms.find((form) => form.slug === settings.formSlug),
    [forms, settings.formSlug],
  );

  const fetchForms = useCallback(async () => {
    setLoadingForms(true);
    try {
      const res = await adminFetch(`${API}/admin/forms`);
      if (res.ok) {
        const data = await res.json();
        setForms(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoadingForms(false);
    }
  }, []);

  useEffect(() => {
    void fetchForms();
  }, [fetchForms]);

  const update = (patch: Partial<SurveySectionSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const selectForm = (form: AdminForm) => {
    update({
      formSlug: form.slug,
      formTitle: form.title,
      title: settings.title || form.title,
    });
  };

  const copyLink = async () => {
    if (!settings.formSlug) return;
    await navigator.clipboard.writeText(formLink(settings.formSlug));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const canPublish = settings.enabled && settings.formSlug;

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
                <ClipboardCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-600">
                  Survey manager
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  Судалгааны хэсэг
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Маягт үүсгэгчээс бэлдсэн нэг маягтыг сонгоод, web дээр
                  toggle-оор нээгддэг судалгааны хэсэг болгон ажиллуулна.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Web дээр гарах гарчиг
                </span>
                <input
                  value={settings.title}
                  onChange={(event) => update({ title: event.target.value })}
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base font-black text-slate-950 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-50"
                  placeholder="Жишээ: Орчны судалгаа"
                />
              </label>

              <label>
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Eyebrow
                </span>
                <input
                  value={settings.eyebrow}
                  onChange={(event) => update({ eyebrow: event.target.value })}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-50"
                  placeholder="Survey"
                />
              </label>

              <label>
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Товчны текст
                </span>
                <input
                  value={settings.actionLabel}
                  onChange={(event) =>
                    update({ actionLabel: event.target.value })
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-50"
                  placeholder="Судалгаа бөглөх"
                />
              </label>

              <label className="sm:col-span-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Богино тайлбар
                </span>
                <textarea
                  value={settings.description}
                  onChange={(event) =>
                    update({ description: event.target.value })
                  }
                  rows={3}
                  className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-700 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-50"
                  placeholder="Судалгааны зорилго, бөглөх хугацаа, анхаарах зүйлс..."
                />
              </label>
            </div>
          </div>

          <aside className="border-t border-slate-200 bg-slate-50 p-5 sm:p-6 lg:border-l lg:border-t-0">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Нийтлэх төлөв
                  </p>
                  <h3 className="mt-1 text-lg font-black text-slate-950">
                    {settings.enabled ? "Идэвхтэй" : "Нууцалсан"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => update({ enabled: !settings.enabled })}
                  className={`inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-black transition ${
                    settings.enabled
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                      : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
                  }`}
                >
                  {settings.enabled ? (
                    <ToggleRight className="h-5 w-5" />
                  ) : (
                    <ToggleLeft className="h-5 w-5" />
                  )}
                  {settings.enabled ? "ON" : "OFF"}
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Сонгосон маягт
                </p>
                <p className="mt-1 line-clamp-2 text-sm font-black text-slate-900">
                  {selectedForm?.title || settings.formTitle || "Сонгоогүй"}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  {selectedForm
                    ? `${selectedForm.fields.length} талбар · ${
                        selectedForm._count?.responses ?? 0
                      } хариулт`
                    : "Доороос маягт сонгоно уу"}
                </p>
              </div>

              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={() => void onSave()}
                  disabled={saving}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-violet-600 disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : saved ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving
                    ? "Хадгалж байна"
                    : saved
                      ? "Хадгалагдсан"
                      : "Тохиргоо хадгалах"}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={copyLink}
                    disabled={!settings.formSlug}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-45"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? "Хуулсан" : "Линк"}
                  </button>
                  <a
                    href={settings.formSlug ? formLink(settings.formSlug) : "#"}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 transition hover:bg-slate-50 ${
                      settings.formSlug ? "" : "pointer-events-none opacity-45"
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Нээх
                  </a>
                </div>
              </div>

              {!canPublish && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-800">
                  Web дээр гаргахын тулд маягт сонгоод toggle-ийг ON болгоно.
                </div>
              )}
            </div>
          </aside>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-950">
              Маягтаас сонгох
            </h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              “Маягт үүсгэгч” хэсэгт үүсгэсэн маягтууд эндээс сонгогдоно.
            </p>
          </div>
          <Link
            href="/sections/forms"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <Settings2 className="h-4 w-4" />
            Маягт засах
          </Link>
        </div>

        {loadingForms ? (
          <div className="mt-5 flex min-h-[180px] items-center justify-center rounded-2xl bg-slate-50 text-sm font-bold text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Маягтууд ачаалж байна...
          </div>
        ) : forms.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <ClipboardList className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-black text-slate-700">
              Маягт үүсгээгүй байна
            </p>
            <Link
              href="/sections/forms"
              className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white"
            >
              Маягт үүсгэх
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {forms.map((form) => {
              const selected = form.slug === settings.formSlug;
              return (
                <button
                  key={form.id}
                  type="button"
                  onClick={() => selectForm(form)}
                  className={`group rounded-2xl border p-4 text-left transition ${
                    selected
                      ? "border-violet-200 bg-violet-50 shadow-sm ring-2 ring-violet-100"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-violet-600 ring-1 ring-violet-100">
                      <FileText className="h-5 w-5" />
                    </div>
                    {selected && (
                      <span className="rounded-full bg-violet-600 px-2.5 py-1 text-[11px] font-black text-white">
                        Сонгосон
                      </span>
                    )}
                  </div>
                  <h4 className="mt-4 line-clamp-2 text-sm font-black text-slate-950">
                    {form.title}
                  </h4>
                  <p className="mt-2 line-clamp-2 min-h-10 text-xs font-semibold leading-5 text-slate-500">
                    {form.description || "Тайлбар байхгүй"}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-400">
                    <span>{form.fields.length} талбар</span>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    <span>{form._count?.responses ?? 0} хариулт</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
