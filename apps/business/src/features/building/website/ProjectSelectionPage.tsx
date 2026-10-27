import { notFound } from "next/navigation";
import { getWebsiteProject } from "@/features/building/server/building-website";
import { buildingPlaceUrl } from "@/features/building/model/building-place-url";
import { ProjectSelectionScreen } from "./ProjectSelectionScreen";
import "./project-selection.css";

export async function ProjectSelectionPage({
  slug,
  preview = false,
}: {
  slug: string;
  preview?: boolean;
}) {
  const project = await getWebsiteProject(slug, preview);
  if (!project) notFound();
  return (
    <ProjectSelectionScreen
      project={{
        title: project.title,
        masterplan: project.website.masterplan,
        blocks: project.blocks.map((block) => ({
          id: block.id,
          name: block.name,
          floorCount: block.floors.length,
        })),
      }}
      base={buildingPlaceUrl(project, preview)}
      preview={preview}
    />
  );
}
