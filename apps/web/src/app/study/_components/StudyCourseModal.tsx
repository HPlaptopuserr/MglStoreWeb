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
  const hasTeacherItems = teacherItems.length > 0;

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
        className="mx-auto max-h-[calc(100dvh-2rem)] w-full max-w-6xl overflow-y-auto overscroll-contain rounded-[28px] bg-slate-50 shadow-2xl"
        onWheel={(event) => event.stopPropagation()}
        onTouchMove={(event) => event.stopPropagation()}
      >
        <div className="relative overflow-hidden bg-[#0d1b14] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(16,185,129,0.16),transparent_34%),radial-gradient(circle_at_86%_0%,rgba(249,115,22,0.16),transparent_28%)]" />
          <div className="relative mx-auto grid max-w-6xl gap-7 px-5 py-7 sm:px-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-8">
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
                <HeroMetaCard
                  label="Хүний тоо"
                  value={material.capacity || "Admin-аас оруулна"}
                />
                <HeroMetaCard
                  label="Төлөв"
                  value={material.deliveryType || "Бүртгэл"}
                />
                <HeroMetaCard
                  label="Хэлбэр"
                  value={material.location || "Online сургалт удахгүй"}
                />
                <HeroMetaCard
                  label="Хаяг"
                  value={material.address || "Хаяг оруулаагүй"}
                />
              </div>

              <HeroTeacherPanel
                teachers={visibleTeacherItems}
                hasTeachers={hasTeacherItems}
              />
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

        <div className="mx-auto max-w-6xl px-5 py-7 sm:px-8 lg:py-8">
          <div className="space-y-6">
            <TeacherGrid
              teachers={visibleTeacherItems}
              hasTeachers={hasTeacherItems}
            />
            <LearningOutcomes items={visibleProgramItems} />
            <ProgramAccordion
              items={visibleProgramItems}
              duration={material.duration}
            />
          </div>
        </div>
      </article>
    </div>
  );
}

function HeroTeacherPanel({
  teachers,
  hasTeachers,
}: {
  teachers: { name: string; description: string; imageUrl?: string }[];
  hasTeachers: boolean;
}) {
  const leadTeacher = teachers[0];
  const supportingTeachers = teachers.slice(1, 4);

  return (
    <div className="mt-5 max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-white/[0.07] shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="relative p-4 sm:p-5">
        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-emerald-300 via-teal-300 to-orange-300" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative shrink-0">
            <TeacherAvatar
              teacher={leadTeacher}
              hasTeachers={hasTeachers}
              className="h-20 w-20 rounded-[24px] ring-4 ring-white/10"
            />
            <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-300 text-emerald-950 ring-4 ring-[#17271e]">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-200">
                Сургалтыг хөтлөх багш
              </p>
              <span className="rounded-full bg-emerald-300/14 px-2.5 py-1 text-[11px] font-black text-emerald-100 ring-1 ring-emerald-200/20">
                {hasTeachers ? `${teachers.length} багш` : "Admin-аас нэмнэ"}
              </span>
            </div>
            <h3 className="mt-2 break-words text-2xl font-black leading-tight text-white">
              {leadTeacher.name}
            </h3>
            <p className="mt-2 line-clamp-2 break-words text-sm font-semibold leading-6 text-white/68">
              {leadTeacher.description ||
                "Багшийн зураг, нэр, товч танилцуулгыг admin дээрээс оруулна."}
            </p>
          </div>

          {supportingTeachers.length > 0 && (
            <div className="flex items-center sm:self-end">
              {supportingTeachers.map((teacher, index) => (
                <TeacherAvatar
                  key={`hero-teacher-${index}`}
                  teacher={teacher}
                  hasTeachers={hasTeachers}
                  className="-ml-2 h-10 w-10 rounded-2xl ring-2 ring-[#17271e] first:ml-0"
                />
              ))}
            </div>
          )}
        </div>
        <div className="mt-4 grid gap-2 border-t border-white/10 pt-4 text-xs font-black text-white/72 sm:grid-cols-3">
          <span className="rounded-2xl bg-black/14 px-3 py-2">
            Практик туршлага
          </span>
          <span className="rounded-2xl bg-black/14 px-3 py-2">
            Асуулт хариулт
          </span>
          <span className="rounded-2xl bg-black/14 px-3 py-2">
            Дадлага төвтэй
          </span>
        </div>
      </div>
    </div>
  );
}

function TeacherAvatar({
  teacher,
  hasTeachers,
  className,
}: {
  teacher: { name: string; imageUrl?: string };
  hasTeachers: boolean;
  className: string;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden bg-emerald-200 text-base font-black text-emerald-950 ${className}`}
    >
      {teacher.imageUrl ? (
        <img
          src={teacher.imageUrl}
          alt={teacher.name}
          className="h-full w-full object-cover"
        />
      ) : hasTeachers ? (
        teacher.name.slice(0, 1).toUpperCase()
      ) : (
        <UserRound className="h-5 w-5" />
      )}
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
          <RegistrationDetail
            icon={
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            }
          >
            {material.duration || "Хугацаа тохиролцоно"}
          </RegistrationDetail>
          <RegistrationDetail
            icon={
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            }
          >
            {material.location || "Online сургалт удахгүй"}
            {material.address ? ` · ${material.address}` : ""}
          </RegistrationDetail>
          <RegistrationDetail
            icon={
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            }
          >
            {material.capacity || "Хүний тоо admin-аас оруулна"}
          </RegistrationDetail>
          <RegistrationDetail
            icon={
              <BookOpenCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            }
          >
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
  hasTeachers,
}: {
  teachers: { name: string; description: string; imageUrl?: string }[];
  hasTeachers: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
      <div className="border-b border-emerald-100 bg-emerald-50/70 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <UserRound className="h-5 w-5 text-emerald-700" />
          <h3 className="text-xl font-black text-slate-950">
            Багш нарын товч танилцуулга
          </h3>
        </div>
        <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
          Сургалтыг хөтлөх багш, туршлага болон чиглэлийн мэдээлэл.
        </p>
      </div>
      <div className="grid gap-3 p-5 sm:p-6 md:grid-cols-2">
        {teachers.map((teacher, index) => (
          <article
            key={`teacher-${index}`}
            className="group overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white hover:shadow-lg hover:shadow-emerald-950/5"
          >
            <div className="flex gap-4 p-4">
              <TeacherAvatar
                teacher={teacher}
                hasTeachers={hasTeachers}
                className="h-20 w-20 rounded-[24px] ring-1 ring-slate-200"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="break-words text-lg font-black leading-6 text-slate-950">
                    {teacher.name}
                  </h4>
                  {index === 0 && (
                    <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-black text-orange-700">
                      Lead
                    </span>
                  )}
                </div>
                <p className="mt-2 break-words text-sm font-semibold leading-7 text-slate-600">
                  {teacher.description ||
                    "Багшийн зураг, нэр болон товч танилцуулгыг admin дээрээс нэмнэ."}
                </p>
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-emerald-300 via-teal-300 to-orange-300 opacity-0 transition group-hover:opacity-100" />
          </article>
        ))}
      </div>
    </section>
  );
}
