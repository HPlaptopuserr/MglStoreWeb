"use client";

import {
  CalendarDays,
  ChevronRight,
  GraduationCap,
  MapPin,
} from "lucide-react";
import type { ProjectItem } from "@/components/molecules/projects/project-types";
import { StudyTeacherAvatar } from "./StudyTeacherAvatar";
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
          loading="lazy"
          className={`transition duration-500 motion-reduce:transition-none ${
            preserveAspectRatio
              ? "block h-auto max-h-[260px] w-full object-contain group-hover:scale-[1.02]"
              : `h-full w-full motion-safe:group-hover:scale-105 ${imageClassName}`
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
  const leadTeacher = teachers[0];
  const ticketOptions = getStudyTicketOptions(material);
  const venue = material.address || material.location;
  const schedule = [getCourseScheduleText(material), material.duration]
    .filter(Boolean)
    .join(" · ");
  const oldPrice = Number(material.originalPrice || 0);
  const busy = openingId === material.id;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="p-4 sm:p-5">
        <button
          type="button"
          onClick={() => onOpen(material)}
          disabled={busy}
          className="group grid w-full grid-cols-[96px_minmax(0,1fr)] items-start gap-4 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600 disabled:opacity-60"
        >
          <StudyMaterialImage
            material={material}
            className="aspect-square rounded-xl"
            iconClassName="h-9 w-9"
            imageClassName="object-contain"
          />
          <div className="min-w-0">
            <span className="inline-block rounded-md bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800">
              {material.category || "Сургалт"}
            </span>
            <h3 className="mt-2 break-words text-lg font-bold leading-6 text-slate-950">
              {material.title}
            </h3>
            <span className="mt-2 inline-flex min-h-6 items-center gap-1 text-xs font-semibold text-sky-700">
              Дэлгэрэнгүй
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </div>
        </button>
        {material.summary && (
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
            {material.summary}
          </p>
        )}
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          {leadTeacher ? (
            <div className="flex items-center gap-3">
              <StudyTeacherAvatar teacher={leadTeacher} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-500">Сургалтыг хөтлөх багш</p>
                <p className="break-words text-sm font-semibold text-slate-900">
                  {leadTeacher.name}
                </p>
                {leadTeacher.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-600">
                    {leadTeacher.description}
                  </p>
                )}
                {teachers.length > 1 && (
                  <p className="mt-1 text-xs font-semibold text-sky-700">
                    +{teachers.length - 1} багш · Дэлгэрэнгүйгээс үзэх
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Багшийн мэдээлэл удахгүй нэмэгдэнэ
            </p>
          )}
        </div>
        {(schedule || venue) && (
          <div className="mt-4 space-y-2 text-sm leading-5 text-slate-600">
            {schedule && (
              <p className="flex items-start gap-2">
                <CalendarDays
                  className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                <span>{schedule}</span>
              </p>
            )}
            {venue && (
              <p className="flex items-start gap-2">
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                <span className="break-words">{venue}</span>
              </p>
            )}
          </div>
        )}
      </div>
      <div className="border-t border-slate-200 px-4 pb-2 pt-3 sm:px-5">
        <p className="mb-1 text-xs font-semibold text-slate-500">
          Үнийн сонголт · Дэлгэрэнгүй үзэх
        </p>
        {ticketOptions.map((option, index) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onOpen(material, option.id)}
            disabled={busy}
            aria-label={`${option.label}, ${formatStudyPrice(option.price)}, дэлгэрэнгүй`}
            className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-lg py-3 text-left transition-colors hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-sky-600 disabled:opacity-60 ${index > 0 ? "border-t border-slate-100" : ""}`}
          >
            <span className="min-w-0 break-words text-sm font-medium leading-5 text-slate-700">
              {option.label}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="text-right">
                <span className="block whitespace-nowrap text-base font-bold tabular-nums text-sky-700">
                  {formatStudyPrice(option.price)}
                </span>
                {index === 0 && oldPrice > option.price && (
                  <span className="block text-xs text-slate-500 line-through">
                    {formatStudyPrice(oldPrice)}
                  </span>
                )}
              </span>
              <ChevronRight
                className="h-4 w-4 text-sky-600"
                aria-hidden="true"
              />
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
