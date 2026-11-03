import { useId } from "react";
import type { SalesUnit } from "../sales/demo-inventory";
import { statusLabels } from "../sales/demo-inventory";
import { PlanFurniture } from "./PlanFurniture";
const positions = [
  { x: 70, y: 60 },
  { x: 390, y: 60 },
  { x: 70, y: 330 },
  { x: 390, y: 330 },
];
export function InteractiveFloorPlan({
  units,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
}: {
  units: SalesUnit[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const patternId = useId();
  return (
    <svg
      className="viewer-plan"
      viewBox="0 0 700 620"
      role="group"
      aria-label="Давхрын интерактив жишээ план"
    >
      <defs>
        <pattern
          id={patternId}
          width="25"
          height="12"
          patternUnits="userSpaceOnUse"
        >
          <rect width="25" height="12" fill="#c4b69e" />
          <path d="M0 0H25M0 12H25M12 0V12" stroke="#b2a38e" strokeWidth=".7" />
        </pattern>
      </defs>
      <g className="plan-building">
        <path
          d="M58 48H642V552H58Z"
          fill="#e5e0d5"
          stroke="#85918e"
          strokeWidth="5"
        />
        <path
          d="M310 57H390V275H630V325H390V543H310V325H70V275H310Z"
          fill="#929991"
        />
        <path
          d="M318 280H382V320H318Z"
          fill="#333f40"
          stroke="#d2d5ce"
          strokeWidth="3"
        />
        <path
          d="M325 287H346V314H325ZM353 287H374V314H353Z"
          fill="#758283"
          stroke="#d2d5ce"
        />
        <text x="350" y="304" textAnchor="middle" fill="#f0f0df" fontSize="6">
          ЛИФТ
        </text>
        <path
          d="M327 170H373V246H327Z"
          fill="#7b837c"
          stroke="#d0d4c9"
          strokeWidth="3"
        />
        {Array.from({ length: 9 }, (_, i) => (
          <path
            key={i}
            d={`M328 ${175 + i * 8}H373`}
            stroke="#c6cabb"
            strokeWidth="2"
          />
        ))}
        <text
          x="350"
          y="370"
          textAnchor="middle"
          fill="#e3e7dd"
          fontSize="9"
          transform="rotate(90 350 370)"
        >
          НИЙТИЙН КОРИДОР
        </text>
        {units.map((unit, index) => {
          const position = positions[index];
          if (!position) return null;
          const active = selectedId === unit.id || hoveredId === unit.id;
          return (
            <g
              key={unit.id}
              transform={`translate(${position.x} ${position.y})`}
              role="button"
              tabIndex={0}
              aria-label={`План № ${unit.number}, ${unit.rooms} өрөө, ${unit.area} м², ${statusLabels[unit.status]}`}
              aria-pressed={selectedId === unit.id}
              className={`plan-unit ${unit.status} ${active ? "active" : ""}`}
              onMouseEnter={() => onHover(unit.id)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(unit.id)}
              onBlur={() => onHover(null)}
              onClick={() => onSelect(unit.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(unit.id);
                }
              }}
            >
              <title>{`№ ${unit.number} · ${unit.area} м² · ${statusLabels[unit.status]}`}</title>
              <rect
                width="240"
                height="210"
                fill={`url(#${patternId})`}
                stroke="#eee9dc"
                strokeWidth="5"
              />
              <PlanFurniture rooms={unit.rooms ?? 1} />
              <rect className="plan-status-overlay" width="240" height="210" />
              <path d="M10 210H230" stroke="#92bec4" strokeWidth="6" />
              <rect
                className="plan-unit-label"
                x="40"
                y="214"
                width="160"
                height="28"
                rx="4"
              />
              <text
                x="120"
                y="232"
                textAnchor="middle"
                fill="#fff"
                fontSize="11"
                fontWeight="700"
              >
                № {unit.number} · {unit.area} м²
              </text>
            </g>
          );
        })}
      </g>
      <text x="350" y="594" textAnchor="middle" fill="#8d98a9" fontSize="10">
        ЖИШЭЭ ПЛАН · БОДИТ ХЭМЖЭЭС, ЗОХИОН БАЙГУУЛАЛТ БИШ
      </text>
    </svg>
  );
}
