import type { FloorPlan } from "./floor-plans";
import type { WebsiteProject } from "@mgl/types/building-website";

export interface InventoryCounts {
  total: number;
  sold: number;
  unsold: number;
  available: number;
  reserved: number;
  other: number;
}
export interface FloorInventory {
  number: number;
  plan?: FloorPlan;
  counts: InventoryCounts | null;
}
export interface MapBlock {
  key: string;
  label: string;
  x: number;
  y: number;
}
export interface BlockInventory {
  id: string;
  name: string;
  floors: FloorInventory[];
  counts: InventoryCounts | null;
  reportedFloorCount?: number;
  reportedUnitCount?: number;
  plannedUnitCount?: number;
  note?: string;
  layoutsHref?: string;
  href?: string;
}
export interface MasterplanInventory {
  mode: "provisional" | "live" | "error";
  blocks: Record<string, BlockInventory>;
}

/** Percent coordinates use the full 1672 × 941 source image, without cropping.
 * B01–B12 are provisional map labels; never infer database IDs by list order.
 */
export const mapBlocks: readonly MapBlock[] = [
  { key: "B01", label: "B01", x: 20, y: 51 },
  { key: "B02", label: "B02", x: 29, y: 34 },
  { key: "B03", label: "B03", x: 36, y: 21 },
  { key: "B04", label: "Евро Плаза", x: 44, y: 67 },
  { key: "B05", label: "B05", x: 50, y: 54 },
  { key: "B06", label: "B06", x: 57, y: 44 },
  { key: "B07", label: "B07", x: 63, y: 37 },
  { key: "B08", label: "B08", x: 47, y: 30 },
  { key: "B09", label: "B09", x: 48, y: 18 },
  { key: "B10", label: "B10", x: 54, y: 10 },
  { key: "B11", label: "B11", x: 59, y: 16 },
  { key: "B12", label: "B12", x: 67, y: 10 },
];

export function countUnits(
  units: readonly { status: string }[],
): InventoryCounts {
  const sold = units.filter((unit) => unit.status === "SOLD").length;
  const available = units.filter((unit) => unit.status === "AVAILABLE").length;
  const reserved = units.filter((unit) =>
    ["RESERVED", "CONTRACT_PENDING"].includes(unit.status),
  ).length;
  return {
    total: units.length,
    sold,
    unsold: units.length - sold,
    available,
    reserved,
    other: units.length - sold - available - reserved,
  };
}

export function sumCounts(
  floors: readonly { counts: InventoryCounts }[],
): InventoryCounts {
  return floors.reduce(
    (sum, floor) => ({
      total: sum.total + floor.counts.total,
      sold: sum.sold + floor.counts.sold,
      unsold: sum.unsold + floor.counts.unsold,
      available: sum.available + floor.counts.available,
      reserved: sum.reserved + floor.counts.reserved,
      other: sum.other + floor.counts.other,
    }),
    countUnits([]),
  );
}

/** Only explicit matching names bind physical map markers to published blocks. */
export function mapPublishedInventory(
  project: WebsiteProject,
): MasterplanInventory {
  const blocks: Record<string, BlockInventory> = {};
  for (const marker of mapBlocks) {
    const block = project.blocks.find(
      (item) => item.name === marker.key || item.name === marker.label,
    );
    if (!block) continue;
    const floors = block.floors
      .map((floor) => ({
        number: floor.number,
        counts: countUnits(floor.units.filter((unit) => unit.published)),
      }))
      .sort((a, b) => b.number - a.number);
    blocks[marker.key] = {
      id: block.id,
      name: block.name,
      floors,
      counts: sumCounts(floors),
      href: `/building/projects/${encodeURIComponent(project.id)}?block=${encodeURIComponent(block.id)}`,
    };
  }
  return { mode: "live", blocks };
}
