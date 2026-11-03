import { Prisma } from "@mgl/database";
import {
  parseBuildingFacade,
  parseInventoryTemplates,
  readWebsiteRecord,
} from "@mgl/types/building-website";
import { BuildingInputError } from "./project-input";
interface BlockStructure {
  id: string;
  floors: {
    create: Array<{
      number: number;
      units: { create: Array<{ unitNo: string }> };
    }>;
  };
}
export function withBuildingFacades(
  raw: unknown,
  blocks: BlockStructure[],
  documents: Prisma.JsonValue | null = null,
): Prisma.InputJsonValue {
  const website = readWebsiteRecord(documents),
    previousFacades = website.facadesByBlock ?? {},
    previousPlans = website.plansByBlock;
  const previousTemplates = website.inventoryTemplatesByBlock ?? {};
  website.inventoryTemplatesByBlock = {};
  website.facadesByBlock = {};
  website.plansByBlock = {};
  if (!Array.isArray(raw))
    throw new BuildingInputError("Блокийн мэдээлэл шаардлагатай");
  blocks.forEach((block, index) => {
    const input = raw[index] as Record<string, unknown>;
    const previousId = typeof input.id === "string" ? input.id : "";
    const templates = input.inventoryTemplates ?? previousTemplates[previousId];
    if (templates) {
      try {
        const parsed = parseInventoryTemplates(templates);
        if (parsed.some(template => template.floorNumbers.some(number => !block.floors.create.some(floor => floor.number === number))))
          throw new Error("Загварт оноосон давхар байхгүй байна.");
        website.inventoryTemplatesByBlock![block.id] = parsed;
      } catch (error) {
        throw new BuildingInputError(error instanceof Error ? error.message : "Загвар буруу байна.");
      }
    }
    const value = input.facade ?? previousFacades[previousId];
    if (value) {
      try {
        const facade = parseBuildingFacade(value);
        if (
          facade.regions.some(
            (region) =>
              !block.floors.create.some(
                (floor) =>
                  floor.number === region.floor &&
                  floor.units.create.some(
                    (unit) => unit.unitNo === region.unitNo,
                  ),
              ),
          )
        )
          throw new Error(
            "Зураг дээрх байрны тоот эсвэл давхар өөрчлөгдсөн байна. Хүрээний холбоосоо шинэчилнэ үү.",
          );
        if (facade.floorRegions?.some(region => !block.floors.create.some(floor => floor.number === region.floor)))
          throw new Error("Фасадын давхрын дугаарыг шалгана уу.");
        website.facadesByBlock![block.id] = facade;
      } catch (error) {
        throw new BuildingInputError(
          error instanceof Error ? error.message : "Барилгын зураг буруу байна",
        );
      }
    }
    if (previousPlans[previousId])
      website.plansByBlock[block.id] = previousPlans[previousId];
  });
  if (JSON.stringify(website).length > 15_000_000)
    throw new BuildingInputError(
      "Төслийн зураг, план нийт 15 MB-аас хэтэрсэн байна.",
    );
  const existing =
    documents && typeof documents === "object" && !Array.isArray(documents)
      ? documents
      : {};
  return JSON.parse(
    JSON.stringify({ ...existing, website }),
  ) as Prisma.InputJsonValue;
}
