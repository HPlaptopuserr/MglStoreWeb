export type PlanShapeKind =
  | "unit"
  | "wall"
  | "bed"
  | "sofa"
  | "stairs"
  | "lift"
  | "label";
export interface PlanPoint {
  x: number;
  y: number;
}
export interface PlanShape {
  id: string;
  kind: PlanShapeKind;
  points: PlanPoint[];
  label: string;
  unitSlot: number | null;
  inventory?: { unitNo?: string; rooms: number | null; areaM2: number | null };
}
export interface FloorPlan {
  id: string;
  name: string;
  background: string | null;
  source?: { background: string | null; shapes: PlanShape[] };
  shapes: PlanShape[];
}
export interface PlanLibrary {
  version: 1;
  plans: FloorPlan[];
  assignments: Record<string, string>;
}
export const PLAN_WIDTH = 1000;
export const PLAN_HEIGHT = 800;
export const shapeLabels: Record<PlanShapeKind, string> = {
  unit: "Байрны бүс",
  wall: "Хана",
  bed: "Ор",
  sofa: "Буйдан",
  stairs: "Шат",
  lift: "Лифт",
  label: "Тайлбар",
};
export const emptyLibrary = (): PlanLibrary => ({
  version: 1,
  plans: [],
  assignments: {},
});
export const rectPoints = (
  x: number,
  y: number,
  width: number,
  height: number,
): PlanPoint[] => [
  { x, y },
  { x: x + width, y },
  { x: x + width, y: y + height },
  { x, y: y + height },
];
export function shapeBounds(shape: PlanShape) {
  const xs = shape.points.map((point) => point.x),
    ys = shape.points.map((point) => point.y);
  const x = Math.min(...xs),
    y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}
export function makePlan(): FloorPlan {
  return {
    id: crypto.randomUUID(),
    name: "Шинэ план",
    background: null,
    shapes: [],
  };
}
export function parseLibrary(value: unknown): PlanLibrary {
  const fail = (): never => {
    throw new Error("План файлын бүтэц эсвэл хэмжээ буруу байна.");
  };
  if (
    !value ||
    typeof value !== "object" ||
    !("version" in value) ||
    value.version !== 1 ||
    !("plans" in value) ||
    !Array.isArray(value.plans) ||
    value.plans.length > 30 ||
    !("assignments" in value) ||
    !value.assignments ||
    typeof value.assignments !== "object" ||
    Array.isArray(value.assignments)
  )
    return fail();
  const plans = value.plans.map((item: unknown): FloorPlan => {
    if (!item || typeof item !== "object") return fail();
    const p = item as Record<string, unknown>;
    if (
      typeof p.id !== "string" ||
      !/^[a-zA-Z0-9-]{1,100}$/.test(p.id) ||
      typeof p.name !== "string" ||
      !p.name.trim() ||
      p.name.length > 100 ||
      !Array.isArray(p.shapes) ||
      p.shapes.length > 200
    )
      return fail();
    if (
      p.background !== null &&
      (typeof p.background !== "string" ||
        p.background.length > 3_000_000 ||
        !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(
          p.background,
        ))
    )
      return fail();
    const shapes = p.shapes.map((raw: unknown): PlanShape => {
      if (!raw || typeof raw !== "object") return fail();
      const s = raw as Record<string, unknown>;
      if (
        typeof s.id !== "string" ||
        !/^[a-zA-Z0-9-]{1,100}$/.test(s.id) ||
        typeof s.kind !== "string" ||
        !Object.hasOwn(shapeLabels, s.kind) ||
        typeof s.label !== "string" ||
        s.label.length > 100 ||
        !Array.isArray(s.points) ||
        s.points.length < 3 ||
        s.points.length > 50 ||
        (s.unitSlot !== null &&
          (typeof s.unitSlot !== "number" ||
            !Number.isInteger(s.unitSlot) ||
            s.unitSlot < 0 ||
            s.unitSlot > 999))
      )
        return fail();
      const points = s.points.map((rawPoint: unknown): PlanPoint => {
        if (
          !rawPoint ||
          typeof rawPoint !== "object" ||
          !("x" in rawPoint) ||
          !("y" in rawPoint) ||
          typeof rawPoint.x !== "number" ||
          typeof rawPoint.y !== "number" ||
          !Number.isFinite(rawPoint.x) ||
          !Number.isFinite(rawPoint.y) ||
          rawPoint.x < 0 ||
          rawPoint.x > PLAN_WIDTH ||
          rawPoint.y < 0 ||
          rawPoint.y > PLAN_HEIGHT
        )
          return fail();
        return { x: rawPoint.x, y: rawPoint.y };
      });
      const shape: PlanShape = {
        id: s.id,
        kind: s.kind as PlanShapeKind,
        label: s.label,
        points,
        unitSlot: s.unitSlot as number | null,
      };
      if (s.inventory !== undefined) {
        if (!s.inventory || typeof s.inventory !== "object") return fail();
        const data = s.inventory as Record<string, unknown>;
        if (
          shape.kind !== "unit" ||
          (data.rooms !== null &&
            (typeof data.rooms !== "number" ||
              !Number.isInteger(data.rooms) ||
              data.rooms < 1 ||
              data.rooms > 20)) ||
          (data.areaM2 !== null &&
            (typeof data.areaM2 !== "number" ||
              !Number.isFinite(data.areaM2) ||
              data.areaM2 <= 0 ||
              data.areaM2 > 10000 ||
              Math.abs(data.areaM2 * 100 - Math.round(data.areaM2 * 100)) >
                0.00001))
        )
          return fail();
        if (
          data.unitNo !== undefined &&
          (typeof data.unitNo !== "string" || data.unitNo.trim().length > 30)
        )
          return fail();
        shape.inventory = {
          ...(typeof data.unitNo === "string"
            ? { unitNo: data.unitNo.trim() }
            : {}),
          rooms: data.rooms as number | null,
          areaM2: data.areaM2 as number | null,
        };
      }
      const bounds = shapeBounds(shape);
      if (bounds.width < 2 || bounds.height < 2) return fail();
      return shape;
    });
    if (new Set(shapes.map((s) => s.id)).size !== shapes.length) return fail();
    const slots = shapes
      .filter((s) => s.kind === "unit" && s.unitSlot !== null)
      .map((s) => s.unitSlot);
    if (new Set(slots).size !== slots.length)
      throw new Error("Нэг байрыг нэг планд давхар холбож болохгүй.");
    const source =
      p.source === undefined
        ? undefined
        : (() => {
            if (
              !p.source ||
              typeof p.source !== "object" ||
              Array.isArray(p.source)
            )
              return fail();
            const raw = p.source as Record<string, unknown>;
            const parsed = parseLibrary({
              version: 1,
              plans: [
                {
                  id: p.id,
                  name: p.name,
                  background: raw.background,
                  shapes: raw.shapes,
                },
              ],
              assignments: {},
            }).plans[0];
            return { background: parsed.background, shapes: parsed.shapes };
          })();
    return {
      ...(source ? { source } : {}),
      id: p.id,
      name: p.name.trim(),
      background: p.background as string | null,
      shapes,
    };
  });
  if (new Set(plans.map((p) => p.id)).size !== plans.length) return fail();
  const assignments: Record<string, string> = {};
  for (const [floor, id] of Object.entries(value.assignments)) {
    if (
      !/^-?\d{1,3}$/.test(floor) ||
      Number(floor) < -10 ||
      Number(floor) > 200 ||
      typeof id !== "string" ||
      !plans.some((p) => p.id === id)
    )
      return fail();
    assignments[floor] = id;
  }
  return { version: 1, plans, assignments };
}

/** Find the canonical region across the 3D and source drawings without using array order. */
export function canonicalPlanRegionId(
  plan: FloorPlan,
  shape: PlanShape,
): string | undefined {
  if (plan.shapes.some((item) => item.kind === "unit" && item.id === shape.id))
    return shape.id;
  if (shape.unitSlot !== null) {
    const match = plan.shapes.find(
      (item) => item.kind === "unit" && item.unitSlot === shape.unitSlot,
    );
    if (match) return match.id;
  }
  const matches = plan.shapes.filter(
    (item) => item.kind === "unit" && item.label.trim() === shape.label.trim(),
  );
  return matches.length === 1 ? matches[0].id : undefined;
}
