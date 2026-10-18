import type { WebsiteProject } from "@mgl/types/building-website";
type Floor = WebsiteProject["blocks"][number]["floors"][number];
export function FloorElevation({
  floors,
  selected,
  onSelect,
}: {
  floors: Floor[];
  selected: number;
  onSelect: (floor: number) => void;
}) {
  const height = 100 + floors.length * 34;
  return (
    <div className="admin-elevation-scroll">
      <svg
        viewBox={`0 0 440 ${height}`}
        style={{ minHeight: Math.min(height, 1000) }}
        role="group"
        aria-label="Барилга дээрээс давхар сонгох"
      >
        <path
          d={`M98 42L334 16L386 44V${height - 32}L330 ${height - 8}L98 ${height - 32}Z`}
          fill="#d8cfb9"
        />
        <path
          d={`M334 16L386 44V${height - 32}L330 ${height - 8}Z`}
          fill="#706e60"
        />
        {floors.map((floor, index) => {
          const y = 48 + index * 34,
            available = floor.units.filter(
              (u) => u.status === "AVAILABLE",
            ).length;
          return (
            <g
              key={floor.id}
              role="button"
              tabIndex={0}
              aria-label={`${floor.number < 0 ? `B${-floor.number}` : `${floor.number} давхар`} сонгох, ${available} боломжтой`}
              aria-pressed={selected === floor.number}
              className={selected === floor.number ? "selected" : ""}
              onClick={() => onSelect(floor.number)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(floor.number);
                }
              }}
            >
              <rect x="109" y={y} width="218" height="28" fill="#24414b" />
              {Array.from({ length: 6 }, (_, col) => (
                <rect
                  key={col}
                  x={116 + col * 35}
                  y={y + 3}
                  width="25"
                  height="22"
                  fill={
                    floor.units[col]?.status === "SOLD"
                      ? "#9c6660"
                      : floor.units[col]?.status === "RESERVED"
                        ? "#c8aa69"
                        : "#73908c"
                  }
                />
              ))}
              <rect
                className="admin-floor-hit"
                x="100"
                y={y - 2}
                width="235"
                height="32"
              />
              <text
                x="88"
                y={y + 20}
                textAnchor="end"
                fill={selected === floor.number ? "#e1bd79" : "#8b9ea4"}
                fontSize="12"
              >
                {floor.number < 0
                  ? `B${-floor.number}`
                  : floor.number === 0
                    ? "Гадна"
                    : String(floor.number).padStart(2, "0")}
              </text>
              {selected === floor.number && (
                <text x="342" y={y + 20} fill="#e1bd79" fontSize="12">
                  ◀
                </text>
              )}
            </g>
          );
        })}
        <rect x="180" y={height - 42} width="58" height="33" fill="#183940" />
      </svg>
    </div>
  );
}
