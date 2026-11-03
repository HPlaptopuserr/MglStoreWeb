import {
  emptyUnitContent,
  regionBindingKey,
  type BuildingWebsiteRecord,
  type PlanRegionDetails,
} from "@mgl/types/building-website";
import type { FloorPlan, PlanShape } from "@mgl/types/building-plans";

interface RegionUnit {
  id: string;
  typeLabel: string | null;
  rooms: number | null;
  areaM2: unknown;
  planSlot?: number;
}
interface RegionBlock {
  id: string;
  floors: { id: string; number: number; units: RegionUnit[] }[];
}

/** Only the same region of the same plan in the same block shares details. */
export function planRegionMembers(
  website: BuildingWebsiteRecord,
  block: RegionBlock,
  plan: FloorPlan,
  shape: PlanShape,
) {
  return block.floors
    .filter(
      (floor) =>
        website.plansByBlock[block.id]?.assignments[String(floor.number)] ===
        plan.id,
    )
    .sort((a, b) => a.number - b.number)
    .flatMap((floor) => {
      const bound =
        website.unitBindings?.[regionBindingKey(floor.id, plan.id, shape.id)];
      const unit = bound
        ? floor.units.find((item) => item.id === bound)
        : shape.unitSlot === null
          ? undefined
          : floor.units.some((item) => item.planSlot !== undefined)
            ? floor.units.find((item) => item.planSlot === shape.unitSlot)
            : floor.units[shape.unitSlot];
      return unit ? [unit] : [];
    });
}

/** Promote legacy per-floor details on read; never copy price, status or unit numbers. */
export function applyPlanRegionDetails(
  website: BuildingWebsiteRecord,
  blocks: RegionBlock[],
) {
  website.unitContent ??= {};
  website.planRegionDetails ??= {};
  for (const block of blocks) {
    for (const plan of website.plansByBlock[block.id]?.plans ?? []) {
      for (const shape of plan.shapes.filter((item) => item.kind === "unit")) {
        const members = planRegionMembers(website, block, plan, shape);
        if (!members.length) continue;
        const key = regionBindingKey(block.id, plan.id, shape.id);
        let details = website.planRegionDetails[key];
        if (!details) {
          const contents = members
            .map((unit) => website.unitContent?.[unit.id])
            .filter((item) => item !== undefined);
          const area = members.find(
            (unit) => unit.areaM2 !== null && Number(unit.areaM2) > 0,
          )?.areaM2;
          const roomInteriors = contents.find(
            (item) => item.roomInteriors?.length,
          )?.roomInteriors;
          const content = {
            ...(roomInteriors ? { roomInteriors } : {}),
            layout2d: contents.find((item) => item.layout2d)?.layout2d ?? "",
            layout3d: contents.find((item) => item.layout3d)?.layout3d ?? "",
            gallery:
              contents.find((item) => item.gallery.length)?.gallery ?? [],
            description:
              contents.find((item) => item.description)?.description ?? "",
          };
          details = {
            typeLabel:
              shape.label ||
              members.find((unit) => unit.typeLabel)?.typeLabel ||
              "",
            rooms:
              shape.inventory?.rooms ??
              members.find((unit) => unit.rooms !== null)?.rooms ??
              null,
            areaM2:
              shape.inventory?.areaM2 ??
              (area === undefined ? null : Number(area)),
            content,
          } satisfies PlanRegionDetails;
          website.planRegionDetails[key] = details;
        }
        shape.label = details.typeLabel;
        shape.inventory = {
          ...shape.inventory,
          rooms: details.rooms,
          areaM2: details.areaM2,
        };
        for (const unit of members) {
          website.unitContent[unit.id] = {
            ...emptyUnitContent(),
            ...website.unitContent[unit.id],
            ...details.content,
          };
        }
      }
    }
  }
  return website;
}
