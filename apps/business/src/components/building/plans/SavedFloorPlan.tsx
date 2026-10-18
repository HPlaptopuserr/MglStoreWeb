import { useEffect, useState } from "react";
import { loadPlanLibrary, PLAN_CHANGE_EVENT } from "./plan-storage";
import { canonicalPlanRegionId, shapeBounds, type FloorPlan } from "./plan-model";
import { PlanShapeGraphic } from "./PlanShapeGraphic";
import { unitTitle, unitStatusLabel, type SalesUnit } from "../sales/demo-inventory";
export function useSavedFloorPlan(floor: number) {
  const [plans, setPlans] = useState<{
    library: Awaited<ReturnType<typeof loadPlanLibrary>> | null;
    error: string;
    loading: boolean;
  }>({ library: null, error: "", loading: true });
  useEffect(() => {
    let active = true;
    const load = () => {
      void loadPlanLibrary()
        .then((library) => {
          if (active) setPlans({ library, error: "", loading: false });
        })
        .catch(() => {
          if (active)
            setPlans({
              library: null,
              error:
                "Хадгалсан план уншиж чадсангүй. Үндсэн жишээ планыг харуулж байна.",
              loading: false,
            });
        });
    };
    load();
    window.addEventListener("focus", load);
    window.addEventListener(PLAN_CHANGE_EVENT, load);
    return () => {
      active = false;
      window.removeEventListener("focus", load);
      window.removeEventListener(PLAN_CHANGE_EVENT, load);
    };
  }, []);
  return {
    plan: plans.library?.plans.find(
      (plan) => plan.id === plans.library?.assignments[String(floor)],
    ),
    error: plans.error,
    loading: plans.loading,
  };
}
export function SavedFloorPlan({
  plan: original,
  units,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
}: {
  plan: FloorPlan;
  units: SalesUnit[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const [region, setRegion] = useState<string | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [mode, setMode] = useState<"3d" | "source">("3d");
  const plan = mode === "source" && original.source ? { ...original, ...original.source } : original;
  return (<div>
    {original.source?.background && <div className="plan-toolbar"><button aria-pressed={mode === "3d"} onClick={() => setMode("3d")}>3D зураг</button><button aria-pressed={mode === "source"} onClick={() => setMode("source")}>Эх зураг</button></div>}
    <svg
      viewBox="0 0 1000 800"
      className="viewer-plan"
      role="group"
      aria-label={plan.name}
    >
      <rect width="1000" height="800" fill="#182332" />
      {plan.background && (
        <image
          href={plan.background}
          width="1000"
          height="800"
          preserveAspectRatio="xMidYMid meet"
        />
      )}
      {plan.shapes
        .filter((shape) => shape.kind !== "unit")
        .map((shape) => (
          <g key={shape.id} style={{ color: "#e7e4d9" }}>
            <PlanShapeGraphic shape={shape} />
          </g>
        ))}
      {plan.shapes
        .filter((shape) => shape.kind === "unit")
        .map((shape) => {
          const unit =
            units.some(item => item.planShapeId !== undefined)
              ? units.find(item => item.planShapeId === canonicalPlanRegionId(original, shape))
              : shape.unitSlot === null
              ? undefined
              : units.some((item) => item.planSlot !== undefined)
                ? units.find((item) => item.planSlot === shape.unitSlot)
                : units[shape.unitSlot];
          const bounds = shapeBounds(shape);
          const regionKey = `${plan.id}:${mode}:${shape.id}`;
          const highlighted = unit ? selectedId === unit.id || hoveredId === unit.id : region === regionKey || hoveredRegion === regionKey;
          const selectRegion = () => { setRegion(regionKey); if (unit) onSelect(unit.id); };

          return (
            <g
              key={shape.id}
              role="button"
              tabIndex={0}
              aria-label={
                unit
                  ? `План ${unitTitle(unit)}, ${unitStatusLabel(unit)}`
                  : shape.label
              }
              aria-pressed={unit ? selectedId === unit.id : region === regionKey}
              className={`plan-unit ${unit?.status ?? ""} ${highlighted ? "active" : ""}`}
              onClick={selectRegion}
              onMouseEnter={() => { setHoveredRegion(regionKey); if (unit) onHover(unit.id); }}
              onMouseLeave={() => { setHoveredRegion(null); onHover(null); }}
              onFocus={() => { setHoveredRegion(regionKey); if (unit) onHover(unit.id); }}
              onBlur={() => { setHoveredRegion(null); onHover(null); }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  selectRegion();
                }
              }}
            >
              <polygon
                points={shape.points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill={unit ? "#54a58230" : "#77818b30"}
                stroke={unit ? "#72ae94" : "#77818b"}
                className="plan-status-overlay"
              />
              {highlighted && <text
                pointerEvents="none"
                x={bounds.x + bounds.width / 2}
                y={bounds.y + bounds.height / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                stroke="#14232b"
                strokeWidth=".5"
                paintOrder="stroke"
                fontSize="12"
                fontWeight="700"
              >
                {unit
                  ? `${unitTitle(unit)} · ${unit.area ?? "—"} м²`
                  : shape.label}
              </text>}
            </g>
          );
        })}
    </svg>
    {plan.shapes.some((shape) => `${plan.id}:${mode}:${shape.id}` === region && shape.unitSlot === null) && <p role="status">Бүс сонгогдлоо. Энэ хүрээ байрны бүртгэлтэй холбогдоогүй байна.</p>}
    </div>
  );
}
