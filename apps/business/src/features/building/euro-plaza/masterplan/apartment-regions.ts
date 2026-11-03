import sourceRegions from "./source-plan-regions.json";
import type { ApartmentType, FloorPlan } from "./floor-plans";

export interface ApartmentRegion extends ApartmentType {
  path: string;
  displayPath: string;
  wallPath: string;
  x: number;
  y: number;
  color: string;
}
// PDF color-fill vectors, transformed into the same page coordinate system
// as the rendered source. Each connected room belongs to its original color.
export const residentialPlanViewport = { x: 450, y: 340, width: 1095, height: 550 };

export function getApartmentRegions(plan: FloorPlan): ApartmentRegion[] {
  const geometry = plan.id === "floors-4-10" ? sourceRegions["floors-4-10"]
    : plan.id === "floors-11-16" ? sourceRegions["floors-11-16"] : [];
  return plan.apartments.flatMap((type) => type.code.split(", ").flatMap((code) => {
    const region = geometry.find((item) => item.code === code);
    return region ? [{ ...type, ...region, count: 1 }] : [];
  }));
}
