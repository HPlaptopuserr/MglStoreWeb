import { ArrowRight, ImagePlus, Loader2, ShieldCheck } from "lucide-react";
import type { ProjectItem } from "./project-types";
import { formatMnt, getProjectImages } from "./project-utils";

type ProjectGridCardProps = {
  project: ProjectItem;
  index: number;
  openingId: string | null;
  onOpen: (project: ProjectItem) => void;
};

export function ProjectGridCard({
  project,
  index,
  openingId,
  onOpen,
}: ProjectGridCardProps) {
  const images = getProjectImages(project);
  const primaryImage = images[0];
  const isFree = !project.price || project.price <= 0;

  return (
    <article className="group flex min-h-[430px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-100/60">
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={project.title}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[linear-gradient(135deg,#f8fafc,#eef2f7)] text-slate-500">
            <ShieldCheck className="h-12 w-12 text-orange-400" />
            <span className="text-xs font-black uppercase tracking-[0.2em]">
              MGL Store төсөл
            </span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/65 via-slate-950/12 to-transparent" />
        <div className="absolute left-4 top-4 rounded-full bg-white/92 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-slate-700 shadow-sm backdrop-blur">
          {project.category || "Төсөл"}
        </div>
        <div className="absolute right-4 top-4 rounded-full bg-orange-500 px-3.5 py-1.5 text-[11px] font-black uppercase text-white shadow-lg shadow-orange-900/20">
          {isFree ? "Үнэгүй" : formatMnt(project.price)}
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-cyan-700">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-600" />
          PROJECT #{String(index + 1).padStart(6, "0")}
          {images.length > 1 && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-slate-500">
              <ImagePlus className="h-3.5 w-3.5" />
              {images.length}
            </span>
          )}
        </div>

        <h2 className="mt-3 line-clamp-2 text-xl font-black leading-tight text-slate-950">
          {project.title}
        </h2>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">
          {project.summary ||
            "Төслийн хураангуй, зураг болон төлбөртэй дэлгэрэнгүй мэдээллийг нэг дороос үзэх боломжтой."}
        </p>

        {project.tags && project.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {project.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-500"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => onOpen(project)}
          disabled={openingId === project.id}
          className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-orange-500 disabled:opacity-60"
        >
          {openingId === project.id ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              {isFree ? "Дэлгэрэнгүй үзэх" : "Төлөөд дэлгэрэнгүй үзэх"}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </article>
  );
}
