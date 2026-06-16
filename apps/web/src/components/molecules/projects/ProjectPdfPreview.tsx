"use client";

import {
  BadgeCheck,
  Download,
  ExternalLink,
  FileText,
  ImagePlus,
  LockKeyhole,
  X,
} from "lucide-react";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import type { ProjectItem } from "./project-types";
import { formatMnt, resolveProjectFileUrl } from "./project-utils";

const DEFAULT_FREE_PREVIEW_PAGES = 3;

type PdfPreviewItem = Pick<
  ProjectItem,
  | "title"
  | "summary"
  | "price"
  | "imageUrl"
  | "imageUrls"
  | "pdfUrl"
  | "pdfThumbnailUrl"
>;

type ProjectPdfPreviewProps = {
  project: PdfPreviewItem;
  className?: string;
  previewPages?: number;
  hasFullAccess?: boolean;
};

export function ProjectPdfPreview({
  project,
  className = "",
  previewPages = DEFAULT_FREE_PREVIEW_PAGES,
  hasFullAccess = false,
}: ProjectPdfPreviewProps) {
  const fallbackImage =
    (Array.isArray(project.imageUrls) ? project.imageUrls[0] : "") ||
    project.imageUrl ||
    "";
  const thumbnailUrl = resolveProjectFileUrl(
    project.pdfThumbnailUrl || fallbackImage,
  );

  return (
    <div className={`space-y-3 ${className}`}>
      <div
        className={`grid gap-3 rounded-2xl border p-3 text-sm font-black sm:grid-cols-[1fr_auto] sm:items-center ${
          hasFullAccess
            ? "border-emerald-200/25 bg-emerald-300/10 text-emerald-50"
            : "border-cyan-200/20 bg-cyan-300/10 text-cyan-50"
        }`}
      >
        <div className="inline-flex items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              hasFullAccess
                ? "bg-emerald-200/15 text-emerald-100"
                : "bg-cyan-200/15 text-cyan-100"
            }`}
          >
            {hasFullAccess ? (
              <BadgeCheck className="h-5 w-5" />
            ) : (
              <FileText className="h-5 w-5" />
            )}
          </span>
          <div>
            <p>
              {hasFullAccess
                ? "Access идэвхтэй"
                : `Үнэгүй preview: эхний ${previewPages} хуудас`}
            </p>
            <p className="mt-0.5 text-xs font-bold text-white/60">
              {hasFullAccess
                ? "PDF-г бүтнээр нь нээх болон татах боломжтой."
                : "Үргэлжлүүлж үзэх бол бүтэн PDF-г төлбөрөөр нээнэ."}
            </p>
          </div>
        </div>
        <span
          className={`rounded-xl border px-3 py-2 ${
            hasFullAccess
              ? "border-emerald-200/25 bg-emerald-200/10 text-emerald-100"
              : "border-orange-200/20 bg-orange-200/10 text-orange-100"
          }`}
        >
          {hasFullAccess
            ? "PDF нээгдсэн"
            : `Бүтэн PDF ${formatMnt(project.price)}`}
        </span>
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#19191c] shadow-[0_22px_70px_rgba(0,0,0,0.28)]">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={`${project.title} thumbnail`}
            className="h-[min(42dvh,340px)] min-h-[220px] w-full object-cover sm:h-[46vh] sm:min-h-[340px]"
          />
        ) : (
          <div className="flex h-[min(42dvh,340px)] min-h-[220px] w-full flex-col items-center justify-center gap-3 bg-[linear-gradient(135deg,#171717,#26231f)] text-orange-50/70 sm:h-[46vh] sm:min-h-[340px]">
            <ImagePlus className="h-12 w-12 text-orange-200/70" />
            <p className="max-w-sm text-center text-sm font-bold leading-6">
              Preview thumbnail зураг оруулаагүй байна.
            </p>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent px-5 pb-5 pt-16">
          <p className="max-w-2xl text-lg font-black text-white">
            {project.title}
          </p>
          <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-orange-100/85">
            {hasFullAccess
              ? "Та энэ материалыг авсан тул бүтнээр нь нээж татаж болно."
              : `Эхний ${previewPages} хуудасны preview-г thumbnail байдлаар харуулж байна. Үргэлжлүүлж бүтэн PDF үзэх бол төлбөрөөр нээнэ.`}
          </p>
        </div>
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
  hasFullAccess?: boolean;
};

export function LockedProjectPreviewModal({
  project,
  kindLabel,
  opening,
  onClose,
  onUnlock,
  previewPages = DEFAULT_FREE_PREVIEW_PAGES,
  hasFullAccess = false,
}: LockedProjectPreviewModalProps) {
  useLockBodyScroll();
  const pdfUrl = resolveProjectFileUrl(project.pdfUrl);
  const canDownload = hasFullAccess && Boolean(pdfUrl);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center overflow-hidden overscroll-none p-0 sm:items-center sm:p-4">
      <button
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        onClick={onClose}
        aria-label="Хаах"
      />
      <article className="relative z-10 flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[28px] border border-orange-200/20 bg-[#111113] text-white shadow-2xl sm:max-h-[88vh] sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
              {kindLabel} preview
            </p>
            <h2 className="mt-2 line-clamp-2 text-2xl font-black leading-tight text-white sm:text-3xl">
              {project.title}
            </h2>
            <p className="mt-2 text-sm font-bold text-orange-200">
              {hasFullAccess
                ? "Энэ материал таны эрх дээр нээгдсэн байна."
                : `Эхний ${previewPages} хуудсыг үнэгүй үзээд, бүтэн мэдээллийг төлбөрөөр нээнэ.`}
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

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-6">
          {project.summary && (
            <p className="mb-5 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-semibold leading-7 text-orange-50/80">
              {project.summary}
            </p>
          )}
          <ProjectPdfPreview
            project={project}
            previewPages={previewPages}
            hasFullAccess={hasFullAccess}
          />
        </div>

        <div className="sticky bottom-0 border-t border-white/10 bg-[#111113]/95 px-4 py-4 backdrop-blur sm:px-6">
          <div className="grid gap-3 sm:flex sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 text-sm font-black text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              Дараа үзэх
            </button>
            {canDownload ? (
              <a
                href={pdfUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-300 px-5 text-sm font-black text-[#071014] transition hover:brightness-110"
              >
                <Download className="h-4 w-4" />
                PDF татах
              </a>
            ) : (
              <button
                type="button"
                onClick={onUnlock}
                disabled={opening}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-300 px-5 text-sm font-black text-black transition hover:brightness-110 disabled:opacity-60"
              >
                {hasFullAccess ? (
                  <ExternalLink className="h-4 w-4" />
                ) : (
                  <LockKeyhole className="h-4 w-4" />
                )}
                {opening
                  ? "Нээж байна..."
                  : hasFullAccess
                    ? "PDF нээх"
                    : "Төлж бүтнээр нээх"}
              </button>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
