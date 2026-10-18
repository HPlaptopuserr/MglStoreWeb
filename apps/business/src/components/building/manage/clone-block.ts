import type { BlockDraft } from "./inventory-draft";

/** Copy configuration with independent IDs and remap template assignments. */
export function cloneBlock(source: BlockDraft, existingNames: string[]): BlockDraft {
  const copy = structuredClone(source);
  const floorIds = new Map(copy.floors.map(floor => [floor.id, crypto.randomUUID()]));
  let sequence = 1;
  let name = source.name + " — хуулбар";
  while (existingNames.some(existing => existing.trim().toLowerCase() === name.toLowerCase())) {
    name = source.name + " — хуулбар " + ++sequence;
  }
  return {
    ...copy, id: crypto.randomUUID(), name,
    types: copy.types.map(type => ({ ...type, id: crypto.randomUUID() })),
    floors: copy.floors.map(floor => ({
      ...floor, id: floorIds.get(floor.id)!,
      units: floor.units.map(unit => ({ ...unit, id: crypto.randomUUID() })),
    })),
    floorTemplates: copy.floorTemplates?.map(template => ({
      ...template, id: crypto.randomUUID(),
      units: template.units.map(unit => ({ ...unit, id: crypto.randomUUID() })),
      floorIds: template.floorIds.flatMap(id => { const next = floorIds.get(id); return next ? [next] : []; }),
    })),
    facade: copy.facade ? {
      ...copy.facade,
      regions: copy.facade.regions.map(region => ({ ...region, id: crypto.randomUUID() })),
      floorRegions: copy.facade.floorRegions?.map(region => ({ ...region, id: crypto.randomUUID() })),
    } : undefined,
  };
}
