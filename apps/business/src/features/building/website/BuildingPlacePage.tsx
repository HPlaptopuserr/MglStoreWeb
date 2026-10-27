import { resolveBuildingBlock } from "@/features/building/model/building-place-resolver";
import { notFound } from "next/navigation";
import { getWebsiteProject } from "@/features/building/server/building-website";
import { WebsiteProjectView } from "./WebsiteProjectView";
import { getUnitDetail } from "../units/unit-detail-model";

export async function BuildingPlacePage({
  slug,
  place = [],
  preview = false,
}: {
  slug: string;
  place?: string[];
  preview?: boolean;
}) {
  if (place.length > 3) notFound();
  const project = await getWebsiteProject(slug, preview);
  if (!project) notFound();
  const block = resolveBuildingBlock(project.blocks, place[0]);
  if (place.length && !block) notFound();
  const floor = block?.floors.find((item) => String(item.number) === place[1]);
  if (place.length >= 2 && !floor) notFound();
  const units = floor?.units.filter((item) => item.unitNo === place[2]);
  const unit = units?.length === 1 ? units[0] : undefined;
  if (
    place.length === 3 &&
    (!unit ||
      !getUnitDetail(project, block!.id, floor!.number, unit.id, !preview))
  )
    notFound();
  return (
    <WebsiteProjectView
      canonical
      project={project}
      preview={preview}
      query={{
        block: block?.id,
        floor: floor ? String(floor.number) : undefined,
        region: unit?.id,
        view: unit ? "unit" : undefined,
      }}
    />
  );
}
