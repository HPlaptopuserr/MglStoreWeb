import { regionBindingKey } from "@mgl/types/building-website";
import type { FloorPlan } from "@mgl/types/building-plans";
import type { WebsiteInventoryUnit } from "@mgl/types/building-website";

export interface FloorPlanUnit {
  id: string;
  label: string;
  unitNo?: string;
  areaM2: string | number | null;
  rooms: number | null;
  unit: WebsiteInventoryUnit | undefined;
}

/** Explicit slots remain stable when unpublished inventory is filtered out. */
export function resolveFloorPlanUnits(
  units: WebsiteInventoryUnit[],
  plan: FloorPlan | undefined,
  context?: {
    floorId: string;
    bindings?: Record<string, string>;
    publishedOnly?: boolean;
  },
): FloorPlanUnit[] {
  if (!plan)
    return units
      .filter((unit) => !context?.publishedOnly || unit.published)
      .map((unit) => ({
        id: unit.id,
        label: `№ ${unit.unitNo}`,
        areaM2: unit.areaM2,
        rooms: unit.rooms,
        unit,
      }));
  const hasSlots = units.some((unit) => unit.planSlot !== undefined);
  const bySlot = new Map(
    units.map((unit, index) => [hasSlots ? unit.planSlot : index, unit]),
  );
  return plan.shapes
    .filter((shape) => shape.kind === "unit")
    .map((shape) => {
      const boundId = context
        ? context.bindings?.[
            regionBindingKey(context.floorId, plan.id, shape.id)
          ]
        : undefined;
      const unit = boundId
        ? units.find((item) => item.id === boundId)
        : shape.unitSlot === null
          ? undefined
          : bySlot.get(shape.unitSlot);
      return {
        id: shape.id,
        label:
          shape.label ||
          (boundId ? unit?.typeLabel : undefined) ||
          "Байрны бүс",
        unitNo: unit?.unitNo || shape.inventory?.unitNo,
        areaM2: shape.inventory?.areaM2 ?? unit?.areaM2 ?? null,
        rooms: shape.inventory?.rooms ?? unit?.rooms ?? null,
        unit,
      };
    })
    .filter((entry) => !context?.publishedOnly || entry.unit?.published);
}
