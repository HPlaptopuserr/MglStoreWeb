import { UnitDetailPage } from "../units/UnitDetailPage";
import Link from "next/link";
import { ProjectBuildingExplorer } from "./ProjectBuildingExplorer";
import type { WebsiteProject } from "@mgl/types/building-website";
import { ManagedProjectSite } from "./ManagedProjectSite";
import { LiveProjectViewer } from "./LiveProjectViewer";
export function WebsiteProjectView({
  project,
  query,
  preview = false,
}: {
  project: WebsiteProject;
  query: { block?: string; floor?: string; region?: string; view?: string };
  preview?: boolean;
}) {
  if (query.floor !== undefined) {
    const block =
      project.blocks.find((item) => item.id === query.block) ??
      project.blocks[0];
    const floor =
      block?.floors.find((item) => item.number === Number(query.floor)) ??
      block?.floors[0];
    if (block && floor && query.view === "unit" && query.region) return <UnitDetailPage
      project={project} blockId={block.id} floorNumber={floor.number} regionId={query.region} preview={preview} />;
    if (block && floor)
      return (
        <LiveProjectViewer
          key={`${block.id}-${floor.number}`}
          project={project}
          blockId={block.id}
          initialFloor={floor.number}
          preview={preview}
        />
      );
  }
  const selectedBlock = project.blocks.find(block => block.id === query.block);
  if (selectedBlock) {
    const base = preview ? `/building/manage/${project.id}/preview` : `/building/projects/${project.id}`;
    return <main className="residence-section">
      <Link className="building-secondary" href={base + "#choose-block"}>← Блок сонгох</Link>
      <ProjectBuildingExplorer key={selectedBlock.id} project={project} initialBlockId={selectedBlock.id} publicBase={base} />
    </main>;
  }
  return <ManagedProjectSite project={project} preview={preview} />;
}
