"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileText,
  Info,
  Link2,
  Loader2,
  Pencil,
  Tag,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { ServiceItem } from "@/lib/sections/types";
import type { HrAdminForm } from "@/components/organisms/sections/hr-services/useHrAdminForms";
import { HrMaterialWebPreview } from "./HrWebPreview";

type HrMaterialCardProps = {
  item: ServiceItem;
  forms: HrAdminForm[];
  loadingForms: boolean;
  uploading: boolean;
  uploadingImage?: boolean;
  onUpdate: (patch: Partial<ServiceItem>) => void;
  onUpload: () => void;
  onUploadImage: () => void;
  onRemove: () => void;
  onSelectForm: (formSlug: string) => void;
};

type OptionalFieldKey = "price" | "file" | "form" | "details";

type OptionalFieldToggle = {
  key: OptionalFieldKey;
  label: string;
  description: string;
  enabled: boolean;
  activeClass: string;
  inactiveClass: string;
  icon: typeof Tag;
  onToggle: () => void;
};

function OptionalFieldButton({ toggle }: { toggle: OptionalFieldToggle }) {
  const Icon = toggle.icon;
  const ToggleIcon = toggle.enabled ? ToggleRight : ToggleLeft;

  return (
    <button
      type="button"
      onClick={toggle.onToggle}
      className={`flex min-h-[78px] items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
        toggle.enabled ? toggle.activeClass : toggle.inactiveClass
      }`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 ring-1 ring-inset ring-current/10">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black">{toggle.label}</span>
        <span className="mt-0.5 block text-xs font-semibold opacity-75">
          {toggle.description}
        </span>
      </span>
      <ToggleIcon className="h-5 w-5 shrink-0" />
    </button>
  );
}

export function HrMaterialCard({
  item,
  forms,
  loadingForms,
  uploading,
  uploadingImage,
  onUpdate,
  onUpload,
  onUploadImage,
  onRemove,
  onSelectForm,
}: HrMaterialCardProps) {
  const [enabledDraftFields, setEnabledDraftFields] = useState<
    Partial<Record<OptionalFieldKey, boolean>>
  >({});
  const selectedForm = forms.find((form) => form.slug === item.formSlug);
  const hasPrice = Boolean(item.priceLabel?.trim() || item.price > 0);
  const hasFile = Boolean(item.fileUrl?.trim() || item.fileName?.trim());
  const hasDetails = Boolean(item.features?.length);
  const hasForm = Boolean(item.hasForm);
  const showFile = hasFile || Boolean(enabledDraftFields.file);
  const enabledCount = [hasPrice, showFile, hasForm, hasDetails].filter(
    Boolean,
  ).length;
  const isComplete = Boolean(
    item.name?.trim() &&
    item.description?.trim() &&
    (hasFile || hasDetails || (item.hasForm && item.formSlug)),
  );
  const [collapsed, setCollapsed] = useState(isComplete);

  useEffect(() => {
    if (!isComplete) setCollapsed(false);
  }, [isComplete]);

  const toggles: OptionalFieldToggle[] = [
    {
      key: "price",
      label: "Үнэ / label",
      description: hasPrice
        ? item.priceLabel || `₮${item.price}`
        : "web card дээр үнийн badge",
      enabled: hasPrice,
      activeClass: "border-violet-200 bg-violet-50 text-violet-800",
      inactiveClass:
        "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
      icon: Tag,
      onToggle: () =>
        onUpdate(
          hasPrice
            ? { price: 0, priceLabel: "" }
            : { priceLabel: "Үнийн санал" },
        ),
    },
    {
      key: "file",
      label: "PDF / файл",
      description: hasFile
        ? item.fileName || "файл холбогдсон"
        : "upload эсвэл link paste",
      enabled: showFile,
      activeClass: "border-sky-200 bg-sky-50 text-sky-800",
      inactiveClass:
        "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
      icon: FileText,
      onToggle: () => {
        if (showFile) {
          setEnabledDraftFields((current) => ({ ...current, file: false }));
          onUpdate({ fileUrl: "", fileName: "" });
          return;
        }
        setEnabledDraftFields((current) => ({ ...current, file: true }));
      },
    },
    {
      key: "form",
      label: "Маягт",
      description: hasForm
        ? selectedForm?.title || item.formTitle || "сонгох хэрэгтэй"
        : "хэрэглэгч бөглөх form",
      enabled: hasForm,
      activeClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
      inactiveClass:
        "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
      icon: ClipboardList,
      onToggle: () =>
        onUpdate({
          hasForm: !hasForm,
          formSlug: hasForm ? "" : item.formSlug,
          formTitle: hasForm ? "" : item.formTitle,
        }),
    },
    {
      key: "details",
      label: "Дэлгэрэнгүй",
      description: hasDetails
        ? `${item.features?.length ?? 0} мөр мэдээлэл`
        : "material detail дээр гарах мөрүүд",
      enabled: hasDetails,
      activeClass: "border-amber-200 bg-amber-50 text-amber-800",
      inactiveClass:
        "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
      icon: Info,
      onToggle: () =>
        onUpdate({
          features: hasDetails ? [] : ["Юу багтах вэ", "Хэн ашиглах вэ"],
        }),
    },
  ];

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
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600 ring-1 ring-slate-200">
            Нэмэлт: {enabledCount}/4
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
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-black text-red-600 transition hover:bg-red-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Устгах
          </button>
        </div>
      </div>

      {collapsed ? (
        <div className="mt-3 grid gap-2 border-t border-emerald-100 pt-3 text-xs font-bold text-slate-500 sm:grid-cols-4">
          <span className="truncate rounded-xl bg-violet-50 px-3 py-2 text-violet-700">
            Үнэ:{" "}
            {hasPrice ? item.priceLabel || `₮${item.price}` : "унтраалттай"}
          </span>
          <span className="truncate rounded-xl bg-sky-50 px-3 py-2 text-sky-700">
            PDF: {hasFile ? "Бэлэн" : "унтраалттай"}
          </span>
          <span className="truncate rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700">
            Маягт:{" "}
            {hasForm
              ? selectedForm?.title || item.formTitle || "сонгох"
              : "унтраалттай"}
          </span>
          <span className="truncate rounded-xl bg-amber-50 px-3 py-2 text-amber-700">
            Дэлгэрэнгүй:{" "}
            {hasDetails ? `${item.features?.length ?? 0} мөр` : "унтраалттай"}
          </span>
        </div>
      ) : (
        <>
          <HrMaterialWebPreview
            item={item}
            onUploadImage={onUploadImage}
            hasFile={hasFile}
            hasForm={hasForm}
            hasDetails={hasDetails}
            hasPrice={hasPrice}
          />

          <div className="grid gap-3 lg:grid-cols-[1fr_1.5fr]">
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
                Богино тайлбар
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
          </div>

          <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
              <label>
                <span className="text-[11px] font-black uppercase tracking-wider text-sky-800">
                  Thumbnail зураг
                </span>
                <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-3 focus-within:border-sky-500 focus-within:ring-4 focus-within:ring-sky-100">
                  <Link2 className="h-4 w-4 shrink-0 text-sky-600" />
                  <input
                    value={item.imageUrl || ""}
                    onChange={(event) =>
                      onUpdate({ imageUrl: event.target.value })
                    }
                    className="h-11 min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 outline-none"
                    placeholder="Зургийн URL эсвэл upload"
                  />
                </div>
              </label>
              <button
                type="button"
                onClick={onUploadImage}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-sky-300 bg-white px-4 text-sm font-black text-sky-700 transition hover:bg-sky-100"
              >
                {uploadingImage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Зураг upload
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Material нэмэлт талбарууд
                </p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  Энэ card-д хэрэгтэй зүйлээ асааж бөглөнө.
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500 ring-1 ring-slate-200">
                {enabledCount} асаалттай
              </span>
            </div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {toggles.map((toggle) => (
                <OptionalFieldButton key={toggle.key} toggle={toggle} />
              ))}
            </div>
          </div>

          {hasPrice && (
            <div className="mt-3 rounded-2xl border border-violet-200 bg-violet-50/70 p-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                <label>
                  <span className="text-[11px] font-black uppercase tracking-wider text-violet-800">
                    Үнэ / label
                  </span>
                  <input
                    value={item.priceLabel || ""}
                    onChange={(event) =>
                      onUpdate({ priceLabel: event.target.value })
                    }
                    className="mt-1.5 h-11 w-full rounded-xl border border-violet-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                    placeholder="₮250,000-с"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => onUpdate({ price: 0, priceLabel: "" })}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-4 text-sm font-black text-violet-700 transition hover:bg-violet-100"
                >
                  <X className="h-4 w-4" />
                  Унтраах
                </button>
              </div>
            </div>
          )}

          {showFile && (
            <div className="mt-3 rounded-2xl border border-sky-300 bg-sky-50/70 p-4">
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
                  onClick={() => {
                    setEnabledDraftFields((current) => ({
                      ...current,
                      file: false,
                    }));
                    onUpdate({ fileUrl: "", fileName: "" });
                  }}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white px-4 text-sm font-black text-sky-700 transition hover:bg-sky-100"
                >
                  <X className="h-4 w-4" />
                  Унтраах
                </button>
              </div>
            </div>
          )}

          {hasForm && (
            <div className="mt-3 rounded-2xl border border-emerald-400 bg-emerald-50 p-4">
              <div className="mt-1 grid gap-3 lg:grid-cols-[1fr_240px]">
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
                <button
                  type="button"
                  onClick={() =>
                    onUpdate({ hasForm: false, formSlug: "", formTitle: "" })
                  }
                  className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-xs font-black text-emerald-700 ring-1 ring-emerald-300 transition hover:bg-emerald-100"
                >
                  <X className="h-4 w-4" />
                  Унтраах
                </button>
              </div>
            </div>
          )}

          {hasDetails && (
            <label className="mt-3 block rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-800">
                Material дэлгэрэнгүй мөрүүд
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
                className="mt-1.5 w-full resize-y rounded-xl border border-amber-200 bg-white px-3 py-3 text-sm font-semibold leading-6 text-slate-700 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                placeholder={"Жишээ:\nХэн ашиглах вэ\nЮу багтах вэ"}
              />
            </label>
          )}
        </>
      )}
    </article>
  );
}
