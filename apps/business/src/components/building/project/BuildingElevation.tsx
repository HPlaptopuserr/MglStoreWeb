import type { SalesUnit } from "../sales/demo-inventory";
export function BuildingElevation({
  floor,
  units,
  onSelect,
}: {
  floor: number;
  units: SalesUnit[];
  onSelect: (floor: number) => void;
}) {
  return (
    <svg
      className="residence-elevation"
      viewBox="0 0 480 680"
      role="group"
      aria-label="Барилга дээрээс давхар сонгох"
    >
      <defs>
        <linearGradient id="elevation-side" x1="0" x2="1">
          <stop offset="0" stopColor="#897963" />
          <stop offset="1" stopColor="#4f5149" />
        </linearGradient>
        <linearGradient id="elevation-glass" x1="0" x2="1">
          <stop offset="0" stopColor="#40626a" />
          <stop offset="1" stopColor="#223c46" />
        </linearGradient>
      </defs>
      <ellipse cx="250" cy="634" rx="198" ry="24" fill="#00000028" />
      <path d="M104 60L360 30L415 61V615L355 641L104 615Z" fill="#bcb5a5" />
      <path d="M360 30L415 61V615L355 641Z" fill="url(#elevation-side)" />
      <path d="M115 59L355 31V611L115 604Z" fill="#e1d7c2" />
      {Array.from({ length: 16 }, (_, i) => 16 - i).map((value, index) => {
        const y = 65 + index * 33;
        const available = units.filter(
          (unit) => unit.floor === value && unit.status === "available",
        ).length;
        return (
          <g
            key={value}
            tabIndex={0}
            role="button"
            aria-label={`${value} давхар сонгох, ${available} боломжтой`}
            aria-pressed={floor === value}
            className={`elevation-floor ${value < 4 ? "retail" : ""} ${floor === value ? "selected" : ""}`}
            onMouseEnter={() => onSelect(value)}
            onFocus={() => onSelect(value)}
            onClick={() => onSelect(value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(value);
              }
            }}
          >
            <rect
              x="118"
              y={y}
              width="236"
              height="29"
              fill="url(#elevation-glass)"
            />
            {Array.from({ length: value > 3 ? 6 : 4 }, (_, col) => (
              <g key={col}>
                <rect
                  x={124 + col * (value > 3 ? 38 : 57)}
                  y={y + 3}
                  width={value > 3 ? 27 : 44}
                  height="23"
                  fill={(col + index) % 5 === 0 ? "#d4ac66" : "#617c7e"}
                />
                <path
                  d={`M${133 + col * (value > 3 ? 38 : 57)} ${y + 3}V${y + 26}`}
                  stroke="#bac2b2"
                  strokeWidth="1"
                />
              </g>
            ))}
            <rect
              className="elevation-floor-hit"
              x="112"
              y={y - 1}
              width="248"
              height="32"
            />
            <text
              x="92"
              y={y + 20}
              textAnchor="end"
              fill={floor === value ? "#e4ba71" : "#687982"}
              fontSize="11"
              fontWeight="700"
            >
              {String(value).padStart(2, "0")}
            </text>
            {floor === value && (
              <g>
                <path
                  d={`M362 ${y + 7}L371 ${y + 14}L362 ${y + 21}`}
                  fill="#e4ba71"
                />
                <text x="378" y={y + 19} fill="#e4ba71" fontSize="12">
                  {value}F
                </text>
              </g>
            )}
          </g>
        );
      })}
      <path d="M105 602H362V630H105Z" fill="#b0a28a" />
      <rect x="202" y="600" width="64" height="34" fill="#1c3640" />
      <path d="M235 600V634" stroke="#c8b795" />
      <text
        x="241"
        y="668"
        textAnchor="middle"
        fontSize="9"
        letterSpacing="2"
        fill="#788c93"
      >
        A БЛОК · ДАВХАР СОНГОХ ЖИШЭЭ СХЕМ
      </text>
    </svg>
  );
}
