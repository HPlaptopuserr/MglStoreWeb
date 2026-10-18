import Link from "next/link";
import Image from "next/image";
import { Building2, ArrowUpRight, MapPin } from "lucide-react";
import type { BuildingProjectSummary } from "@mgl/types";

export function ProjectCard({ project }: { project: BuildingProjectSummary }) {
  return (
    <Link
      href={`/building/projects/${project.id}`}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-700 motion-reduce:transform-none"
    >
      <div className="flex aspect-[16/9] items-center justify-center overflow-hidden bg-emerald-50">
        {project.coverImageUrl ? (
          <Image
            width={640}
            height={360}
            unoptimized
            src={project.coverImageUrl}
            alt={project.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <Building2 size={48} className="text-emerald-700" />
        )}
      </div>
      <div className="space-y-3 p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
          {project.organization.name}
        </p>
        <h2 className="flex items-center justify-between gap-3 text-xl font-bold">
          {project.title}
          <ArrowUpRight size={20} aria-hidden="true" />
        </h2>
        <p className="flex gap-2 text-sm text-slate-500">
          <MapPin size={16} aria-hidden="true" />
          {project.district || project.address || "Байршил удахгүй нэмэгдэнэ"}
        </p>
        {project.description && (
          <p className="line-clamp-2 text-sm leading-6 text-slate-600">
            {project.description}
          </p>
        )}
      </div>
    </Link>
  );
}
