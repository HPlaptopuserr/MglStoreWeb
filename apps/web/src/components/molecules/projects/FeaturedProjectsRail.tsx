"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Play } from "lucide-react";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const pages = useMemo(
    () => Math.max(1, Math.ceil(projects.length / 4)),
    [projects.length],
  );

  if (projects.length === 0) return null;

  const scrollByPage = (direction: -1 | 1) => {
    const node = scrollRef.current;
    if (!node) return;
    const nextIndex = Math.min(
      pages - 1,
      Math.max(0, activeIndex + direction),
    );
    setActiveIndex(nextIndex);
    node.scrollTo({
      left: node.clientWidth * nextIndex,
      behavior: "smooth",
    });
  };

  return (
    <section className="relative z-10 mb-10 overflow-hidden py-2">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          {subtitle && (
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200/75">
              {subtitle}
            </p>
          )}
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
            {title}
          </h2>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={() => scrollByPage(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white transition hover:bg-white/12"
            aria-label="Өмнөх төслүүд"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollByPage(1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white transition hover:bg-white/12"
            aria-label="Дараагийн төслүүд"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="pointer-events-none absolute right-0 top-24 z-20 hidden h-44 w-28 bg-gradient-to-l from-[#111113] to-transparent lg:block" />
      <div
        ref={scrollRef}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 [scrollbar-width:none] sm:gap-4 [&::-webkit-scrollbar]:hidden"
        onScroll={(event) => {
          const node = event.currentTarget;
          const next = Math.round(node.scrollLeft / Math.max(1, node.clientWidth));
          if (next !== activeIndex) setActiveIndex(Math.min(pages - 1, next));
        }}
      >
        {projects.map((project, index) => {
          const image = getProjectImages(project)[0];
          const isFree = !project.price || project.price <= 0;
          return (
            <article
              key={project.id}
              className="group relative h-[150px] w-[78vw] max-w-[360px] shrink-0 snap-start overflow-hidden rounded-md border border-white/10 bg-[#151519] shadow-[0_18px_42px_rgba(0,0,0,0.32)] sm:h-[164px] sm:w-[320px]"
            >
              {image ? (
                <img
                  src={image}
                  alt={project.title}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#27201a,#111113)]">
                  <Play className="h-12 w-12 text-orange-200/70" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/78 via-black/24 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-orange-200">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <span className="h-px w-5 bg-orange-200/50" />
                  <span>{project.category || "Төсөл"}</span>
                </div>
                <h3 className="mt-1 line-clamp-1 text-lg font-black text-white">
                  {project.title}
                </h3>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-black text-white backdrop-blur">
                    {isFree ? "Үнэгүй" : formatMnt(project.price)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpen(project)}
                    disabled={openingId === project.id}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-black text-slate-950 transition hover:bg-orange-200 disabled:opacity-60"
                  >
                    Нээх
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-1 flex justify-end gap-1.5">
        {Array.from({ length: pages }).map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => {
              setActiveIndex(index);
              scrollRef.current?.scrollTo({
                left: scrollRef.current.clientWidth * index,
                behavior: "smooth",
              });
            }}
            className={`h-1 rounded-full transition-all ${
              index === activeIndex ? "w-10 bg-white" : "w-8 bg-white/25"
            }`}
            aria-label={`${title} ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
