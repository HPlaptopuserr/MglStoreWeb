"use client";

import { ArrowRight, ChevronLeft, ChevronRight, ImagePlus } from "lucide-react";
import { useRef } from "react";
import type { ProjectItem } from "./project-types";
import { formatMnt, getProjectImages } from "./project-utils";

type FeaturedProjectsRailProps = {
  title: string;
  subtitle?: string;
  projects: ProjectItem[];
  openingId: string | null;
  onOpen: (project: ProjectItem) => void;
};

export function FeaturedProjectsRail({
  title,
  subtitle,
  projects,
  openingId,
  onOpen,
}: FeaturedProjectsRailProps) {
  const railRef = useRef<HTMLDivElement | null>(null);

  const scrollByCard = (direction: -1 | 1) => {
    railRef.current?.scrollBy({
      left: direction * 420,
      behavior: "smooth",
    });
  };

  if (projects.length === 0) return null;

  return (
    <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-500">
            Web дээр гарах төслийн мөр
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
            aria-label="Өмнөх"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
            aria-label="Дараах"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        ref={railRef}
        className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]"
      >
        {projects.map((project, index) => {
          const images = getProjectImages(project);
          const primaryImage = images[0];
          const isFree = !project.price || project.price <= 0;

          return (
            <article
              key={project.id}
              className="group flex w-[82vw] max-w-[360px] shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:bg-white hover:shadow-lg sm:w-[360px]"
            >
              <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                {primaryImage ? (
                  <img
                    src={primaryImage}
                    alt={project.title}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    <ImagePlus className="h-10 w-10" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/70 to-transparent" />
                <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-black text-slate-700">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {images.length > 1 && (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-black text-slate-700">
                    <ImagePlus className="h-3.5 w-3.5" />
                    {images.length}
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-xs font-black uppercase tracking-wide text-cyan-700">
                    {project.category || "Төсөл"}
                  </p>
                  <span className="shrink-0 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-black text-orange-600">
                    {isFree ? "Үнэгүй" : formatMnt(project.price)}
                  </span>
                </div>

                <h3 className="mt-3 line-clamp-2 text-lg font-black leading-tight text-slate-950">
                  {project.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-500">
                  {project.summary ||
                    "Admin-аас сонгосон төслийн товч мэдээлэл."}
                </p>

                <button
                  type="button"
                  onClick={() => onOpen(project)}
                  disabled={openingId === project.id}
                  className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-orange-500 disabled:opacity-60"
                >
                  {openingId === project.id
                    ? "Нээж байна..."
                    : isFree
                      ? "Дэлгэрэнгүй"
                      : "Төлөөд үзэх"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
