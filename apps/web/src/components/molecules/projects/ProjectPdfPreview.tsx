import { FileText, LockKeyhole, X } from "lucide-react";
import type { ProjectItem } from "./project-types";
import { formatMnt, resolveProjectFileUrl } from "./project-utils";

type ProjectPdfPreviewProps = {
  project: ProjectItem;
  className?: string;
};

export function ProjectPdfPreview({
  project,
  className = "",
}: ProjectPdfPreviewProps) {
  const previewUrl = resolveProjectFileUrl(project.pdfPreviewUrl);

  if (!previewUrl) {
    return (
      <div
        className={`rounded-xl border border-dashed border-orange-200/30 bg-white/[0.03] p-8 text-center text-sm font-bold text-orange-100/70 ${className}`}
      >
        Үнэгүй preview PDF бэлэн болоогүй байна.
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-cyan-200/20 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-50">
        <span className="inline-flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Үнэгүй preview: эхний 4 хуудас
        </span>
        <span className="shrink-0 text-orange-100">
          Бүтэн PDF {formatMnt(project.price)}
        </span>
      </div>
      <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
        <iframe
          src={previewUrl}
          title={`${project.title} preview PDF`}
          className="h-[62vh] w-full bg-white"
        />
      </div>
    </div>
  );
}

type LockedProjectPreviewModalProps = {
  project: ProjectItem;
  kindLabel: string;
  opening: boolean;
  onClose: () => void;
  onUnlock: () => void;
};

export function LockedProjectPreviewModal({
  project,
  kindLabel,
  opening,
  onClose,
  onUnlock,
}: LockedProjectPreviewModalProps) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
        aria-label="Хаах"
      />
      <article className="relative z-10 max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-orange-200/20 bg-[#111113] text-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
              {kindLabel} preview
            </p>
            <h2 className="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl">
              {project.title}
            </h2>
            <p className="mt-2 text-sm font-bold text-orange-200">
              4 хуудсыг үнэгүй үзээд, бүтэн мэдээллийг төлбөрөөр нээнэ.
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

        <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
          {project.summary && (
            <p className="mb-5 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-semibold leading-7 text-orange-50/80">
              {project.summary}
            </p>
          )}
          <ProjectPdfPreview project={project} />
          <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={onUnlock}
              disabled={opening}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-300 px-5 py-3 text-sm font-black text-black transition hover:brightness-110 disabled:opacity-60"
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
