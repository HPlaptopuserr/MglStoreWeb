import { shapeBounds, type PlanShape } from "./plan-model";

/** Reflect geometry within its own bounds without changing inventory identity. */
export function mirrorPlanShape(
  shape: PlanShape,
  axis: "horizontal" | "vertical",
): PlanShape {
  if (!shape.points.length) return shape;
  const bounds = shapeBounds(shape);
  return {
    ...shape,
    points: shape.points.map((point) => ({
      x:
        axis === "horizontal" ? 2 * bounds.x + bounds.width - point.x : point.x,
      y: axis === "vertical" ? 2 * bounds.y + bounds.height - point.y : point.y,
    })),
  };
}
