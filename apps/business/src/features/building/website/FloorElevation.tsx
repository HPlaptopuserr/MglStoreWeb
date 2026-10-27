import type { WebsiteProject } from "@mgl/types/building-website";
import { TowerElevation } from "../euro-plaza/masterplan/TowerElevation";
type Floor = WebsiteProject["blocks"][number]["floors"][number];
export function FloorElevation({
  floors,
  selected,
  onSelect,
  fitToContainer = false,
}: {
  floors: Floor[];
  selected: number;
  onSelect: (floor: number) => void;
  fitToContainer?: boolean;
}) {
  return (
    <div className="default-facade-preview">
      <TowerElevation
        fitToContainer={fitToContainer}
        floorCount={floors.length}
        floorNumbers={[...floors]
          .sort((a, b) => b.number - a.number)
          .map((floor) => floor.number)}
        selected={selected}
        onSelect={onSelect}
      />
    </div>
  );
}
