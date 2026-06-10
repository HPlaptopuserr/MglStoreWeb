"use client";

import { useState } from "react";
import { CalendarDays, CheckCircle2, GraduationCap } from "lucide-react";
import type { ProjectItem } from "@/components/molecules/projects/project-types";
import { getProjectImages } from "@/components/molecules/projects/project-utils";
import {
  getCourseScheduleText,
  getPrimaryTeacherName,
  getStudyPriceText,
  parseProgramItems,
} from "./study-utils";

type StudyCardProps = {
  material: ProjectItem;
  index: number;
  openingId: string | null;
  onOpen: (material: ProjectItem) => void;
};

function getOldPriceText(material: ProjectItem) {
  const originalPrice = Number(material.originalPrice || 0);
  if (!Number.isFinite(originalPrice) || originalPrice <= 0) return "";
  return `₮${Math.round(originalPrice).toLocaleString("mn-MN")}`;
}

function getRating(index: number) {
  return {
    score: `4.${(index % 5) + 5}`,
    count: 54 + index * 137,
  };
}

function StudyMaterialImage({
  material,
  className,
  iconClassName,
  imageClassName = "object-cover",
}: {
  material: ProjectItem;
  className: string;
  iconClassName: string;
  imageClassName?: string;
}) {
  const primaryImage = getProjectImages(material)[0];

  return (
    <div className={`overflow-hidden bg-slate-100 ${className}`}>
      {primaryImage ? (
        <img
          src={primaryImage}
          alt={material.title}
          className={`h-full w-full transition duration-500 group-hover:scale-105 ${imageClassName}`}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-emerald-50 text-emerald-600">
          <GraduationCap className={iconClassName} />
        </div>
      )}
    </div>
  );
}

function StudyPricePills({ material }: { material: ProjectItem }) {
  const scheduleText =
    getCourseScheduleText(material) || material.registrationLabel || "";

  return (
    <div className="flex flex-wrap gap-2 text-xs font-black">
      <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
        {material.category || "Сургалт"}
      </span>
      <span className="rounded-full bg-orange-50 px-3 py-1.5 text-orange-700">
        {getStudyPriceText(material)}
      </span>
      {scheduleText && (
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">
          {scheduleText}
        </span>
      )}
    </div>
  );
}

export function FeaturedStudyMaterialCard({
  material,
  onOpen,
}: Pick<StudyCardProps, "material" | "onOpen">) {
  return (
    <button
      type="button"
      onClick={() => onOpen(material)}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-orange-100"
    >
      <div className="grid h-full gap-0 md:grid-cols-[minmax(300px,0.9fr)_minmax(0,1fr)]">
        <div className="bg-slate-50 p-3">
          <StudyMaterialImage
            material={material}
            className="aspect-[16/9] h-full rounded-xl md:aspect-auto"
            iconClassName="h-14 w-14"
            imageClassName="object-cover"
          />
        </div>
        <div className="flex min-w-0 flex-col p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
            Featured course
          </p>
          <h3 className="mt-3 line-clamp-2 break-words text-2xl font-black leading-tight text-slate-950 [overflow-wrap:anywhere]">
            {material.title}
          </h3>
          <p className="mt-3 line-clamp-3 text-sm font-semibold leading-7 text-slate-500">
            {material.summary ||
              "Сургалтын зорилго, багш, хөтөлбөр болон бүртгэлийн мэдээллийг нэг дороос харна."}
          </p>
          <div className="mt-auto pt-5">
            <StudyPricePills material={material} />
          </div>
        </div>
      </div>
    </button>
  );
}

export function FeaturedStudyMaterialMiniCard({
  material,
  onOpen,
}: Pick<StudyCardProps, "material" | "onOpen">) {
  return (
    <button
      type="button"
      onClick={() => onOpen(material)}
      className="group flex min-h-[142px] gap-4 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-orange-100"
    >
      <StudyMaterialImage
        material={material}
        className="h-28 w-36 shrink-0 rounded-xl"
        iconClassName="h-8 w-8"
      />
      <div className="min-w-0 py-1">
        <h3 className="line-clamp-2 break-words text-base font-black leading-6 text-slate-950 [overflow-wrap:anywhere]">
          {material.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-500">
          {material.summary || "Сургалтын дэлгэрэнгүй"}
        </p>
        <p className="mt-3 text-sm font-black text-orange-600">
          Дэлгэрэнгүй үзэх
        </p>
      </div>
    </button>
  );
}

export function StudyMaterialCard({
  material,
  index,
  openingId,
  onOpen,
}: StudyCardProps) {
  const isFree = !material.price || material.price <= 0;
  const priceText = getStudyPriceText(material);
  const oldPriceText = getOldPriceText(material);
  const instructor = getPrimaryTeacherName(material);
  const rating = getRating(index);
  const scheduleText =
    getCourseScheduleText(material) || material.registrationLabel || "";
  const detailLines = parseProgramItems(material)
    .map((item) => item.title)
    .slice(0, 3);
  const [previewSide, setPreviewSide] = useState<"left" | "right">("right");
  const openPreviewLeft = previewSide === "left";

  const updatePreviewSide = (element: HTMLDivElement | null) => {
    if (!element) return;
    const previewWidth = 320;
    const previewGap = 14;
    const edgePadding = 20;
    const rect = element.getBoundingClientRect();
    const rightSpace = window.innerWidth - rect.right - previewGap;
    const leftSpace = rect.left - previewGap;
    setPreviewSide(
      rightSpace >= previewWidth || rightSpace >= leftSpace - edgePadding
        ? "right"
        : "left",
    );
  };

  return (
    <div
      className="group relative"
      onMouseEnter={(event) => updatePreviewSide(event.currentTarget)}
      onFocus={(event) => updatePreviewSide(event.currentTarget)}
    >
      <button
        type="button"
        onClick={() => onOpen(material)}
        disabled={openingId === material.id}
        className="flex h-full min-h-[392px] w-full flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition duration-200 hover:border-orange-200 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-orange-100 disabled:opacity-75"
      >
        <StudyMaterialImage
          material={material}
          className="aspect-[16/9] w-full rounded-xl"
          iconClassName="h-12 w-12"
        />

        <div className="flex flex-1 flex-col pt-5">
          <h3 className="line-clamp-2 break-words text-xl font-black leading-tight text-[#2d2f43] [overflow-wrap:anywhere]">
            {material.title}
          </h3>
          <p className="mt-2 line-clamp-1 text-sm font-semibold text-slate-500">
            {instructor}
          </p>
          {scheduleText && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700">
              <CalendarDays className="h-4 w-4" />
              <span className="line-clamp-1">{scheduleText}</span>
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-cyan-100 px-2.5 py-1 text-sm font-black text-cyan-900">
              Bestseller
            </span>
            <span className="rounded-md border border-slate-200 px-2.5 py-1 text-sm font-bold text-slate-600">
              ★ {rating.score}
            </span>
            <span className="rounded-md border border-slate-200 px-2.5 py-1 text-sm font-semibold text-slate-500">
              {rating.count} ratings
            </span>
          </div>

          <div className="mt-auto flex items-end gap-3 pt-6">
            <span className="text-xl font-black text-[#2d2f43]">
              {priceText}
            </span>
            {oldPriceText && (
              <span className="text-base font-semibold text-slate-500 line-through">
                {oldPriceText}
              </span>
            )}
          </div>
        </div>
      </button>

      <div
        className={`pointer-events-none absolute top-1/2 z-40 hidden w-[304px] -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-4 text-left opacity-0 shadow-2xl transition duration-150 group-hover:pointer-events-auto group-hover:opacity-100 xl:block ${
          openPreviewLeft ? "right-[calc(100%+14px)]" : "left-[calc(100%+14px)]"
        }`}
      >
        <div
          className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rotate-45 border-slate-200 bg-white ${
            openPreviewLeft
              ? "-right-2.5 border-r border-t"
              : "-left-2.5 border-b border-l"
          }`}
        />
        <h3 className="break-words text-xl font-black leading-tight text-[#2d2f43] [overflow-wrap:anywhere]">
          {material.title}
        </h3>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
          <span className="rounded-md bg-cyan-100 px-2.5 py-1 text-cyan-900">
            Bestseller
          </span>
          <span className="text-emerald-700">Updated 2026</span>
        </div>
        <p className="mt-3 text-xs font-semibold text-slate-500">
          {material.courseDate ||
            material.registrationLabel ||
            "Бүртгэл авч байна"}{" "}
          · {material.duration || "Хугацаа тохиролцоно"} · Mongolian
        </p>
        <p className="mt-4 text-base leading-7 text-slate-700">
          {material.summary ||
            "Сургалтын зорилго, багш, хөтөлбөр болон бүртгэлийн мэдээллийг нэг дороос харна."}
        </p>
        <div className="mt-4 space-y-2.5">
          {(detailLines.length > 0
            ? detailLines
            : [
                "Бодит workflow дээр ажиллаж сурна",
                "Admin болон web хэрэглээг нэг дор ойлгоно",
                "Дараагийн алхмын checklist авна",
              ]
          ).map((line, lineIndex) => (
            <div
              key={`${material.id}-hover-${lineIndex}`}
              className="flex gap-2.5 text-sm leading-6 text-slate-700"
            >
              <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-800" />
              <span>{line}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onOpen(material)}
          className="mt-5 h-11 w-full rounded-xl bg-orange-500 text-sm font-black text-white transition hover:bg-orange-600"
        >
          {isFree ? "Үнэгүй бүртгүүлэх" : "Бүртгүүлж үзэх"}
        </button>
      </div>
    </div>
  );
}

export function CompactStudyMaterialCard({
  material,
  index,
  openingId,
  onOpen,
}: StudyCardProps) {
  const priceText = getStudyPriceText(material);
  const oldPriceText = getOldPriceText(material);
  const instructor = getPrimaryTeacherName(material);
  const rating = getRating(index);
  const scheduleText =
    getCourseScheduleText(material) || material.registrationLabel || "";

  return (
    <button
      type="button"
      onClick={() => onOpen(material)}
      disabled={openingId === material.id}
      className="group min-w-0 text-left transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-orange-100 disabled:opacity-75"
    >
      <StudyMaterialImage
        material={material}
        className="aspect-[16/9]"
        iconClassName="h-10 w-10"
      />

      <h3 className="mt-3 line-clamp-2 break-words text-lg font-black leading-tight text-[#2d2f43] [overflow-wrap:anywhere]">
        {material.title}
      </h3>
      <p className="mt-2 line-clamp-1 text-sm font-semibold text-slate-500">
        {instructor}
      </p>
      {scheduleText && (
        <p className="mt-2 line-clamp-1 text-sm font-bold text-emerald-700">
          {scheduleText}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-sm font-bold">
        <span className="text-amber-700">{rating.score}</span>
        <span className="text-amber-500">★★★★★</span>
        <span className="text-slate-500">({rating.count})</span>
      </div>

      <div className="mt-2 flex items-end gap-2">
        <span className="text-lg font-black text-[#2d2f43]">{priceText}</span>
        {oldPriceText && (
          <span className="text-sm font-semibold text-slate-500 line-through">
            {oldPriceText}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded bg-emerald-700 px-2.5 py-1 text-xs font-black text-white">
          Premium
        </span>
        {index % 2 === 0 && (
          <span className="rounded bg-cyan-100 px-2.5 py-1 text-xs font-black text-cyan-900">
            Bestseller
          </span>
        )}
      </div>
    </button>
  );
}
