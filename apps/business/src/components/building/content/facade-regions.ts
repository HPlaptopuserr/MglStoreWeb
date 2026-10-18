import type { BuildingFacade } from "@mgl/types/building-website";

type FloorRegion = NonNullable<BuildingFacade["floorRegions"]>[number];

/** Same initial frame used by the facade editor for legacy images without regions. */
export function defaultFacadeRegions(floors: number[]): FloorRegion[] {
  const ordered = [...new Set(floors)].sort((a, b) => b - a);
  const height = 600 / Math.max(1, ordered.length);
  return ordered.map((floor, index) => ({
    id: `facade-floor-${floor}`, floor, x: 250, y: 100 + index * height,
    width: 500, height,
  }));
}

export function resolveFacadeRegions(facade: BuildingFacade, floors: number[]): FloorRegion[] {
  const defaults = defaultFacadeRegions(floors);
  return floors.flatMap(floor => {
    const explicit = facade.floorRegions?.filter(region => region.floor === floor) ?? [];
    if (explicit.length) return explicit;
    const units = facade.regions.filter(region => region.floor === floor);
    return units.length ? units : defaults.filter(region => region.floor === floor);
  });
}
