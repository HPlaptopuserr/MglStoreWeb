import type { WebsiteProject } from "@mgl/types/building-website";
import { resolveFloorPlanUnits } from "./floor-plan-units";

/** Use the assigned plan's units for cards, counts and the floor-plan viewer alike. */
export function getProjectFloorInventory(
  project: Pick<WebsiteProject, "blocks" | "website">,
  blockId: string,
  floorNumber: number,
  publishedOnly: boolean,
) {
  const block = project.blocks.find((item) => item.id === blockId);
  const floor = block?.floors.find((item) => item.number === floorNumber);
  const library = project.website.plansByBlock[blockId];
  const planId = library?.assignments[String(floorNumber)];
  const plan = library?.plans.find((item) => item.id === planId);
  const entries = floor
    ? resolveFloorPlanUnits(floor.units, plan, {
        floorId: floor.id,
        bindings: project.website.unitBindings,
        publishedOnly,
      })
    : [];
  const available = entries.filter(
    (entry) => entry.unit?.status === "AVAILABLE",
  );
  const prices = available.flatMap((entry) => {
    const price = entry.unit?.priceTotal;
    return price !== null &&
      price !== undefined &&
      Number.isFinite(Number(price))
      ? [Number(price)]
      : [];
  });
  return { floor, plan, entries, available, prices };
}
