"use client";

import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Loader2,
  MapPin,
  UserRound,
  Users,
  X,
} from "lucide-react";
import type { ProjectItem } from "@/components/molecules/projects/project-types";
import { getProjectImages } from "@/components/molecules/projects/project-utils";
import { useLockedBodyScroll } from "./useLockedBodyScroll";
import {
  FALLBACK_PROGRAM_ITEMS,
  FALLBACK_TEACHER_ITEMS,
  getCourseScheduleText,
  getStudyPriceText,
  parseProgramItems,
  parseTeacherItems,
} from "./study-utils";

type StudyCourseModalProps = {
  material: ProjectItem;
  registered: boolean;
  registering: boolean;
  onRegister: (material: ProjectItem) => void;
  onClose: () => void;
};

export function StudyCourseModal({
  material,
  registered,
  registering,
  onRegister,
  onClose,
}: StudyCourseModalProps) {
  const primaryImage = getProjectImages(material)[0];
  const isFree = !material.price || material.price <= 0;
  const priceText = getStudyPriceText(material);
  const scheduleText = getCourseScheduleText(material);
  const teacherItems = parseTeacherItems(material);
  const programItems = parseProgramItems(material);
  const visibleProgramItems =
    programItems.length > 0 ? programItems : FALLBACK_PROGRAM_ITEMS;
  const visibleTeacherItems =
    teacherItems.length > 0 ? teacherItems : FALLBACK_TEACHER_ITEMS;

  useLockedBodyScroll();

  return (
    <div className="fixed inset-0 z-[90] overflow-hidden bg-slate-950/75 px-3 py-4 backdrop-blur-md sm:px-6">
      <button
        type="button"
        className="fixed inset-0 -z-10"
        onClick={onClose}
        aria-label="Хаах"
      />

      <article
        className="mx-auto max-h-[calc(100dvh-2rem)] w-full max-w-7xl overflow-y-auto overscroll-contain rounded-[28px] bg-slate-50 shadow-2xl"
        onWheel={(event) => event.stopPropagation()}
        onTouchMove={(event) => event.stopPropagation()}
      >
        <div className="relative overflow-hidden bg-[#0d1b14] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(16,185,129,0.16),transparent_34%),radial-gradient(circle_at_86%_0%,rgba(249,115,22,0.16),transparent_28%)]" />
          <div className="relative mx-auto grid max-w-6xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:py-10">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-100">
                <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/10">
                  {material.category || "Сургалт"}
                </span>
                <span className="rounded-full bg-orange-400/15 px-3 py-1 text-orange-100 ring-1 ring-orange-300/20">
                  {scheduleText ||
                    material.registrationLabel ||
                    "Бүртгэл авч байна"}
                </span>
              </div>
              <h2 className="mt-5 max-w-4xl break-words text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                {material.title}
              </h2>
              <p className="mt-4 max-w-3xl break-words text-base leading-8 text-white/72">
                {material.summary ||
                  "Сургалтын зорилго, агуулга, багш нарын мэдээлэл болон бүртгэлийн нөхцөлийг нэг дороос харна."}
              </p>

              <div className="mt-6 grid max-w-3xl gap-3 sm:grid-cols-2">
                <HeroMetaCard label="Хүний тоо" value={material.capacity || "Admin-аас оруулна"} />
                <HeroMetaCard label="Төлөв" value={material.deliveryType || "Бүртгэл"} />
                <HeroMetaCard label="Хэлбэр" value={material.location || "Online сургалт удахгүй"} />
                <HeroMetaCard label="Хаяг" value={material.address || "Хаяг оруулаагүй"} />
              </div>
            </div>

            <RegistrationPanel
              material={material}
              primaryImage={primaryImage}
              priceText={priceText}
              isFree={isFree}
              registered={registered}
              registering={registering}
              onRegister={onRegister}
              onClose={onClose}
            />
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10">
          <div className="space-y-6">
            <LearningOutcomes items={visibleProgramItems} />
            <ProgramAccordion
              items={visibleProgramItems}
              duration={material.duration}
            />
            <TeacherGrid teachers={visibleTeacherItems} />
          </div>
        </div>
      </article>
    </div>
  );
}

function HeroMetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-200">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-black text-white">{value}</p>
    </div>
  );
}

function RegistrationPanel({
  material,
  primaryImage,
  priceText,
  isFree,
  registered,
  registering,
  onRegister,
  onClose,
}: {
  material: ProjectItem;
  primaryImage?: string;
  priceText: string;
  isFree: boolean;
  registered: boolean;
  registering: boolean;
  onRegister: (material: ProjectItem) => void;
  onClose: () => void;
}) {
  return (
    <aside className="relative overflow-hidden rounded-3xl border border-white/15 bg-white text-slate-950 shadow-2xl">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-500 shadow-lg transition hover:bg-slate-100 hover:text-slate-950"
        aria-label="Хаах"
      >
        <X className="h-5 w-5" />
      </button>
      <div className="aspect-video overflow-hidden bg-slate-100">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={material.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-emerald-50 text-emerald-600">
            <GraduationCap className="h-16 w-16" />
          </div>
        )}
      </div>
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
              Бүртгэл
            </p>
            <p className="mt-2 text-4xl font-black">{priceText}</p>
          </div>
          <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">
            {material.priceNote || (isFree ? "Үнэгүй" : "Төлбөртэй")}
          </span>
        </div>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          {registered
            ? "Таны сургалтын бүртгэл баталгаажсан."
            : "Мэдээллээ шалгаад сургалтад бүртгүүлнэ үү."}
        </p>
        <button
          type="button"
          onClick={() => onRegister(material)}
          disabled={registered || registering}
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {registered ? (
            <>
              <CheckCircle2 className="h-5 w-5" />
              Бүртгэл баталгаажсан
            </>
          ) : registering ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              {isFree ? "Үнэгүй бүртгүүлэх" : "Бүртгүүлж төлөх"}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
        <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 text-sm font-bold text-slate-600">
          <RegistrationDetail icon={<Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />}>
            {material.duration || "Хугацаа тохиролцоно"}
          </RegistrationDetail>
          <RegistrationDetail icon={<MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />}>
            {material.location || "Online сургалт удахгүй"}
            {material.address ? ` · ${material.address}` : ""}
          </RegistrationDetail>
          <RegistrationDetail icon={<Users className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />}>
            {material.capacity || "Хүний тоо admin-аас оруулна"}
          </RegistrationDetail>
          <RegistrationDetail icon={<BookOpenCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />}>
            Сургалтын хөтөлбөр багтсан
          </RegistrationDetail>
        </div>
      </div>
    </aside>
  );
}

function RegistrationDetail({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
      {icon}
      <span className="break-words">{children}</span>
    </div>
  );
}

function LearningOutcomes({ items }: { items: { title: string }[] }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-2xl font-black text-slate-950">
        Энэ сургалтаар юу сурах вэ
      </h3>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {items.slice(0, 8).map((item, index) => (
          <div
            key={`learn-${index}`}
            className="flex gap-3 text-sm font-semibold leading-7 text-slate-600"
          >
            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
            <span className="break-words">{item.title}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProgramAccordion({
  items,
  duration,
}: {
  items: { title: string; description: string }[];
  duration?: string;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-slate-950">
            Сургалтын хөтөлбөр
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {items.length} хэсэг · {duration || "хугацаа тохиролцоно"}
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {items.map((item, index) => (
          <details
            key={`program-${index}`}
            className="group rounded-2xl border border-slate-200 bg-slate-50"
            open={index === 0}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-black text-slate-950 transition hover:bg-slate-100">
              <span className="break-words leading-6">
                {index + 1}. {item.title}
              </span>
              <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200">
                Дэлгэрэнгүй
              </span>
            </summary>
            <p className="px-5 py-4 text-sm leading-7 text-slate-600">
              {item.description ||
                "Энэ хэсгийн дэлгэрэнгүй тайлбарыг admin дээр сургалтын хөтөлбөрийн талбарт нэмнэ."}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

function TeacherGrid({
  teachers,
}: {
  teachers: { name: string; description: string }[];
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2">
        <UserRound className="h-5 w-5 text-emerald-600" />
        <h3 className="text-xl font-black text-slate-950">
          Багш нарын мэдээлэл
        </h3>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {teachers.map((teacher, index) => (
          <article
            key={`teacher-${index}`}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-base font-black text-emerald-700">
                {teacher.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h4 className="break-words text-base font-black text-slate-950">
                  {teacher.name}
                </h4>
                <p className="mt-1 break-words text-sm font-semibold leading-7 text-slate-600">
                  {teacher.description ||
                    "Албан тушаал, туршлага болон чиглэлийг admin дээрээс нэмнэ."}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
