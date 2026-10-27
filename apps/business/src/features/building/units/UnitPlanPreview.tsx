"use client";

import { useState } from "react";
import type { FloorPlan } from "@mgl/types/building-plans";
import type { FloorPlanUnit } from "../website/floor-plan-units";
import { canonicalPlanRegionId, shapeBounds } from "../plans/plan-model";
import { PlanShapeGraphic } from "../plans/PlanShapeGraphic";

interface UnitPlanPreviewProps {
  plan: FloorPlan;
  entries: FloorPlanUnit[];
  matchingIds: string[];
  selectedId: string | null;
  busy: boolean;
  readOnly?: boolean;
  onSelect: (regionId: string) => void;
}

/** Read-only geometry; both plan layers open the same canonical apartment. */
export function UnitPlanPreview({
  plan,
  entries,
  matchingIds,
  selectedId,
  busy,
  readOnly = false,
  onSelect,
}: UnitPlanPreviewProps) {
  const [source, setSource] = useState(false);
  const drawing = source && plan.source ? plan.source : plan;
  const matches = new Set(matchingIds);
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  return (
    <div className="unit-plan-preview" aria-busy={busy}>
      <div className="unit-plan-toolbar">
        <strong>{plan.name}</strong>
        {plan.source && (
          <div>
            <button
              type="button"
              aria-pressed={!source}
              onClick={() => setSource(false)}
            >
              3D план
            </button>
            <button
              type="button"
              aria-pressed={source}
              onClick={() => setSource(true)}
            >
              Эх зураг
            </button>
          </div>
        )}
        <span role="status">
          {busy
            ? "Байрны бүртгэл бэлтгэж байна…"
            : "Бүс дээр дарж мэдээлэл оруулна"}
        </span>
      </div>
      <svg
        viewBox="0 0 1000 800"
        role="group"
        aria-label={`${plan.name} — байр сонгох`}
      >
        <rect width="1000" height="800" fill="#182332" />
        {drawing.background && (
          <image
            href={drawing.background}
            width="1000"
            height="800"
            preserveAspectRatio="xMidYMid meet"
          />
        )}
        {drawing.shapes.map((shape) => {
          if (shape.kind !== "unit")
            return (
              <g key={shape.id} style={{ color: "#e7e4d9" }}>
                <PlanShapeGraphic shape={shape} />
              </g>
            );
          const id = canonicalPlanRegionId(plan, shape);
          if (!id) return null;
          const entry = byId.get(id);
          if (!entry) return null;
          const bounds = shapeBounds(shape);
          const label = `${entry.label}${entry.unitNo ? ` · № ${entry.unitNo}` : ""}`;
          const disabled = busy || readOnly || !matches.has(id);
          return (
            <g
              key={shape.id}
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-label={`${label} — мэдээлэл засах`}
              aria-disabled={disabled}
              aria-pressed={selectedId === id}
              className={`unit-plan-region${matches.has(id) ? "" : " muted"}`}
              onClick={() => {
                if (!disabled) onSelect(id);
              }}
              onKeyDown={(event) => {
                if (!disabled && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  onSelect(id);
                }
              }}
            >
              <title>
                {`${label} · ${entry.areaM2 ?? "—"} м² · ${entry.rooms ?? "—"} өрөө`}
              </title>
              <polygon
                points={shape.points
                  .map((point) => `${point.x},${point.y}`)
                  .join(" ")}
              />
              <text
                x={bounds.x + bounds.width / 2}
                y={bounds.y + bounds.height / 2}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {entry.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="unit-plan-region-list" aria-label="Планын байрнууд">
        {entries
          .filter((entry) => matches.has(entry.id))
          .map((entry) => (
            <button
              type="button"
              key={entry.id}
              disabled={busy || readOnly}
              onClick={() => onSelect(entry.id)}
            >
              {entry.label}
              {entry.unitNo ? ` · № ${entry.unitNo}` : ""} →
            </button>
          ))}
      </div>
    </div>
  );
}
