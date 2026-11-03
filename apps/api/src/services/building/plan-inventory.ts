import type { Prisma } from "@mgl/database";
import type { FloorPlan } from "@mgl/types/building-plans";
import { regionBindingKey } from "@mgl/types/building-website";
import { BuildingInputError } from "./project-input";

/** Stable per-floor bindings. Never delete inventory or infer links for unlinked shapes. */
export async function syncPlanInventory(
  tx: Prisma.TransactionClient,
  floorId: string,
  number: number,
  plan: FloorPlan,
  bindings: Record<string, string>,
  previous?: FloorPlan,
) {
  const units = await tx.barilgaUnit.findMany({
    where: { floorId },
    orderBy: [{ unitNo: "asc" }, { id: "asc" }],
  });
  const byId = new Map(units.map((unit) => [unit.id, unit]));
  const usedNumbers = new Set(units.map((unit) => unit.unitNo));
  const claimed = new Set(
    Object.entries(bindings)
      .filter(([key]) => key.startsWith(`${floorId}:`))
      .map(([, id]) => id),
  );
  let sequence = 1;
  for (const shape of plan.shapes.filter((shape) => shape.kind === "unit")) {
    const key = regionBindingKey(floorId, plan.id, shape.id);
    const oldShape = previous?.shapes.find((item) => item.id === shape.id);
    let existing = bindings[key] ? byId.get(bindings[key]) : undefined;
    // One-time migration uses the previously saved slot, never the current shape order.
    if (!existing && !bindings[key] && oldShape?.unitSlot != null) {
      const legacy = units[oldShape.unitSlot];
      if (legacy && !claimed.has(legacy.id)) existing = legacy;
    }
    if (bindings[key] && !existing)
      throw new BuildingInputError(
        "Байрны бүртгэл олдсонгүй. Планыг дахин ачаална уу.",
      );
    const inventory = shape.inventory;
    if (existing) {
      const changed =
        oldShape &&
        JSON.stringify(oldShape.inventory) !== JSON.stringify(inventory);
      const data: Prisma.BarilgaUnitUpdateInput = {};
      if (!bindings[key] || (oldShape && oldShape.label !== shape.label))
        data.typeLabel = shape.label.trim();
      if (changed && inventory) {
        if (inventory.unitNo?.trim() && inventory.unitNo !== existing.unitNo) {
          if (usedNumbers.has(inventory.unitNo))
            throw new BuildingInputError(
              `«${inventory.unitNo}» тоот давхардсан байна.`,
            );
          usedNumbers.delete(existing.unitNo);
          usedNumbers.add(inventory.unitNo);
          data.unitNo = inventory.unitNo;
        }
        data.rooms = inventory.rooms;
        data.areaM2 = inventory.areaM2;
        if (existing.pricePerM2 !== null)
          data.priceTotal =
            inventory.areaM2 === null
              ? null
              : Math.round(
                  Number(existing.pricePerM2) * inventory.areaM2 * 100,
                ) / 100;
      }
      if (Object.keys(data).length)
        await tx.barilgaUnit.update({ where: { id: existing.id }, data });
    } else {
      let unitNo = inventory?.unitNo?.trim();
      if (unitNo && usedNumbers.has(unitNo))
        throw new BuildingInputError(`«${unitNo}» тоот давхардсан байна.`);
      while (!unitNo) {
        const candidate = `${number}${String(sequence++).padStart(2, "0")}`;
        if (!usedNumbers.has(candidate)) unitNo = candidate;
      }
      existing = await tx.barilgaUnit.create({
        data: {
          floorId,
          unitNo,
          typeLabel: shape.label.trim(),
          rooms: inventory?.rooms ?? null,
          areaM2: inventory?.areaM2 ?? null,
        },
      });
      usedNumbers.add(unitNo);
    }
    bindings[key] = existing.id;
    claimed.add(existing.id);
  }
  return bindings;
}
