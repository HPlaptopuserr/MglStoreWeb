import { randomUUID } from "node:crypto";
import { BuildingInputError } from "./project-input";
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new BuildingInputError("Блок, давхар, байрны мэдээлэл буруу байна");
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max: number) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    throw new BuildingInputError(
      `${label} шаардлагатай (хамгийн ихдээ ${max} тэмдэгт)`,
    );
  return value.trim();
}
function integer(value: unknown, label: string, min: number, max: number) {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  )
    throw new BuildingInputError(
      `${label}: ${min}–${max} бүхэл тоо оруулна уу`,
    );
  return value;
}
/** Validate the complete inventory before the atomic nested project write. */
export function parseBuildingBlocks(value: unknown) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 20)
    throw new BuildingInputError("Нэг төсөлд 20 хүртэл блок бүртгэнэ");
  const names = new Set<string>();
  let total = 0;
  return value.map((item: unknown, sortOrder) => {
    const block = record(item);
    const name = text(block.name, "Блокийн нэр / дугаар", 100);
    if (names.has(name.toLowerCase()))
      throw new BuildingInputError("Блокийн нэр / дугаар давхардсан байна");
    names.add(name.toLowerCase());
    if (
      !Array.isArray(block.floors) ||
      !block.floors.length ||
      block.floors.length > 100
    )
      throw new BuildingInputError(
        `${name}: 1–100 давхрын мэдээлэл оруулна уу`,
      );
    const numbers = new Set<number>();
    const unitNumbers = new Set<string>();
    const floors = block.floors.map((item: unknown) => {
      const floor = record(item);
      const number = integer(floor.number, "Давхрын дугаар", -10, 200);
      if (numbers.has(number))
        throw new BuildingInputError(
          `${name}: ${number}-р давхар давхардсан байна`,
        );
      numbers.add(number);
      if (
        !Array.isArray(floor.units) ||
        floor.units.length > 50
      )
        throw new BuildingInputError(
          `${name}, ${number}-р давхар: 50 хүртэл байр оруулна уу`,
        );
      total += floor.units.length;
      if (total > 2000)
        throw new BuildingInputError("Нэг удаад нийт 2000 хүртэл байр үүсгэнэ");
      const units = floor.units.map((item: unknown) => {
        const unit = record(item);
        const unitNo = text(unit.unitNo, "Байрны тоот", 30);
        if (unitNumbers.has(unitNo.toLowerCase()))
          throw new BuildingInputError(
            `${name}: ${unitNo} тоот давхардсан байна`,
          );
        unitNumbers.add(unitNo.toLowerCase());
        const typeLabel = text(unit.typeLabel, `${unitNo} тоотын төрөл`, 100);
        const rooms = integer(unit.rooms, `${unitNo} тоотын өрөө`, 1, 20);
        const area = unit.areaM2;
        if (
          typeof area !== "number" ||
          !Number.isFinite(area) ||
          area <= 0 ||
          area > 10000 ||
          Math.abs(area * 100 - Math.round(area * 100)) > 0.00001
        )
          throw new BuildingInputError(
            `${unitNo} тоотын м²-ийг 0.01–10000 хооронд, 2 орны нарийвчлалтай оруулна уу`,
          );
        return { unitNo, typeLabel, rooms, areaM2: area, published: false };
      });
      return { number, units: { create: units } };
    });
    return { id: randomUUID(), name, sortOrder, floors: { create: floors } };
  });
}
