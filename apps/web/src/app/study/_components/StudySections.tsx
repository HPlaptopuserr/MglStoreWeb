"use client";

import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  GraduationCap,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { ProjectItem } from "@/components/molecules/projects/project-types";
import { StudyMaterialCard } from "./StudyMaterialCards";
import type { StudySettings } from "./study-utils";

type StudySectionsProps = {
  activeCategory: string;
  activeCategoryMaterials: ProjectItem[];
  allCategoryLabel: string;
  categoryTabs: string[];
  displayMaterials: ProjectItem[];
  featuredMaterials: ProjectItem[];
  loading: boolean;
  openingId: string | null;
  settings: StudySettings;
  showAllCourses: boolean;
  visibleCategoryMaterials: ProjectItem[];
  onOpenMaterial: (material: ProjectItem, ticketOptionId?: string) => void;
  onSelectCategory: (category: string) => void;
  onToggleShowAllCourses: () => void;
};

function StudySectionHeader({
  eyebrow,
  title,
  description,
  count,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  count?: number;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-6 sm:gap-4">
      <div>
        {eyebrow && (
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-700 sm:text-xs">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-1.5 text-2xl font-black tracking-tight text-[#111827] sm:mt-2 sm:text-4xl">
          {title}
        </h2>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500 sm:mt-3 sm:text-base sm:leading-7">
          {description}
        </p>
      </div>
      {typeof count === "number" && (
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
          {count}
        </span>
      )}
    </div>
  );
}

function StudyHero({
  displayMaterials,
  settings,
}: Pick<StudySectionsProps, "displayMaterials" | "settings">) {
  const upcomingCount = displayMaterials.filter(
    (material) => material.courseDate || material.courseTime,
  ).length;
  const freeCount = displayMaterials.filter(
    (material) => !material.price || material.price <= 0,
  ).length;

  return (
    <section className="mb-5 overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#0f172a,#1f2937_52%,#ea580c)] text-white shadow-[0_18px_50px_rgba(15,23,42,0.18)] sm:mb-8">
      <div className="px-5 py-6 sm:px-7 sm:py-8 lg:px-9">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-orange-100 ring-1 ring-white/15">
          <Sparkles className="h-3.5 w-3.5" />
          {settings.eyebrow}
        </div>
        <h1 className="mt-4 max-w-3xl text-3xl font-black leading-[1.05] tracking-tight sm:text-5xl">
          {settings.title}{" "}
          <span className="text-orange-300">{settings.accentTitle}</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/72 sm:text-base sm:leading-7">
          {settings.description}
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2 sm:max-w-xl sm:gap-3">
          <div className="rounded-2xl bg-white/10 px-3 py-3 ring-1 ring-white/10">
            <BookOpenCheck className="mb-2 h-4 w-4 text-orange-200" />
            <p className="text-lg font-black">{displayMaterials.length}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-white/55">
              {settings.countLabel}
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-3 py-3 ring-1 ring-white/10">
            <ShieldCheck className="mb-2 h-4 w-4 text-emerald-200" />
            <p className="text-lg font-black">{freeCount}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-white/55">
              Үнэгүй
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-3 py-3 ring-1 ring-white/10">
            <CalendarDays className="mb-2 h-4 w-4 text-cyan-200" />
            <p className="text-lg font-black">{upcomingCount}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-white/55">
              Хуваарь
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function StudyFeaturedSection({
  featuredMaterials,
  openingId,
  onOpenMaterial,
}: Pick<
  StudySectionsProps,
  "featuredMaterials" | "openingId" | "onOpenMaterial"
>) {
  if (featuredMaterials.length === 0) return null;

  return (
    <section className="mb-8 sm:mb-10">
      <StudySectionHeader
        title="Онцлох сургалтууд"
        description="Сүүлд нэмэгдсэн, хамгийн түрүүнд үзэх сургалтууд"
      />
      <div
        className={
          featuredMaterials.length > 1
            ? "flex flex-wrap gap-5"
            : "max-w-[300px]"
        }
      >
        {featuredMaterials.slice(0, 2).map((material, index) => (
          <StudyMaterialCard
            key={material.id}
            material={material}
            index={index}
            openingId={openingId}
            onOpen={onOpenMaterial}
          />
        ))}
      </div>
    </section>
  );
}

function StudyLoadingGrid() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="h-[220px] animate-pulse rounded-2xl border border-slate-200 bg-slate-100 sm:h-[392px]"
        />
      ))}
    </div>
  );
}

function StudyEmptyState({ emptyText }: { emptyText: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center shadow-sm">
      <GraduationCap className="mx-auto h-12 w-12 text-emerald-500" />
      <p className="mt-5 text-lg font-bold text-slate-500">{emptyText}</p>
    </div>
  );
}

function StudyCategoryTabs({
  activeCategory,
  categoryTabs,
  onSelectCategory,
}: Pick<
  StudySectionsProps,
  "activeCategory" | "categoryTabs" | "onSelectCategory"
>) {
  return (
    <div className="mb-5 overflow-x-auto pb-1 sm:mb-7">
      <div className="flex min-w-max gap-2">
        {categoryTabs.map((category) => {
          const active = category === activeCategory;
          return (
            <button
              key={category}
              type="button"
              onClick={() => onSelectCategory(category)}
              className={`relative shrink-0 rounded-full border px-3 py-2 text-xs font-black transition sm:px-4 sm:text-sm ${
                active
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-500 hover:border-orange-200 hover:text-orange-600"
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StudyTrainingListSection({
  activeCategory,
  activeCategoryMaterials,
  allCategoryLabel,
  categoryTabs,
  openingId,
  settings,
  showAllCourses,
  visibleCategoryMaterials,
  onOpenMaterial,
  onSelectCategory,
  onToggleShowAllCourses,
}: Omit<
  StudySectionsProps,
  "displayMaterials" | "featuredMaterials" | "loading"
>) {
  return (
    <section className="pt-1">
      <StudySectionHeader
        eyebrow={settings.listEyebrow}
        title={settings.listTitle || "Бүртгүүлэх сургалтууд"}
        description="MGL Store-ийн сургалтуудыг чиглэлээр нь сонгоод хэрэгтэй хөтөлбөрөө хурдан олоорой."
        count={activeCategoryMaterials.length}
      />

      <StudyCategoryTabs
        activeCategory={activeCategory}
        categoryTabs={categoryTabs}
        onSelectCategory={onSelectCategory}
      />

      {showAllCourses ? (
        <div
          className={
            activeCategoryMaterials.length > 1
              ? "flex flex-wrap gap-5"
              : "max-w-[300px]"
          }
        >
          {activeCategoryMaterials.map((material, index) => (
            <StudyMaterialCard
              key={material.id}
              material={material}
              index={index}
              openingId={openingId}
              onOpen={onOpenMaterial}
            />
          ))}
        </div>
      ) : (
        <div
          className={
            visibleCategoryMaterials.length > 1
              ? "flex flex-wrap gap-5"
              : "max-w-[300px]"
          }
        >
          {visibleCategoryMaterials.map((material, index) => (
            <StudyMaterialCard
              key={material.id}
              material={material}
              index={index}
              openingId={openingId}
              onOpen={onOpenMaterial}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onToggleShowAllCourses}
        className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-orange-50 px-4 text-sm font-black text-orange-600 transition hover:bg-orange-100 hover:text-orange-700 sm:mt-9 sm:text-base"
      >
        {showAllCourses
          ? "Онцлох grid рүү буцах"
          : activeCategory === allCategoryLabel
            ? `Бүх ${settings.countLabel} харах`
            : `${activeCategory} чиглэлийн бүх сургалтыг харах`}
        <ArrowRight className="h-5 w-5" />
      </button>
    </section>
  );
}

export function StudySections({
  activeCategory,
  activeCategoryMaterials,
  allCategoryLabel,
  categoryTabs,
  displayMaterials,
  featuredMaterials,
  loading,
  openingId,
  settings,
  showAllCourses,
  visibleCategoryMaterials,
  onOpenMaterial,
  onSelectCategory,
  onToggleShowAllCourses,
}: StudySectionsProps) {
  if (loading) return <StudyLoadingGrid />;

  if (displayMaterials.length === 0) {
    return <StudyEmptyState emptyText={settings.emptyText} />;
  }

  return (
    <>
      <StudyHero displayMaterials={displayMaterials} settings={settings} />
      <StudyFeaturedSection
        featuredMaterials={featuredMaterials}
        openingId={openingId}
        onOpenMaterial={onOpenMaterial}
      />
      <StudyTrainingListSection
        activeCategory={activeCategory}
        activeCategoryMaterials={activeCategoryMaterials}
        allCategoryLabel={allCategoryLabel}
        categoryTabs={categoryTabs}
        openingId={openingId}
        settings={settings}
        showAllCourses={showAllCourses}
        visibleCategoryMaterials={visibleCategoryMaterials}
        onOpenMaterial={onOpenMaterial}
        onSelectCategory={onSelectCategory}
        onToggleShowAllCourses={onToggleShowAllCourses}
      />
    </>
  );
}
