"use client";

import {
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Users,
} from "lucide-react";
import type { ServiceCategory, ServiceItem } from "@/lib/sections/types";

type HrHeadingWebPreviewProps = {
  heading: ServiceCategory;
  formCount: number;
  onUploadImage: () => void;
};

type HrMaterialWebPreviewProps = {
  item: ServiceItem;
  onUploadImage?: () => void;
  hasFile: boolean;
  hasForm: boolean;
  hasDetails: boolean;
  hasPrice: boolean;
};

export function HrStatPill({
  icon: Icon,
  label,
  tone,
}: {
  icon: typeof CheckCircle2;
  label: string;
  tone: "emerald" | "orange" | "cyan";
}) {
  const toneClass = {
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    orange: "bg-orange-50 text-orange-700 ring-orange-100",
    cyan: "bg-cyan-50 text-cyan-700 ring-cyan-100",
  }[tone];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black ring-1 ${toneClass}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

export function HrHeadingWebPreview({
  heading,
  formCount,
  onUploadImage,
}: HrHeadingWebPreviewProps) {
  const primaryImage = heading.images?.[0];

  return (
    <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_280px]">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-700">
          Web preview fields
        </p>
        <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950">
          HR үйлчилгээний page дээр харагдах үндсэн хэсэг
        </h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          Гарчиг, богино тайлбар, танилцуулга нь web дээр HR үйлчилгээний hero
          болон card grid-д ашиглагдана.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <HrStatPill
            icon={CheckCircle2}
            label={`${formCount} маягт`}
            tone="emerald"
          />
          <HrStatPill
            icon={ImageIcon}
            label={primaryImage?.url ? "1 зураг" : "0 зураг"}
            tone="orange"
          />
          <HrStatPill icon={Users} label="HR үйлчилгээ" tone="cyan" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
          {primaryImage?.url ? (
            <img
              src={primaryImage.url}
              alt={primaryImage.caption || heading.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[linear-gradient(135deg,#f8fafc,#ecfdf5)] text-slate-500">
              <Users className="h-9 w-9 text-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.18em]">
                MGL Store HR
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent" />
          <button
            type="button"
            onClick={onUploadImage}
            className="absolute right-3 top-3 inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-white/95 px-3 text-[11px] font-black text-slate-800 shadow-sm ring-1 ring-slate-200 backdrop-blur transition hover:bg-sky-50 hover:text-sky-700"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            {primaryImage?.url ? "Зураг солих" : "Зураг upload"}
          </button>
          <div className="absolute bottom-3 left-3 right-3">
            <p className="line-clamp-1 text-lg font-black text-white">
              {heading.title || "HR үйлчилгээ"}
            </p>
            <p className="mt-1 line-clamp-2 text-xs font-bold text-white/80">
              {heading.introDescription || heading.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HrMaterialWebPreview({
  item,
  onUploadImage,
  hasFile,
  hasForm,
  hasDetails,
  hasPrice,
}: HrMaterialWebPreviewProps) {
  return (
    <div className="mb-4 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="relative aspect-[16/10] overflow-hidden bg-[linear-gradient(135deg,#f8fafc,#ecfdf5)]">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name || "Материал thumbnail"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-500">
              <FileText className="h-9 w-9 text-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.18em]">
                MGL Store HR
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 to-transparent" />
          {onUploadImage && (
            <button
              type="button"
              onClick={onUploadImage}
              className="absolute right-3 top-3 inline-flex h-8 items-center justify-center gap-1.5 rounded-xl bg-white/95 px-2.5 text-[10px] font-black text-slate-800 shadow-sm ring-1 ring-slate-200 backdrop-blur transition hover:bg-sky-50 hover:text-sky-700"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              {item.imageUrl ? "Солих" : "Зураг"}
            </button>
          )}
          <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase text-slate-700 shadow-sm">
            {hasForm ? "Маягт" : hasFile ? "Файл" : "Материал"}
          </div>
          <div className="absolute right-3 top-3 rounded-full bg-orange-500 px-2.5 py-1 text-[10px] font-black uppercase text-white shadow-sm">
            {hasPrice ? item.priceLabel || `₮${item.price}` : "Үнийн санал"}
          </div>
        </div>
      </div>
      <div className="min-w-0 self-center">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-700">
          Web card preview
        </p>
        <h5 className="mt-2 line-clamp-2 text-xl font-black leading-tight text-slate-950">
          {item.name || "Шинэ файл / материал"}
        </h5>
        <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-500">
          {item.description ||
            "HR үйлчилгээний хэрэгжилтэд ашиглах файл, маягт болон богино зааварчилгааг нэг дор бэлтгэсэн материал."}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">
            {hasFile ? "Файлтай" : "Файлгүй"}
          </span>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
            {hasDetails ? `${item.features?.length ?? 0} detail` : "detailгүй"}
          </span>
          {hasForm && (
            <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-black text-cyan-700">
              Маягттай
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
