"use client";

import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  ListOrdered,
  Pencil,
  X,
} from "lucide-react";
import type { ProjectItem } from "@/lib/sections/types";

type ProjectOrderListProps = {
  projects: ProjectItem[];
  mode: "project" | "franchise" | "study";
  onEdit: (projectId: string) => void;
  onMove: (projectId: string, direction: -1 | 1) => void;
  onReorder: (sourceId: string, targetId: string) => void;
  onToggleVisibility: (projectId: string) => void;
  embedded?: boolean;
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
  study: {
    title: "Сургалтын дараалал",
    description: "Энэ дарааллаар /study page дээр харагдана.",
    countLabel: "сургалт",
    fallbackCategory: "Сургалт",
    unnamed: "Нэргүй сургалт",
  },
} satisfies Record<
  "project" | "franchise" | "study",
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
  onReorder,
  onToggleVisibility,
  embedded = false,
}: ProjectOrderListProps) {
  const copy = ORDER_COPY[mode];
  const [open, setOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const activeCount = projects.filter((project) => project.isActive).length;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (projects.length === 0) return null;

  const orderList = (
    <div className={`grid gap-2 ${embedded ? "" : "md:grid-cols-2"}`}>
      {projects.map((project, index) => (
        <article
          key={`${mode}-sort-${project.id}`}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            if (dragOverId !== project.id) setDragOverId(project.id);
          }}
          onDragLeave={() => {
            if (dragOverId === project.id) setDragOverId(null);
          }}
          onDrop={(event) => {
            event.preventDefault();
            const sourceId =
              draggedId || event.dataTransfer.getData("text/plain");
            if (sourceId && sourceId !== project.id)
              onReorder(sourceId, project.id);
            setDraggedId(null);
            setDragOverId(null);
          }}
          onDragEnd={() => {
            setDraggedId(null);
            setDragOverId(null);
          }}
          className={`flex items-center gap-3 rounded-xl border px-3 py-3 transition-all ${
            draggedId === project.id
              ? "scale-[0.98] border-violet-300 bg-violet-50 opacity-60"
              : dragOverId === project.id
                ? "border-violet-400 bg-violet-50 ring-2 ring-violet-100"
                : "border-slate-200 bg-slate-50"
          }`}
        >
          <span
            draggable
            onDragStart={(event) => {
              setDraggedId(project.id);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", project.id);
            }}
            className="cursor-grab touch-none text-slate-300 active:cursor-grabbing"
            title="Чирж байрлал солино"
          >
            <GripVertical className="h-5 w-5 shrink-0" />
          </span>
          <label
            className="flex shrink-0 cursor-pointer items-center"
            title={project.isActive ? "Web дээр харагдана" : "Web дээр нуусан"}
          >
            <input
              type="checkbox"
              checked={project.isActive}
              onChange={() => onToggleVisibility(project.id)}
              className="h-5 w-5 cursor-pointer rounded border-slate-300 text-violet-600 focus:ring-2 focus:ring-violet-500"
              aria-label={`${project.title || copy.unnamed} web дээр харуулах`}
            />
          </label>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-black text-slate-500 ring-1 ring-slate-200">
            {String(index + 1).padStart(2, "0")}
          </span>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onEdit(project.id);
            }}
            className="min-w-0 flex-1 text-left"
          >
            <span className="block truncate text-sm font-black text-slate-900">
              {project.title || copy.unnamed}
            </span>
            <span className="mt-0.5 block truncate text-xs font-semibold text-slate-400">
              {project.isActive ? "Web дээр харагдана" : "Web дээр нуусан"} ·{" "}
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
  );

  if (embedded) return orderList;

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <ListOrdered className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-950">
                  {copy.title}
                </h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-500">
                  {projects.length} {copy.countLabel}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {activeCount} web дээр · {projects.length - activeCount} нуусан
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
          >
            <Pencil className="h-4 w-4" /> Дараалал тохируулах
          </button>
        </div>
      </section>

      {open && (
        <>
          <button
            type="button"
            aria-label="Дарааллын тохиргоо хаах"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-slate-950/50 backdrop-blur-[2px]"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${mode}-order-title`}
            className="fixed inset-x-3 top-3 z-50 max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:inset-x-6 sm:top-6 sm:mx-auto sm:max-h-[calc(100dvh-3rem)] sm:max-w-4xl sm:p-5"
          >
            <div className="sticky -top-4 z-20 mb-4 flex items-center justify-between gap-3 border-b border-slate-100 bg-white pb-3 pt-1 sm:-top-5">
              <div>
                <h3
                  id={`${mode}-order-title`}
                  className="text-lg font-black text-slate-950"
                >
                  {copy.title}
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {copy.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Хаах"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {orderList}
          </section>
        </>
      )}
    </>
  );
}
