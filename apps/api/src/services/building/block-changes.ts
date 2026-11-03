import { parseBuildingBlocks } from "./block-input";
import { BuildingInputError } from "./project-input";

interface ExistingBlock {
  id: string;
  name: string;
  floors: Array<{ number: number; units: Array<{ unitNo: string }> }>;
}

/** Unchanged inventory is referenced by its scoped ID, never regenerated from a form snapshot. */
export function parseBlockChanges(value: unknown, existing: ExistingBlock[]) {
  if (!Array.isArray(value) || !value.length || value.length > 20)
    throw new BuildingInputError("Төсөлд 1–20 блок бүртгэнэ.");
  const names = new Set<string>();
  const ids = new Set<string>();
  let createdUnits = 0;
  return value.map((item: unknown, sortOrder) => {
    if (!item || typeof item !== "object" || Array.isArray(item))
      throw new BuildingInputError("Блокийн мэдээлэл буруу байна.");
    const input = item as Record<string, unknown>;
    if (
      typeof input.name !== "string" ||
      !input.name.trim() ||
      input.name.trim().length > 100
    )
      throw new BuildingInputError("Блокийн нэрийг зөв оруулна уу.");
    const name = input.name.trim();
    if (names.has(name.toLowerCase()))
      throw new BuildingInputError("Блокийн нэр давхардсан байна.");
    names.add(name.toLowerCase());
    if (typeof input.id === "string") {
      if (ids.has(input.id))
        throw new BuildingInputError("Блок давхардсан байна.");
      ids.add(input.id);
    }
    if (input.preserveInventory === true) {
      const previous = existing.find((block) => block.id === input.id);
      if (!previous)
        throw new BuildingInputError(
          "Хадгалсан блок энэ төсөлд байхгүй байна.",
        );
      return {
        kind: "preserve" as const,
        input,
        block: {
          id: previous.id,
          name,
          sortOrder,
          floors: {
            create: previous.floors.map((floor) => ({
              number: floor.number,
              units: {
                create: floor.units.map((unit) => ({ unitNo: unit.unitNo })),
              },
            })),
          },
        },
      };
    }
    const block = parseBuildingBlocks([input])[0];
    createdUnits += block.floors.create.reduce(
      (total, floor) => total + floor.units.create.length,
      0,
    );
    if (createdUnits > 2000)
      throw new BuildingInputError("Нэг удаад 2000 хүртэл шинэ байр бүртгэнэ.");
    return { kind: "replace" as const, input, block: { ...block, sortOrder } };
  });
}
