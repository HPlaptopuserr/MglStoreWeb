import {
  emptyUnitContent,
  type WebsiteProject,
} from "@mgl/types/building-website";
import { resolveFloorPlanUnits } from "../content/floor-plan-units";

export function getUnitDetail(
  project: WebsiteProject,
  blockId: string,
  floorNumber: number,
  regionId: string,
  publishedOnly = false,
) {
  const block = project.blocks.find((item) => item.id === blockId);
  const floor = block?.floors.find((item) => item.number === floorNumber);
  const library = project.website.plansByBlock[blockId];
  const plan = library?.plans.find(
    (item) => item.id === library.assignments[String(floorNumber)],
  );
  if (!block || !floor) return null;
  const entries = resolveFloorPlanUnits(floor.units, plan, {
    floorId: floor.id,
    bindings: project.website.unitBindings,
    publishedOnly,
  });
  const entry = entries.find(
    (item) => item.id === regionId || item.unit?.id === regionId,
  );
  if (!entry) return null;
  const content = entry.unit
    ? (project.website.unitContent?.[entry.unit.id] ?? emptyUnitContent())
    : emptyUnitContent();
  const area = entry.areaM2 === null ? null : Number(entry.areaM2);
  const rate = content.useProjectPrice
    ? (project.website.pricePerM2 ??
      (entry.unit?.pricePerM2 ? Number(entry.unit.pricePerM2) : null))
    : entry.unit?.pricePerM2 != null
      ? Number(entry.unit.pricePerM2)
      : null;
  const total =
    area !== null && rate !== null
      ? Math.round(area * rate * 100) / 100
      : entry.unit?.priceTotal != null
        ? Number(entry.unit.priceTotal)
        : null;
  return { block, floor, plan, entry, content, area, rate, total };
}
export const formatUnitPrice = (value: number | null) =>
  value === null ? "Үнэ тодорхойгүй" : `${value.toLocaleString("mn-MN")} ₮`;
