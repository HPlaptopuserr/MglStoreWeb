"use client";

import { useEffect } from "react";
import { FileText, LockKeyhole, X } from "lucide-react";
import type { ProjectItem } from "./project-types";
import { formatMnt, resolveProjectFileUrl } from "./project-utils";

const DEFAULT_FREE_PREVIEW_PAGES = 3;

type PdfPreviewItem = Pick<
  ProjectItem,
  "title" | "summary" | "price" | "pdfPreviewUrl"
>;

type ProjectPdfPreviewProps = {
  project: PdfPreviewItem;
  className?: string;
  previewPages?: number;
};

export function ProjectPdfPreview({
  project,
  className = "",
  previewPages = DEFAULT_FREE_PREVIEW_PAGES,
}: ProjectPdfPreviewProps) {
  const previewUrl = resolveProjectFileUrl(project.pdfPreviewUrl);

  if (!previewUrl) {
    return (
      <div
        className={`rounded-2xl border border-dashed border-orange-200/30 bg-white/[0.04] p-8 text-center text-sm font-bold leading-6 text-orange-100/75 ${className}`}
      >
        Эхний {previewPages} хуудсын preview PDF бэлэн болоогүй байна.
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="grid gap-3 rounded-2xl border border-cyan-200/20 bg-cyan-300/10 p-3 text-sm font-black text-cyan-50 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="inline-flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-200/15 text-cyan-100">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <p>Үнэгүй preview: эхний {previewPages} хуудас</p>
            <p className="mt-0.5 text-xs font-bold text-cyan-50/60">
              Үргэлжлүүлж үзэх бол бүтэн PDF-г төлбөрөөр нээнэ.
            </p>
          </div>
        </div>
        <span className="rounded-xl border border-orange-200/20 bg-orange-200/10 px-3 py-2 text-orange-100">
          Бүтэн PDF {formatMnt(project.price)}
        </span>
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-[0_22px_70px_rgba(0,0,0,0.28)]">
        <iframe
          src={previewUrl}
          title={`${project.title} preview PDF`}
          className="h-[56vh] min-h-[420px] w-full bg-white"
        />
      </div>
    </div>
  );
}

type LockedProjectPreviewModalProps = {
  project: PdfPreviewItem;
  kindLabel: string;
  opening: boolean;
  onClose: () => void;
  onUnlock: () => void;
  previewPages?: number;
};

export function LockedProjectPreviewModal({
  project,
  kindLabel,
  opening,
  onClose,
  onUnlock,
  previewPages = DEFAULT_FREE_PREVIEW_PAGES,
}: LockedProjectPreviewModalProps) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        onClick={onClose}
        aria-label="Хаах"
      />
      <article className="relative z-10 flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-orange-200/20 bg-[#111113] text-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
              {kindLabel} preview
            </p>
            <h2 className="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl">
              {project.title}
            </h2>
            <p className="mt-2 text-sm font-bold text-orange-200">
              Эхний {previewPages} хуудсыг үнэгүй үзээд, бүтэн мэдээллийг
              төлбөрөөр нээнэ.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"
            aria-label="Хаах"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {project.summary && (
            <p className="mb-5 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-semibold leading-7 text-orange-50/80">
              {project.summary}
            </p>
          )}
          <ProjectPdfPreview project={project} previewPages={previewPages} />
          <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 text-sm font-black text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              Дараа үзэх
            </button>
            <button
              type="button"
              onClick={onUnlock}
              disabled={opening}
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-300 px-5 text-sm font-black text-black transition hover:brightness-110 disabled:opacity-60"
            >
              <LockKeyhole className="h-4 w-4" />
              {opening ? "Нээж байна..." : "Төлж бүтнээр нээх"}
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}
