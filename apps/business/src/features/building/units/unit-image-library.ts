import type {
  BuildingUnitContent,
  WebsiteProject,
} from "@mgl/types/building-website";

export interface UnitImageSource {
  unitId: string;
  label: string;
  floorNumber: number;
  rooms: number | null;
  areaM2: string | number | null;
  content: BuildingUnitContent;
}
export function unitImageSources(
  project: WebsiteProject,
  excludeUnitId: string,
): UnitImageSource[] {
  return project.blocks.flatMap((block) =>
    block.floors.flatMap((floor) =>
      floor.units.flatMap((unit) => {
        const content = project.website.unitContent?.[unit.id];
        if (
          unit.id === excludeUnitId ||
          !content ||
          (!content.layout2d && !content.layout3d)
        )
          return [];
        return [
          {
            unitId: unit.id,
            label: `${block.name} · ${floor.number}-р давхар · № ${unit.unitNo}${unit.typeLabel ? ` · ${unit.typeLabel}` : ""}`,
            floorNumber: floor.number,
            rooms: unit.rooms,
            areaM2: unit.areaM2,
            content,
          },
        ];
      }),
    ),
  );
}
/** Copy media only; prices, descriptions and publication settings belong to the target unit. */
export function copyUnitLayouts(
  target: BuildingUnitContent,
  source: BuildingUnitContent,
): BuildingUnitContent {
  return {
    ...target,
    layout2d: source.layout2d || target.layout2d,
    layout3d: source.layout3d || target.layout3d,
  };
}
