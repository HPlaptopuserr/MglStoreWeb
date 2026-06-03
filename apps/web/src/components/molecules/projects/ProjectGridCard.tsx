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
    <article className="group overflow-hidden rounded-xl border border-white/10 bg-[#18181b] shadow-[0_24px_70px_rgba(0,0,0,0.34)] transition duration-300 hover:-translate-y-1 hover:border-orange-300/40">
      <div className="relative aspect-[16/12] overflow-hidden bg-[#0f0f11]">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={project.title}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[linear-gradient(135deg,#151516,#23201e)] text-white">
            <ShieldCheck className="h-14 w-14 text-orange-300" />
            <span className="text-sm font-black uppercase">
              MGL Store төсөл
            </span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#18181b] to-transparent" />
        <div className="absolute right-4 top-4 rounded-full bg-gradient-to-r from-orange-500 to-orange-300 px-4 py-1.5 text-[11px] font-black uppercase text-white shadow-lg shadow-orange-900/40">
          {isFree ? "Үнэгүй" : formatMnt(project.price)}
        </div>
      </div>

      <div className="flex min-h-[246px] flex-col px-6 pb-6 pt-5">
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-cyan-300">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
          PROJECT #{String(index + 1).padStart(6, "0")}
          {images.length > 1 && (
            <span className="ml-auto inline-flex items-center gap-1 text-orange-200/80">
              <ImagePlus className="h-3.5 w-3.5" />
              {images.length}
            </span>
          )}
        </div>

        <h2 className="mt-4 line-clamp-2 text-2xl font-black leading-tight text-white">
          {project.title}
        </h2>
        <p className="mt-4 line-clamp-4 text-sm leading-6 text-orange-50/70">
          {project.summary ||
            "Төслийн хураангуй, зураг болон төлбөртэй дэлгэрэнгүй мэдээллийг нэг дороос үзэх боломжтой."}
        </p>

        <button
          type="button"
          onClick={() => onOpen(project)}
          disabled={openingId === project.id}
          className="mt-auto inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-300 px-5 text-sm font-black text-black transition hover:brightness-110 disabled:opacity-60"
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

