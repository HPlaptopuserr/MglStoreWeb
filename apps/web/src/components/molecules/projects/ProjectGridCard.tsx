import {
  ArrowRight,
  ImagePlus,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { ProjectItem } from "./project-types";
import {
  formatMnt,
  getProjectImages,
  getResponsiblePeople,
} from "./project-utils";

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
  const responsiblePeople = getResponsiblePeople(project);
  const visibleResponsiblePeople = responsiblePeople.slice(0, 2);

  return (
    <article className="group relative flex min-h-[430px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_14px_42px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_24px_70px_rgba(251,146,60,0.18)]">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />

      <div className="relative m-3 mb-0 aspect-[16/10] overflow-hidden rounded-[18px] bg-slate-100">
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
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-slate-950/12 opacity-90" />
        <div className="absolute left-4 top-4 rounded-full border border-white/60 bg-white/90 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-slate-700 shadow-sm backdrop-blur-md">
          {project.category || "Төсөл"}
        </div>
        <div className="absolute right-4 top-4 rounded-full bg-orange-500 px-3.5 py-1.5 text-[11px] font-black uppercase text-white shadow-lg shadow-orange-900/25 ring-1 ring-white/35">
          {isFree ? "Үнэгүй" : formatMnt(project.price)}
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/70 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-white shadow-sm backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />#
            {String(index + 1).padStart(6, "0")}
          </div>
          {images.length > 1 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1.5 text-[11px] font-black text-slate-700 shadow-sm backdrop-blur-md">
              <ImagePlus className="h-3.5 w-3.5" />
              {images.length}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col px-6 pb-6 pt-5">
        <h2 className="line-clamp-2 text-[22px] font-black leading-[1.12] tracking-tight text-slate-950">
          {project.title}
        </h2>
        <p className="mt-3 line-clamp-3 text-[15px] font-medium leading-7 text-slate-500">
          {project.summary ||
            "Төслийн хураангуй, зураг болон төлбөртэй дэлгэрэнгүй мэдээллийг нэг дороос үзэх боломжтой."}
        </p>

        {project.tags && project.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {project.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-500 transition group-hover:border-orange-100 group-hover:bg-orange-50/60 group-hover:text-orange-600"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {visibleResponsiblePeople.length > 0 && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-black uppercase tracking-wide text-cyan-700">
              <span className="inline-flex items-center gap-1.5">
                <UserRound className="h-3.5 w-3.5" />
                Хариуцагч
              </span>
              {responsiblePeople.length > visibleResponsiblePeople.length && (
                <span className="rounded-full bg-white px-2 py-0.5 text-slate-500">
                  +{responsiblePeople.length - visibleResponsiblePeople.length}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {visibleResponsiblePeople.map((person, personIndex) => (
                <div
                  key={person.id || person.teamMemberId || personIndex}
                  className="flex min-w-0 items-center gap-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-400">
                    {person.avatarUrl ? (
                      <img
                        src={person.avatarUrl}
                        alt={person.name || "Хариуцагч"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserRound className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-slate-950">
                      {person.name || "Нэр оруулаагүй"}
                    </p>
                    {(person.responsibility || person.role) && (
                      <p className="truncate text-xs font-semibold text-slate-500">
                        {person.responsibility || person.role}
                      </p>
                    )}
                    <div className="mt-1 flex min-w-0 flex-wrap gap-x-2 gap-y-1 text-[11px] font-bold text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3 text-orange-500" />
                        {person.phone || "Дугаар оруулаагүй"}
                      </span>
                      {person.email && (
                        <span className="inline-flex min-w-0 items-center gap-1">
                          <Mail className="h-3 w-3 text-orange-500" />
                          <span className="truncate">{person.email}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => onOpen(project)}
          disabled={openingId === project.id}
          className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white shadow-lg shadow-slate-950/15 ring-1 ring-slate-900 transition hover:bg-orange-500 hover:shadow-orange-200 disabled:opacity-60"
        >
          {openingId === project.id ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              {isFree ? "Дэлгэрэнгүй үзэх" : "3 хуудас preview үзэх"}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </article>
  );
}
