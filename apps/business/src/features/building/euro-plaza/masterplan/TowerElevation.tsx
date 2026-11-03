"use client";
import { useId } from "react";
import "./tower-elevation.css";
interface Props {
  floorCount: number;
  fitToContainer?: boolean;
  floorNumbers?: number[];
  selected: number | null;
  onSelect: (floor: number) => void;
}

/** Shared schematic elevation generated from registered floors.
 * Floors align with the interactive bands; this is not a surveyed elevation.
 */
export function TowerElevation({
  floorCount,
  fitToContainer = false,
  floorNumbers,
  selected,
  onSelect,
}: Props) {
  const id = useId().replace(/:/g, "");
  const numbers =
    floorNumbers ??
    Array.from(
      { length: Math.max(0, Math.min(100, Math.floor(floorCount))) },
      (_, index) => floorCount - index,
    );
  const floorHeight = 32;
  const roof = 65;
  const ground = roof + numbers.length * floorHeight;
  return (
    <svg
      className="tower-elevation"
      style={{
        minHeight: fitToContainer ? 0 : Math.max(300, numbers.length * 24 + 90),
      }}
      viewBox={`0 0 640 ${ground + 54}`}
      role="group"
      aria-label="Барилгын фасад дээрээс давхар сонгох"
    >
      <title>Давхраа сонгоно уу</title>
      <desc>
        Давхар дээр дарж эсвэл Tab, Enter товчоор сонгоно. Сумтай товчоор хөрш
        давхарт шилжинэ.
      </desc>
      <defs>
        <linearGradient id={`${id}-glass`} x2="1" y2="1">
          <stop stopColor="#456c83" />
          <stop offset=".48" stopColor="#aac8d6" />
          <stop offset="1" stopColor="#66899e" />
        </linearGradient>
        <linearGradient id={`${id}-wall`}>
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
        fill={`url(#${id}-wall)`}
      />
      <rect x="149" y="60" width="49" height={ground - 30} fill="#31566d" />
      <rect x="443" y="60" width="49" height={ground - 30} fill="#31566d" />
      <rect x="298" y="60" width="45" height={ground - 30} fill="#33576c" />
      <path d="M132 48H506L554 71H538L500 59H144Z" fill="#b9c9ce" />
      <path d="M144 36H491L506 48H132Z" fill="#e0ded4" />
      <path d="M132 48H506V59H132Z" fill="#8fa5ad" />
      <path d="M262 11H365L388 28H285Z" fill="#eee9db" />
      <path d="M285 28H388V46H285Z" fill="#bac6c8" />
      <path d="M262 11V31L285 46V28Z" fill="#91a4ad" />
      <path
        d="M259 8H367L392 25H285Z"
        fill="none"
        stroke="#849da8"
        strokeWidth="7"
      />
      {numbers.map((floor, index) => {
        const y = roof + index * floorHeight;
        return (
          <g
            key={
              floor < 0 ? `B${Math.abs(floor)}` : floor === 0 ? "Гадна" : floor
            }
            className={`tower-floor${floor === selected ? " is-selected" : ""}`}
            role="button"
            tabIndex={0}
            aria-label={`${floor < 0 ? `B${-floor}` : floor === 0 ? "Гадна талбай" : `${floor} давхар`} сонгох`}
            aria-pressed={floor === selected}
            onClick={() => onSelect(floor)}
            onKeyDown={(event) => {
              if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                event.preventDefault();
                const nextIndex = Math.max(
                  0,
                  Math.min(
                    numbers.length - 1,
                    index + (event.key === "ArrowUp" ? -1 : 1),
                  ),
                );
                const nextFloor = numbers[nextIndex];
                if (nextFloor !== undefined) onSelect(nextFloor);
                const target =
                  event.currentTarget.parentElement?.querySelectorAll<SVGGElement>(
                    ".tower-floor",
                  )[nextIndex];
                target?.focus();
              }
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
                  fill={`url(#${id}-glass)`}
                  stroke="#e7f1f3"
                  strokeWidth="2"
                />
                <path
                  d={`M${x + 16} ${y + 4}V${y + 27}M${x} ${y + 17}H${x + 32}`}
                  stroke="#547e96"
                  strokeWidth="1"
                />
                <path
                  d={`M${x + 3} ${y + 6}h9l-9 13Z`}
                  fill="#fff"
                  opacity=".18"
                />
                {(column === 1 || column === 5) && (
                  <path
                    d={`M${x - 4} ${y + 25}h40v5h-40Z`}
                    fill="#e3e8e6"
                    stroke="#9eafb4"
                    strokeWidth=".7"
                  />
                )}
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
            <rect
              className="tower-floor-number-bg"
              x="72"
              y={y + 3}
              width="48"
              height="26"
              rx="8"
            />
            <text
              className="tower-floor-number"
              x="96"
              y={y + 21}
              textAnchor="middle"
              fill="white"
              fontSize="12"
              fontWeight="700"
            >
              {floor < 0
                ? `B${Math.abs(floor)}`
                : floor === 0
                  ? "Гадна"
                  : floor}
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
