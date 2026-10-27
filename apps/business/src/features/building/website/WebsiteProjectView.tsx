import { redirect, notFound } from "next/navigation";
import { buildingPlaceUrl } from "@/features/building/model/building-place-url";
import { getUnitDetail } from "../units/unit-detail-model";
import { UnitDetailPage } from "../units/UnitDetailPage";
import { ProjectFloorSelectionPage } from "./ProjectFloorSelectionPage";
import type { WebsiteProject } from "@mgl/types/building-website";
import { ManagedProjectSite } from "./ManagedProjectSite";
import { LiveProjectViewer } from "./LiveProjectViewer";
export function WebsiteProjectView({
  project,
  query,
  preview = false,
  canonical = false,
}: {
  project: WebsiteProject;
  query: { block?: string; floor?: string; region?: string; view?: string };
  preview?: boolean;
  canonical?: boolean;
}) {
  if (!canonical) {
    const block = query.block
      ? project.blocks.find((item) => item.id === query.block)
      : undefined;
    if (query.block && !block) notFound();
    const floor =
      query.floor !== undefined
        ? block?.floors.find((item) => item.number === Number(query.floor))
        : undefined;
    if (query.floor !== undefined && !floor) notFound();
    const detail =
      query.view === "unit" && block && floor && query.region
        ? getUnitDetail(project, block.id, floor.number, query.region, !preview)
        : null;
    if (query.view === "unit" && !detail?.entry.unit) notFound();
    redirect(
      buildingPlaceUrl(
        project,
        preview,
        block?.name,
        floor?.number,
        detail?.entry.unit?.unitNo,
      ),
    );
  }
  if (query.floor !== undefined) {
    const block =
      project.blocks.find((item) => item.id === query.block) ??
      project.blocks[0];
    const floor =
      block?.floors.find((item) => item.number === Number(query.floor)) ??
      block?.floors[0];
    if (block && floor && query.view === "unit" && query.region)
      return (
        <UnitDetailPage
          project={project}
          blockId={block.id}
          floorNumber={floor.number}
          regionId={query.region}
          preview={preview}
        />
      );
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
  const selectedBlock = project.blocks.find(
    (block) => block.id === query.block,
  );
  if (selectedBlock) {
    return (
      <ProjectFloorSelectionPage
        project={project}
        blockId={selectedBlock.id}
        preview={preview}
      />
    );
  }
  return <ManagedProjectSite project={project} preview={preview} />;
}
