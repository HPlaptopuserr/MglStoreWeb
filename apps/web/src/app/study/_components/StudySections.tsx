"use client";

import { ArrowRight, GraduationCap } from "lucide-react";
import type { ProjectItem } from "@/components/molecules/projects/project-types";
import {
  CompactStudyMaterialCard,
  FeaturedStudyMaterialCard,
  FeaturedStudyMaterialMiniCard,
  StudyMaterialCard,
} from "./StudyMaterialCards";
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
  onOpenMaterial: (material: ProjectItem) => void;
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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-2 text-3xl font-black tracking-tight text-[#2d2f43] sm:text-4xl">
          {title}
        </h2>
        <p className="mt-3 max-w-3xl text-base font-semibold leading-7 text-slate-500">
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

function StudyFeaturedSection({
  featuredMaterials,
  onOpenMaterial,
}: Pick<StudySectionsProps, "featuredMaterials" | "onOpenMaterial">) {
  if (featuredMaterials.length === 0) return null;
  const secondaryFeaturedMaterials = featuredMaterials.slice(1, 3);

  return (
    <section className="mb-10">
      <StudySectionHeader
        title="Онцлох сургалтууд"
        description="Сүүлд нэмэгдсэн, хамгийн түрүүнд үзэх сургалтууд"
      />
      <div
        className={
          secondaryFeaturedMaterials.length > 0
            ? "grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]"
            : "max-w-4xl"
        }
      >
        <FeaturedStudyMaterialCard
          material={featuredMaterials[0]}
          onOpen={onOpenMaterial}
        />
        {secondaryFeaturedMaterials.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {secondaryFeaturedMaterials.map((material) => (
              <FeaturedStudyMaterialMiniCard
                key={material.id}
                material={material}
                onOpen={onOpenMaterial}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function StudyLoadingGrid() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="h-[392px] animate-pulse rounded-2xl border border-slate-200 bg-slate-100"
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
    <div className="mb-7 overflow-x-auto border-b border-slate-200">
      <div className="flex min-w-max gap-8">
        {categoryTabs.map((category) => {
          const active = category === activeCategory;
          return (
            <button
              key={category}
              type="button"
              onClick={() => onSelectCategory(category)}
              className={`relative shrink-0 pb-4 text-base font-black transition ${
                active
                  ? "text-[#2d2f43]"
                  : "text-slate-500 hover:text-orange-600"
              }`}
            >
              {category}
              {active && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#2d2f43]" />
              )}
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
        title="Ур чадвараа дараагийн түвшинд гарга"
        description="MGL Store-ийн сургалтуудыг чиглэлээр нь сонгоод хэрэгтэй хөтөлбөрөө хурдан олоорой."
        count={activeCategoryMaterials.length}
      />

      <StudyCategoryTabs
        activeCategory={activeCategory}
        categoryTabs={categoryTabs}
        onSelectCategory={onSelectCategory}
      />

      {showAllCourses ? (
        <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {activeCategoryMaterials.map((material, index) => (
            <CompactStudyMaterialCard
              key={material.id}
              material={material}
              index={index}
              openingId={openingId}
              onOpen={onOpenMaterial}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
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
        className="mt-9 inline-flex items-center gap-2 text-base font-black text-orange-600 transition hover:text-orange-700"
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
      <StudyFeaturedSection
        featuredMaterials={featuredMaterials}
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
