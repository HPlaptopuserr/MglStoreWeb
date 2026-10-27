import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { WebsiteProject } from "@mgl/types/building-website";
import {
  buildingPlaceUrl,
  buildingBlockSelectionUrl,
} from "@/features/building/model/building-place-url";
import { ProjectBuildingExplorer } from "./ProjectBuildingExplorer";
import "../euro-plaza/euro-plaza.css";
import "./floor-selection-page.css";

export function ProjectFloorSelectionPage({
  project,
  blockId,
  preview,
}: {
  project: WebsiteProject;
  blockId: string;
  preview: boolean;
}) {
  return (
    <main className="euro-plaza floor-selection-page">
      <header className="floor-selection-header">
        <Link href={buildingBlockSelectionUrl(project, preview)}>
          <ArrowLeft size={17} aria-hidden="true" />
          <span>Блок сонгох</span>
        </Link>
        <div>
          <p>
            {project.title}
            {preview && <span>Урьдчилан харах</span>}
          </p>
          <h1>Давхар сонгох</h1>
        </div>
        <p className="floor-selection-steps">
          Блок → <strong>Давхар</strong> → Байр
        </p>
      </header>
      <ProjectBuildingExplorer
        key={blockId}
        project={project}
        initialBlockId={blockId}
        publicBase={buildingPlaceUrl(project, preview)}
        fullscreen
      />
    </main>
  );
}
