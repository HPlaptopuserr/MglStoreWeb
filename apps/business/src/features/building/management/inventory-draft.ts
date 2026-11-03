import type { FloorTemplate } from "./floor-templates";
import type { BuildingFacade } from "@mgl/types/building-website";
export interface UnitDraft {
  id: string;
  unitNo: string;
  typeLabel: string;
  rooms: string;
  areaM2: string;
}
export interface UnitTypeDraft extends Omit<UnitDraft, "unitNo"> {
  count: string;
  fromFloor?: string;
  toFloor?: string;
}
export interface FloorDraft {
  id: string;
  number: string;
  units: UnitDraft[];
}
export interface BlockDraft {
  floorTemplates?: FloorTemplate[];
  facade?: BuildingFacade;
  id: string;
  name: string;
  floorCount: string;
  types: UnitTypeDraft[];
  floors: FloorDraft[];
}
export function newUnit(): UnitDraft {
  return {
    id: crypto.randomUUID(),
    unitNo: "",
    typeLabel: "",
    rooms: "",
    areaM2: "",
  };
}
export function newType(): UnitTypeDraft {
  return {
    id: crypto.randomUUID(),
    typeLabel: "",
    rooms: "",
    areaM2: "",
    count: "1",
  };
}
export function generateFloors(block: BlockDraft): FloorDraft[] {
  const count = Number(block.floorCount);
  if (!Number.isInteger(count) || count < 1 || count > 100)
    throw new Error("Давхрын тоо 1–100 байна.");
  if (!block.types.length)
    throw new Error("Дор хаяж нэг байрны төрөл нэмнэ үү.");
  let perFloor = 0;
  for (const type of block.types) {
    const rooms = Number(type.rooms),
      area = Number(type.areaM2),
      quantity = Number(type.count);
    if (
      !Number.isInteger(rooms) ||
      rooms < 1 ||
      rooms > 20 ||
      !Number.isFinite(area) ||
      area <= 0 ||
      area > 10000 ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 50
    )
      throw new Error(
        "Төрөл бүрийн нэр, өрөө (1–20), талбай (0–10000 м²), тоо (1–50)-г зөв оруулна уу.",
      );
    const from = Number(type.fromFloor || 1),
      to = Number(type.toFloor || count);
    if (
      !Number.isInteger(from) ||
      !Number.isInteger(to) ||
      from < 1 ||
      to > count ||
      from > to
    )
      throw new Error("Төрөл бүрийн эхлэх, дуусах давхрыг шалгана уу.");
    perFloor += quantity;
  }
  if (perFloor > 50 || perFloor * count > 2000)
    throw new Error("Нэг давхарт 50, нэг блокт 2000 хүртэл байр үүсгэнэ.");
  return Array.from({ length: count }, (_, index) => {
    let sequence = 0;
    return {
      id: crypto.randomUUID(),
      number: String(index + 1),
      units: block.types
        .filter(
          (type) =>
            index + 1 >= Number(type.fromFloor || 1) &&
            index + 1 <= Number(type.toFloor || count),
        )
        .flatMap((type) =>
          Array.from({ length: Number(type.count) }, () => ({
            id: crypto.randomUUID(),
            unitNo: `${index + 1}${String(++sequence).padStart(2, "0")}`,
            typeLabel:
              type.typeLabel.trim() || `${type.rooms} өрөө · ${type.areaM2} м²`,
            rooms: type.rooms,
            areaM2: type.areaM2,
          })),
        ),
    };
  });
}
function hasSameInventory(block: BlockDraft, existing: BlockDraft[]) {
  const previous = existing.find((item) => item.id === block.id);
  return (
    previous !== undefined &&
    JSON.stringify(previous.floors) === JSON.stringify(block.floors)
  );
}
export function serializeBlocks(
  blocks: BlockDraft[],
  existing: BlockDraft[] = [],
) {
  return blocks.map((block) => ({
    id: block.id,
    name: block.name,
    preserveInventory: hasSameInventory(block, existing),
    facade: block.facade,
    inventoryTemplates: (block.floorTemplates ?? []).map(
      ({ floorIds, ...template }) => ({
        ...template,
        floorNumbers: block.floors
          .filter((floor) => floorIds.includes(floor.id))
          .map((floor) => Number(floor.number)),
      }),
    ),
    floors: hasSameInventory(block, existing)
      ? undefined
      : block.floors.map((floor) => ({
          number: Number(floor.number),
          units: floor.units.map((unit) => ({
            unitNo: unit.unitNo,
            typeLabel: unit.typeLabel,
            rooms: Number(unit.rooms),
            areaM2: Number(unit.areaM2),
          })),
        })),
  }));
}

export function inventoryError(
  blocks: BlockDraft[],
  existing: BlockDraft[] = [],
): string | null {
  if (!blocks.length) return "Дор хаяж нэг блок нэмнэ үү.";
  const names = new Set<string>();
  let total = 0;
  for (const block of blocks) {
    const name = block.name.trim().toLowerCase();
    if (!name) return "Блокийн нэр / дугаарыг оруулна уу.";
    if (names.has(name)) return `${block.name}: блокийн нэр давхардсан байна.`;
    names.add(name);
    if (!block.floors.length)
      return `${block.name}: давхар, байруудаа үүсгэнэ үү.`;
    // Existing parking/storage inventory has its own limits and remains unchanged.
    if (hasSameInventory(block, existing)) continue;
    const numbers = new Set<number>(),
      units = new Set<string>();
    for (const floor of block.floors) {
      const number = Number(floor.number);
      if (
        !floor.number.trim() ||
        !Number.isInteger(number) ||
        number < -10 ||
        number > 200 ||
        numbers.has(number)
      )
        return `${block.name}: давхрын дугаарыг шалгана уу.`;
      numbers.add(number);
      if (floor.units.length > 50)
        return `${block.name}, ${number}-р давхарт 50 хүртэл байр байна.`;
      for (const unit of floor.units) {
        const key = unit.unitNo.trim().toLowerCase(),
          rooms = Number(unit.rooms),
          area = Number(unit.areaM2);
        if (!key || units.has(key))
          return `${block.name}: ${unit.unitNo || "хоосон"} тоотыг шалгана уу. Тоот давхардахгүй байна.`;
        units.add(key);
        if (
          !unit.typeLabel.trim() ||
          !Number.isInteger(rooms) ||
          rooms < 1 ||
          rooms > 20 ||
          !Number.isFinite(area) ||
          area <= 0 ||
          area > 10000 ||
          Math.abs(area * 100 - Math.round(area * 100)) > 0.00001
        )
          return `${block.name}, ${unit.unitNo} тоот: төрөл, өрөө, м²-ийг зөв бөглөнө үү.`;
      }
      total += floor.units.length;
    }
  }
  return total > 2000 ? "Нэг удаад 2000 хүртэл байр бүртгэнэ." : null;
}
