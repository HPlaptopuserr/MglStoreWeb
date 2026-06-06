"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileText,
  Link2,
  Loader2,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import type { ServiceItem } from "@/lib/sections/types";
import type { HrAdminForm } from "@/components/organisms/sections/hr-services/useHrAdminForms";

type HrMaterialCardProps = {
  item: ServiceItem;
  forms: HrAdminForm[];
  loadingForms: boolean;
  uploading: boolean;
  onUpdate: (patch: Partial<ServiceItem>) => void;
  onUpload: () => void;
  onRemove: () => void;
  onSelectForm: (formSlug: string) => void;
};

export function HrMaterialCard({
  item,
  forms,
  loadingForms,
  uploading,
  onUpdate,
  onUpload,
  onRemove,
  onSelectForm,
}: HrMaterialCardProps) {
  const selectedForm = forms.find((form) => form.slug === item.formSlug);
  const isComplete = Boolean(
    item.name?.trim() &&
      item.description?.trim() &&
      (item.fileUrl?.trim() || item.features?.length || item.hasForm),
  );
  const [collapsed, setCollapsed] = useState(isComplete);

  useEffect(() => {
    if (!isComplete) setCollapsed(false);
  }, [isComplete]);

  return (
    <article
      className={`rounded-2xl border bg-white p-4 shadow-sm ring-1 transition ${
        collapsed
          ? "border-emerald-300 ring-emerald-100"
          : "border-slate-300 ring-slate-100"
      }`}
    >
      <div
        className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${
          collapsed ? "" : "mb-4 border-b border-slate-100 pb-3"
        }`}
      >
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-700">
            Material card
          </p>
          <h4 className="mt-1 truncate text-base font-black text-slate-950">
            {item.name || "Шинэ файл / материал"}
          </h4>
          <p className="mt-1 line-clamp-1 text-xs font-bold text-slate-500">
            {item.description || "Dropdown дээр нэг сонголт болж харагдана."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-black ${
              isComplete
                ? "bg-emerald-600 text-white"
                : "bg-amber-100 text-amber-800 ring-1 ring-amber-200"
            }`}
          >
            {isComplete ? "Бөглөгдсөн" : "Дутуу"}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-black ${
              item.fileUrl
                ? "bg-sky-600 text-white"
                : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {item.fileUrl ? "PDF холбогдсон" : "PDF байхгүй"}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-black ${
              item.hasForm
                ? "bg-emerald-600 text-white"
                : "bg-amber-100 text-amber-800 ring-1 ring-amber-200"
            }`}
          >
            {item.hasForm ? "Маягт асаалттай" : "Маягтгүй"}
          </span>
          <button
            type="button"
            onClick={() => setCollapsed((current) => !current)}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-100"
          >
            {collapsed ? (
              <>
                <Pencil className="h-3.5 w-3.5" />
                Засах
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                Хураах
                <ChevronUp className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {collapsed ? (
        <div className="mt-3 grid gap-2 border-t border-emerald-100 pt-3 text-xs font-bold text-slate-500 sm:grid-cols-3">
          <span className="truncate rounded-xl bg-slate-50 px-3 py-2">
            Үнэ: {item.priceLabel || "Оруулаагүй"}
          </span>
          <span className="truncate rounded-xl bg-sky-50 px-3 py-2 text-sky-700">
            PDF: {item.fileUrl ? "Бэлэн" : "Байхгүй"}
          </span>
          <span className="truncate rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700">
            Маягт: {selectedForm?.title || item.formTitle || "Холбоогүй"}
          </span>
        </div>
      ) : (
        <>
          <div className="grid gap-3 lg:grid-cols-[1.2fr_1.5fr_170px]">
            <label>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                Материалын нэр
              </span>
              <input
                value={item.name}
                onChange={(event) => onUpdate({ name: event.target.value })}
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-black text-slate-900 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                placeholder="Жишээ: Орчны судалгааны маягт"
              />
            </label>

            <label>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                Тайлбар
              </span>
              <input
                value={item.description || ""}
                onChange={(event) =>
                  onUpdate({ description: event.target.value })
                }
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                placeholder="Dropdown card дээр гарах богино тайлбар"
              />
            </label>

            <label>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                Үнэ / label
              </span>
              <input
                value={item.priceLabel || ""}
                onChange={(event) =>
                  onUpdate({ priceLabel: event.target.value })
                }
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                placeholder="₮250,000-с"
              />
            </label>
          </div>

          <div className="mt-4 rounded-2xl border border-sky-300 bg-sky-50/70 p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm">
                <FileText className="h-4 w-4" />
              </span>
              <div>
                <h4 className="text-sm font-black text-slate-950">
                  PDF / файл
                </h4>
                <p className="text-xs font-bold text-slate-600">
                  Энэ бол татах/үзэх файл. Маягттай андуурахгүйгээр тусдаа
                  удирдана.
                </p>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-end">
              <label>
                <span className="text-[11px] font-black uppercase tracking-wider text-sky-800">
                  Файлын холбоос
                </span>
                <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-3 focus-within:border-sky-500 focus-within:ring-4 focus-within:ring-sky-100">
                  <Link2 className="h-4 w-4 shrink-0 text-sky-600" />
                  <input
                    value={item.fileUrl || ""}
                    onChange={(event) =>
                      onUpdate({ fileUrl: event.target.value })
                    }
                    className="h-11 min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 outline-none"
                    placeholder="PDF upload хийх эсвэл холбоос paste хийх"
                  />
                </div>
              </label>

              <button
                type="button"
                onClick={onUpload}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-sky-300 bg-white px-4 text-sm font-black text-sky-700 transition hover:bg-sky-100"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                PDF upload
              </button>

              <button
                type="button"
                onClick={onRemove}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 text-sm font-black text-red-600 transition hover:bg-red-100"
              >
                <Trash2 className="h-4 w-4" />
                Устгах
              </button>
            </div>
          </div>

          <div
            className={`mt-3 rounded-2xl border p-4 ${
              item.hasForm
                ? "border-emerald-400 bg-emerald-50"
                : "border-amber-300 bg-amber-50"
            }`}
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ${
                    item.hasForm
                      ? "text-emerald-700 ring-emerald-300"
                      : "text-amber-700 ring-amber-300"
                  }`}
                >
                  <ClipboardList className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="text-sm font-black text-slate-950">
                    Маягт давхар холбох
                  </h4>
                  <p className="mt-1 text-xs font-bold leading-5 text-slate-600">
                    Маягт холбосон үед хэрэглэгч material card дээр дараад
                    modal-оос маягтаа бөглөнө.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  onUpdate({
                    hasForm: !item.hasForm,
                    formSlug: item.hasForm ? "" : item.formSlug,
                    formTitle: item.hasForm ? "" : item.formTitle,
                  })
                }
                className={`inline-flex h-10 shrink-0 items-center justify-center rounded-full px-4 text-xs font-black transition ${
                  item.hasForm
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-white text-amber-800 ring-1 ring-amber-300"
                }`}
              >
                {item.hasForm ? "Маягт салгах" : "Маягт холбох"}
              </button>
            </div>

            {item.hasForm && (
              <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_240px]">
                <label>
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
                    Холбох маягт
                  </span>
                  <select
                    value={item.formSlug || ""}
                    onChange={(event) => onSelectForm(event.target.value)}
                    disabled={loadingForms}
                    className="mt-1.5 h-11 w-full rounded-xl border border-emerald-300 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                  >
                    <option value="">
                      {loadingForms ? "Маягт ачаалж байна..." : "Маягт сонгох"}
                    </option>
                    {forms.map((form) => (
                      <option key={form.id} value={form.slug}>
                        {form.title}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="rounded-xl border border-emerald-300 bg-white p-3">
                  <p className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
                    Сонгосон маягт
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm font-black text-slate-900">
                    {selectedForm?.title || item.formTitle || "Сонгоогүй"}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {selectedForm
                      ? `${selectedForm.fields.length} талбартай`
                      : "System Admin > Маягт хэсгээс үүсгэнэ"}
                  </p>
                </div>
              </div>
            )}
          </div>

          <label className="mt-3 block">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">
              Дарахад харагдах дэлгэрэнгүй input
            </span>
            <textarea
              value={item.features?.join("\n") || ""}
              onChange={(event) =>
                onUpdate({
                  features: event.target.value
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean),
                })
              }
              rows={4}
              className="mt-1.5 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold leading-6 text-slate-700 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              placeholder={
                "Жишээ:\nХэн ашиглах вэ\nЮу багтах вэ\nБөглөх/ашиглах заавар"
              }
            />
            <span className="mt-1.5 block text-xs font-bold text-slate-500">
              Мөр бүр web дээр дэлгэрэнгүй modal-ийн тусдаа мэдээлэл болж
              харагдана.
            </span>
          </label>
        </>
      )}
    </article>
  );
}
