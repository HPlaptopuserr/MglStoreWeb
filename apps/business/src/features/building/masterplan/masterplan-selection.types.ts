import type { ProjectMasterplan } from "@mgl/types/building-website";

export interface SelectableBlock {
  id: string;
  name: string;
  floorCount: number;
}

/** Keep inventory, plan libraries and other project documents out of the map payload. */
export interface MasterplanSelection {
  title: string;
  masterplan: ProjectMasterplan | undefined;
  blocks: SelectableBlock[];
}
