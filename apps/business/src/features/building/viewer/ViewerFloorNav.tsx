import { floorLabel } from "../sales/demo-inventory";
export const viewerFloors = Array.from(
  { length: 16 },
  (_, index) => index + 1,
).concat([-1, -2, 0]);
export function ViewerFloorNav({
  floors = viewerFloors,
  floor,
  onChange,
  compact = false,
}: {
  floors?: number[];
  compact?: boolean;
  floor: number;
  onChange: (floor: number) => void;
}) {
  return (
    <nav
      className={`viewer-floor-nav${compact ? " viewer-floor-nav-compact" : ""}`}
      aria-label="Давхар сонгох"
    >
      <h2>ДАВХАР</h2>
      <div>
        {floors.map((value) => (
          <button
            key={value}
            onClick={() => onChange(value)}
            aria-label={floorLabel(value)}
            aria-pressed={floor === value}
            className={floor === value ? "active" : ""}
          >
            {value > 0 ? value : value < 0 ? `B${-value}` : "P"}
          </button>
        ))}
      </div>
    </nav>
  );
}
