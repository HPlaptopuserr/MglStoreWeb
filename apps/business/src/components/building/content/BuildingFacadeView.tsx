"use client";

import { useState } from "react";
import { resolveFacadeRegions } from "./facade-regions";
import type { BuildingFacade, WebsiteProject } from "@mgl/types/building-website";

export function BuildingFacadeView({ facade, floors, selected, onSelect }: {
  facade: BuildingFacade;
  floors: WebsiteProject["blocks"][number]["floors"];
  selected: number;
  onSelect: (floor: number) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const resolvedRegions = resolveFacadeRegions(facade, floors.map(floor => floor.number));
  const floorRegions = floors.map(floor => ({
    number: floor.number,
    regions: resolvedRegions.filter(region => region.floor === floor.number),
  })).filter(floor => floor.regions.length > 0);
  const activeFloor = hovered ?? focused ?? selected;
  return <div>
    <svg className="building-facade-view" viewBox="0 0 1000 800"
      role="group" aria-label="Барилгын зураг дээр давхар сонгох">
      <image href={facade.image} width="1000" height="800"
        preserveAspectRatio="xMidYMid meet" pointerEvents="none" />
      {floorRegions.map(({ number, regions }) => {
        const active = activeFloor === number;
        const x = Math.min(...regions.map(region => region.x));
        const y = Math.min(...regions.map(region => region.y));
        const labelX = Math.max(4, Math.min(850, x));
        const labelY = y >= 38 ? y - 34 : y + 4;
        return <g key={number} className={`facade-floor-target${active ? " is-active" : ""}`}
          role="button" tabIndex={0} aria-label={`${number} давхар сонгох`}
          aria-pressed={selected === number}
          onPointerEnter={() => setHovered(number)} onPointerLeave={() => setHovered(null)}
          onFocus={() => setFocused(number)} onBlur={() => setFocused(null)}
          onClick={() => onSelect(number)}
          onKeyDown={event => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault(); onSelect(number);
            }
          }}>
          <title>{`${number} давхар`}</title>
          {regions.map(region => <rect key={region.id} className="facade-floor-region"
            x={region.x} y={region.y} width={region.width} height={region.height}
            pointerEvents="all" vectorEffect="non-scaling-stroke" />)}
          {active && <g className="facade-floor-label" pointerEvents="none">
            <rect x={labelX} y={labelY} width={146} height={30} rx={6} />
            <text x={labelX + 73} y={labelY + 15} dominantBaseline="middle" textAnchor="middle">
              {number < 0 ? `B${-number}` : `${number}-р давхар`}
            </text>
          </g>}
        </g>;
      })}
    </svg>
    {!floorRegions.length && <p role="status">Энэ блокийн зурагт давхрын бүс хадгалагдаагүй байна.</p>}
  </div>;
}
