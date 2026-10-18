interface Props {
  floorCount: number;
  selected: number | null;
  onSelect: (floor: number) => void;
}

/** Architectural illustration based on the supplied blue/orange masterplan.
 * Floors align with the interactive bands; this is not a surveyed elevation.
 */
export function TowerElevation({ floorCount, selected, onSelect }: Props) {
  const floorHeight = 32;
  const roof = 65;
  const ground = roof + floorCount * floorHeight;
  return (
    <svg
      className="tower-elevation"
      viewBox={`0 0 640 ${ground + 54}`}
      role="group"
      aria-label="Барилгын фасад дээрээс давхар сонгох"
    >
      <defs>
        <linearGradient id="tower-glass" x2="1" y2="1">
          <stop stopColor="#79b6d8" />
          <stop offset=".48" stopColor="#a9d1e2" />
          <stop offset="1" stopColor="#3f739a" />
        </linearGradient>
        <linearGradient id="tower-wall">
          <stop stopColor="#c3d1d6" />
          <stop offset=".45" stopColor="#f2f1e9" />
          <stop offset="1" stopColor="#d1d9d6" />
        </linearGradient>
      </defs>
      <ellipse cx="342" cy={ground + 27} rx="248" ry="18" fill="#063d5538" />
      <path
        d={`M142 60L500 60L548 83V${ground + 19}L500 ${ground + 30}L142 ${ground + 30}Z`}
        fill="#356780"
      />
      <path
        d={`M500 60L548 83V${ground + 19}L500 ${ground + 30}Z`}
        fill="#668895"
      />
      <rect
        x="142"
        y="60"
        width="358"
        height={ground - 30}
        fill="url(#tower-wall)"
      />
      <rect x="149" y="60" width="49" height={ground - 30} fill="#2679a4" />
      <rect x="443" y="60" width="49" height={ground - 30} fill="#2679a4" />
      <rect x="298" y="60" width="45" height={ground - 30} fill="#dc8b39" />
      <path d="M132 48H506L554 71H538L500 59H144Z" fill="#ed9b44" />
      <path d="M144 36H491L506 48H132Z" fill="#e0ded4" />
      <path d="M132 48H506V59H132Z" fill="#e29745" />
      <path d="M262 11H365L388 28H285Z" fill="#eee9db" />
      <path d="M285 28H388V46H285Z" fill="#bac6c8" />
      <path d="M262 11V31L285 46V28Z" fill="#91a4ad" />
      <path
        d="M259 8H367L392 25H285Z"
        fill="none"
        stroke="#e39036"
        strokeWidth="7"
      />
      {Array.from({ length: floorCount }, (_, index) => {
        const floor = floorCount - index;
        const y = roof + index * floorHeight;
        return (
          <g
            key={floor}
            className={`tower-floor${floor === selected ? " is-selected" : ""}`}
            role="button"
            tabIndex={0}
            aria-label={`${floor} давхар сонгох`}
            aria-pressed={floor === selected}
            onClick={() => onSelect(floor)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(floor);
              }
            }}
          >
            <path
              d={`M142 ${y + 29}H500L548 ${y + 47}`}
              fill="none"
              stroke="#a8b5b8"
              strokeWidth="2"
            />
            {[157, 207, 255, 306, 354, 402, 451].map((x, column) => (
              <g key={x}>
                <rect
                  x={x}
                  y={y + 4}
                  width={column === 3 ? 28 : 32}
                  height="23"
                  fill="url(#tower-glass)"
                  stroke="#e7f1f3"
                  strokeWidth="2"
                />
                <path
                  d={`M${x + 16} ${y + 4}V${y + 27}M${x} ${y + 17}H${x + 32}`}
                  stroke="#547e96"
                  strokeWidth="1"
                />
              </g>
            ))}
            <path
              d={`M514 ${y + 12}l20 9v22l-20 -9Z`}
              fill="#81b6c9"
              stroke="#b5d0d9"
            />
            <rect
              className="tower-floor-band"
              x="70"
              y={y}
              width="510"
              height={floorHeight}
            />
            <text x="90" y={y + 21} fill="white" fontSize="12" fontWeight="700">
              {floor}
            </text>
            <path
              className="tower-floor-arrow"
              d={`M564 ${y + 10}l-8 6 8 6`}
              fill="none"
              stroke="white"
              strokeWidth="2"
            />
          </g>
        );
      })}
      <rect x="130" y={ground} width="382" height="29" fill="#284d5d" />
      <rect
        x="278"
        y={ground - 4}
        width="80"
        height="33"
        fill="#86b4c0"
        stroke="#e4ece8"
        strokeWidth="3"
      />
      <path d={`M318 ${ground - 4}v33`} stroke="#eee" strokeWidth="2" />
      <path
        d={`M264 ${ground - 10}H368L381 ${ground - 3}H254Z`}
        fill="#e0dfd3"
      />
      <rect x="117" y={ground + 29} width="427" height="7" fill="#b5c6c6" />
    </svg>
  );
}
