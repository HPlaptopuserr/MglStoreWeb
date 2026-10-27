import { newUnit, type BlockDraft, type UnitDraft } from "./inventory-draft";

export interface FloorTemplate {
  id: string;
  name: string;
  units: UnitDraft[];
  floorIds: string[];
}
export function inferFloorTemplates(block: BlockDraft): FloorTemplate[] {
  const templates: FloorTemplate[] = [];
  for (const floor of block.floors) {
    if (!floor.units.length) continue;
    const signature = JSON.stringify(floor.units.map(({ typeLabel, rooms, areaM2 }) => [typeLabel, rooms, areaM2]));
    const existing = templates.find(template => JSON.stringify(template.units.map(({ typeLabel, rooms, areaM2 }) => [typeLabel, rooms, areaM2])) === signature);
    if (existing) existing.floorIds.push(floor.id);
    else templates.push({ id: crypto.randomUUID(), name: `Загвар ${templates.length + 1}`, units: structuredClone(floor.units), floorIds: [floor.id] });
  }
  return templates.length ? templates : [{ id: crypto.randomUUID(), name: "Загвар 1", units: [newUnit()], floorIds: [] }];
}
export function applyFloorTemplates(block: BlockDraft, templates: FloorTemplate[]): BlockDraft {
  return { ...block, floorTemplates: templates, floors: block.floors.map(floor => {
    const template = templates.find(item => item.floorIds.includes(floor.id));
    if (!template) return floor;
    return { ...floor, units: template.units.map((unit, index) => ({
      ...unit,
      id: floor.units[index]?.id ?? crypto.randomUUID(),
      unitNo: floor.units[index]?.unitNo || `${floor.number}${String(index + 1).padStart(2, "0")}`,
    })) };
  }) };
}
