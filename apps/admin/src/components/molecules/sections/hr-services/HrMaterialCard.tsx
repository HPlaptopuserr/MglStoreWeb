"use client";

import {
  ClipboardList,
  FileText,
  Link2,
  Loader2,
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

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="grid gap-3 lg:grid-cols-[1.2fr_1.5fr_170px]">
        <label>
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
            Материалын нэр
          </span>
          <input
            value={item.name}
            onChange={(event) => onUpdate({ name: event.target.value })}
            className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
            placeholder="Жишээ: Орчны судалгааны маягт"
          />
        </label>

        <label>
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
            Тайлбар
          </span>
          <input
            value={item.description || ""}
            onChange={(event) => onUpdate({ description: event.target.value })}
            className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
            placeholder="Dropdown card дээр гарах богино тайлбар"
          />
        </label>

        <label>
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
            Үнэ / label
          </span>
          <input
            value={item.priceLabel || ""}
            onChange={(event) => onUpdate({ priceLabel: event.target.value })}
            className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
            placeholder="₮250,000-с"
          />
        </label>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-emerald-600" />
          <div>
            <h4 className="text-sm font-black text-slate-950">PDF / файл</h4>
            <p className="text-xs font-semibold text-slate-500">
              Файл нь үргэлж тусдаа хадгалагдана. Маягт нэмсэн ч устахгүй.
            </p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-end">
          <label>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Файлын холбоос
            </span>
            <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-emerald-300 focus-within:ring-4 focus-within:ring-emerald-50">
              <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                value={item.fileUrl || ""}
                onChange={(event) => onUpdate({ fileUrl: event.target.value })}
                className="h-11 min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 outline-none"
                placeholder="PDF upload хийх эсвэл холбоос paste хийх"
              />
            </div>
          </label>

          <button
            type="button"
            onClick={onUpload}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
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
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 text-sm font-bold text-red-500 transition hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4" />
            Устгах
          </button>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 ring-1 ring-emerald-100">
              <ClipboardList className="h-4 w-4" />
            </span>
            <div>
              <h4 className="text-sm font-black text-slate-950">
                Маягт давхар холбох
              </h4>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                Асаасан үед хэрэглэгч энэ материал дээр дараад PDF-ээ харж, мөн
                маягтаа modal дотроос бөглөнө.
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
                : "bg-white text-slate-500 ring-1 ring-slate-200"
            }`}
          >
            {item.hasForm ? "Маягт асаалттай" : "Маягт нэмэх"}
          </button>
        </div>

        {item.hasForm && (
          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_240px]">
            <label>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
                Холбох маягт
              </span>
              <select
                value={item.formSlug || ""}
                onChange={(event) => onSelectForm(event.target.value)}
                disabled={loadingForms}
                className="mt-1.5 h-11 w-full rounded-xl border border-emerald-100 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
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

            <div className="rounded-xl border border-emerald-100 bg-white p-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Сонгосон маягт
              </p>
              <p className="mt-1 line-clamp-2 text-sm font-black text-slate-900">
                {selectedForm?.title || item.formTitle || "Сонгоогүй"}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                {selectedForm
                  ? `${selectedForm.fields.length} талбартай`
                  : "System Admin > Маягт хэсгээс үүсгэнэ"}
              </p>
            </div>
          </div>
        )}
      </div>

      <label className="mt-3 block">
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
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
          className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold leading-6 text-slate-700 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
          placeholder={
            "Жишээ:\nХэн ашиглах вэ\nЮу багтах вэ\nБөглөх/ашиглах заавар"
          }
        />
        <span className="mt-1.5 block text-xs font-semibold text-slate-400">
          Мөр бүр web дээр дэлгэрэнгүй modal-ийн тусдаа мэдээлэл болж харагдана.
        </span>
      </label>
    </article>
  );
}
