"use client";

import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import type { ProjectItem } from "@/lib/sections/types";

type ProjectOrderListProps = {
  projects: ProjectItem[];
  mode: "project" | "franchise";
  onEdit: (projectId: string) => void;
  onMove: (projectId: string, direction: -1 | 1) => void;
};

const ORDER_COPY = {
  project: {
    title: "Төслийн дараалал",
    description: "Энэ дарааллаар web-ийн төсөл хэсэгт харагдана.",
    countLabel: "төсөл",
    fallbackCategory: "Төсөл",
    unnamed: "Нэргүй төсөл",
  },
  franchise: {
    title: "Franchise дараалал",
    description: "Энэ дарааллаар web-ийн franchise хэсэгт харагдана.",
    countLabel: "franchise",
    fallbackCategory: "Franchise",
    unnamed: "Нэргүй franchise",
  },
} satisfies Record<
  "project" | "franchise",
  {
    title: string;
    description: string;
    countLabel: string;
    fallbackCategory: string;
    unnamed: string;
  }
>;

export function ProjectOrderList({
  projects,
  mode,
  onEdit,
  onMove,
}: ProjectOrderListProps) {
  if (projects.length === 0) return null;

  const copy = ORDER_COPY[mode];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-base font-black text-slate-950">
            {copy.title}
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {copy.description}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
          {projects.length} {copy.countLabel}
        </span>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project, index) => (
          <article
            key={`${mode}-sort-${project.id}`}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
          >
            <GripVertical className="h-4 w-4 shrink-0 text-slate-300" />
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-black text-slate-500 ring-1 ring-slate-200">
              {String(index + 1).padStart(2, "0")}
            </span>
            <button
              type="button"
              onClick={() => onEdit(project.id)}
              className="min-w-0 flex-1 text-left"
            >
              <span className="block truncate text-sm font-black text-slate-900">
                {project.title || copy.unnamed}
              </span>
              <span className="mt-0.5 block truncate text-xs font-semibold text-slate-400">
                {project.isActive ? "Web дээр харагдана" : "Нуусан"} ·{" "}
                {project.category || copy.fallbackCategory}
              </span>
            </button>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => onMove(project.id, -1)}
                disabled={index === 0}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Дээш"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onMove(project.id, 1)}
                disabled={index === projects.length - 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Доош"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
