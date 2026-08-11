"use client";

import {
  CalendarDays,
  ChevronRight,
  GraduationCap,
  MapPin,
} from "lucide-react";
import type { ProjectItem } from "@/components/molecules/projects/project-types";
import { getProjectImages } from "@/components/molecules/projects/project-utils";
import {
  getCourseScheduleText,
  getPrimaryTeacherName,
  getStudyPriceText,
  getStudyTicketOptions,
  formatStudyPrice,
  parseTeacherItems,
} from "./study-utils";

type StudyCardProps = {
  material: ProjectItem;
  index: number;
  openingId: string | null;
  onOpen: (material: ProjectItem, ticketOptionId?: string) => void;
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
  preserveAspectRatio = false,
}: {
  material: ProjectItem;
  className: string;
  iconClassName: string;
  imageClassName?: string;
  preserveAspectRatio?: boolean;
}) {
  const primaryImage = getProjectImages(material)[0];

  return (
    <div
      className={`overflow-hidden bg-slate-100 ${
        preserveAspectRatio ? "flex items-center justify-center" : ""
      } ${className}`}
    >
      {primaryImage ? (
        <img
          src={primaryImage}
          alt={material.title}
          className={`transition duration-500 ${
            preserveAspectRatio
              ? "block h-auto max-h-[260px] w-full object-contain group-hover:scale-[1.02]"
              : `h-full w-full group-hover:scale-105 ${imageClassName}`
          }`}
        />
      ) : (
        <div
          className={`flex w-full items-center justify-center bg-emerald-50 text-emerald-600 ${
            preserveAspectRatio ? "min-h-40" : "h-full"
          }`}
        >
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
        <div className="bg-slate-50 p-2.5 sm:p-3">
          <StudyMaterialImage
            material={material}
            className="aspect-[16/9] h-full rounded-xl md:aspect-auto"
            iconClassName="h-14 w-14"
            imageClassName="object-cover"
          />
        </div>
        <div className="flex min-w-0 flex-col p-4 sm:p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700 sm:text-xs">
            Featured course
          </p>
          <h3 className="mt-2 line-clamp-2 break-words text-xl font-black leading-tight text-slate-950 [overflow-wrap:anywhere] sm:mt-3 sm:text-2xl">
            {material.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-500 sm:mt-3 sm:line-clamp-3 sm:leading-7">
            {material.summary ||
              "Сургалтын зорилго, багш, хөтөлбөр болон бүртгэлийн мэдээллийг нэг дороос харна."}
          </p>
          <div className="mt-auto pt-4 sm:pt-5">
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
      className="group flex min-h-[116px] gap-3 rounded-2xl border border-slate-200 bg-white p-2.5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-orange-100 sm:min-h-[142px] sm:gap-4 sm:p-3"
    >
      <StudyMaterialImage
        material={material}
        className="h-24 w-28 shrink-0 rounded-xl sm:h-28 sm:w-36"
        iconClassName="h-8 w-8"
      />
      <div className="min-w-0 py-1">
        <h3 className="line-clamp-2 break-words text-sm font-black leading-5 text-slate-950 [overflow-wrap:anywhere] sm:text-base sm:leading-6">
          {material.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-500 sm:mt-2 sm:text-sm sm:leading-6">
          {material.summary || "Сургалтын дэлгэрэнгүй"}
        </p>
        <p className="mt-2 text-xs font-black text-orange-600 sm:mt-3 sm:text-sm">
          Дэлгэрэнгүй үзэх
        </p>
      </div>
    </button>
  );
}

export function StudyMaterialCard({
  material,
  openingId,
  onOpen,
}: StudyCardProps) {
  const teachers = parseTeacherItems(material);
  const ticketOptions = getStudyTicketOptions(material);
  const instructor = teachers[0]?.name || "Багшийн мэдээлэл удахгүй";
  const venue = material.address || material.location || "";
  const scheduleText =
    [getCourseScheduleText(material), material.duration]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(" · ") || "Хуваарь удахгүй";
  const oldPriceText = getOldPriceText(material);

  return (
    <article className="group w-full max-w-[300px] rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_3px_12px_rgba(15,23,42,0.07)] transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_16px_32px_rgba(15,23,42,0.11)]">
      <button
        type="button"
        onClick={() => onOpen(material)}
        disabled={openingId === material.id}
        className="block w-full rounded-xl text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-100 disabled:opacity-70"
      >
        <StudyMaterialImage
          material={material}
          className="min-h-36 rounded-xl"
          iconClassName="h-10 w-10"
          preserveAspectRatio
        />

        <div className="pt-5">
          <h3 className="line-clamp-2 break-words text-xl font-extrabold leading-[1.25] tracking-tight text-slate-900 [overflow-wrap:anywhere]">
            {material.title}
          </h3>
          <p className="mt-2 line-clamp-1 text-sm font-semibold text-slate-500">
            {instructor}
          </p>
          <p className="mt-2 flex min-w-0 items-center gap-2 text-sm font-bold text-emerald-700">
            <CalendarDays className="h-4 w-4 shrink-0" />
            <span className="line-clamp-1">{scheduleText}</span>
          </p>
          {venue && (
            <p className="mt-2 flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-500">
              <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="line-clamp-1">{venue}</span>
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-md bg-cyan-50 px-2.5 py-1 text-xs font-bold text-cyan-800">
              {material.category || "Сургалт"}
            </span>
            <span className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600">
              {material.registrationLabel || "Бүртгэл нээлттэй"}
            </span>
          </div>
        </div>
      </button>

      <div className="mt-5 border-t border-slate-100">
        {ticketOptions.map((option, optionIndex) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onOpen(material, option.id)}
            disabled={openingId === material.id}
            className={`flex w-full items-center justify-between gap-3 py-3 text-left transition hover:text-orange-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-100 disabled:opacity-70 ${
              optionIndex > 0 ? "border-t border-slate-100" : ""
            }`}
          >
            <span className="min-w-0">
              <span className="block truncate text-[10px] font-bold uppercase leading-4 tracking-[0.08em] text-slate-500">
                {option.label}
              </span>
              <span className="mt-0.5 flex items-baseline gap-2">
                <span className="text-xl font-black leading-6 tracking-tight text-slate-900">
                  {formatStudyPrice(option.price)}
                </span>
                {optionIndex === 0 && oldPriceText && (
                  <span className="text-sm font-semibold text-slate-400 line-through">
                    {oldPriceText}
                  </span>
                )}
              </span>
            </span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-500 transition group-hover:bg-orange-50 group-hover:text-orange-600">
              <ChevronRight className="h-4 w-4" />
            </span>
          </button>
        ))}
      </div>
    </article>
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
