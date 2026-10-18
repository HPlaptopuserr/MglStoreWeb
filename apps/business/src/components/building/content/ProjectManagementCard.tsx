import Link from "next/link";
import { ArrowRight, Building2, Layers3, MapPin, Eye } from "lucide-react";
import type { BuildingAdminProject } from "@mgl/types";
import { ProjectStatus } from "../manage/ProjectStatus";
export function ProjectManagementCard({
  project,
}: {
  project: BuildingAdminProject;
}) {
  const floors = project.blocks.reduce(
    (total, block) => total + block._count.floors,
    0,
  );
  return (
    <article className="management-project-card">
      <div className="management-card-top">
        <span className="management-project-icon">
          <Building2 size={26} />
        </span>
        <ProjectStatus status={project.status} />
      </div>
      <h2>
        <Link href={`/building/manage/${project.id}/website`}>
          {project.title}
        </Link>
      </h2>
      <p className="management-location">
        <MapPin size={14} />
        {project.district || "Байршил оруулаагүй"}
      </p>
      <div className="management-card-facts">
        <span>
          <Building2 size={16} />
          <strong>{project.blocks.length}</strong> блок
        </span>
        <span>
          <Layers3 size={16} />
          <strong>{floors}</strong> давхар
        </span>
      </div>
      <p className="management-card-hint">
        {project.status === "PUBLISHED"
          ? "Нийтэлсэн мэдээлэл, үнэ, төлөвөө шинэчлэх"
          : "Танилцуулга, зураг, үнэ болон планаа бэлтгэх"}
      </p>
      <footer>
        <Link
          className="building-primary"
          href={`/building/manage/${project.id}/website`}
        >
          Төсөл удирдах <ArrowRight size={16} />
        </Link>
        <Link
          className="management-icon-link"
          href={`/building/manage/${project.id}/preview`}
          aria-label={`${project.title} урьдчилан харах`}
          title="Урьдчилан харах"
          target="_blank"
        >
          <Eye size={19} />
        </Link>
      </footer>
    </article>
  );
}
