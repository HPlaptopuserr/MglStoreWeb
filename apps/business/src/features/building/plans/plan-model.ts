// Explicit exports keep the CommonJS workspace package visible to the client bundler.
export {
  PLAN_WIDTH,
  PLAN_HEIGHT,
  shapeLabels,
  emptyLibrary,
  rectPoints,
  shapeBounds,
  makePlan,
  parseLibrary,
  canonicalPlanRegionId,
} from "@mgl/types/building-plans";
export type {
  PlanShapeKind,
  PlanPoint,
  PlanShape,
  FloorPlan,
  PlanLibrary,
} from "@mgl/types/building-plans";
