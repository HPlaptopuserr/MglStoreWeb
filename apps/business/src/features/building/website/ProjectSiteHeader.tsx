import Link from "next/link";
import { Building2 } from "lucide-react";
import type { WebsiteProject } from "@mgl/types/building-website";
import {
  buildingPlaceUrl,
  buildingProjectDetailsUrl,
  buildingBlockSelectionUrl,
} from "@/features/building/model/building-place-url";
import { getBuildingHomeProjects } from "@/features/building/server/building-home";
import { ProjectSwitcher } from "./ProjectSwitcher";

export async function ProjectSiteHeader({
  project,
  preview,
}: {
  project: WebsiteProject;
  preview: boolean;
}) {
  const projects = await getBuildingHomeProjects().catch(() => []);
  const details = buildingProjectDetailsUrl(project, preview);
  return (
    <header className="project-site-header">
      <Link
        href={buildingPlaceUrl(project, preview)}
        className="project-site-brand"
        aria-label={`${project.title} — Нүүр`}
      >
        <span className="project-site-brand-mark">
          <Building2 size={30} strokeWidth={1.5} aria-hidden="true" />
        </span>
        <span>
          {project.title}
          <small
            title={
              preview
                ? "Удирдлагын урьдчилан харах горим. Нийтлэгдээгүй нэгжүүд мөн харагдана."
                : undefined
            }
          >
            {preview ? "УРЬДЧИЛАН ХАРАХ" : "MGL PROPERTY"}
          </small>
        </span>
      </Link>
      <nav className="project-site-navigation" aria-label="Төслийн цэс">
        <Link href={`${details}#about`}>Төслийн тухай</Link>
        <Link
          href={buildingBlockSelectionUrl(project, preview)}
          className="project-site-booking"
        >
          Байр сонгох
        </Link>
      </nav>
      <div className="project-site-account">
        <ProjectSwitcher
          projects={projects}
          selectedId={project.id}
          managing={preview}
        />
        <Link href="/building/buyer-login" className="project-site-login">
          Нэвтрэх
        </Link>
      </div>
    </header>
  );
}
