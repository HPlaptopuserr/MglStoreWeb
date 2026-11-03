import assert from "node:assert/strict";
import { test } from "node:test";
import { mirrorPlanShape } from "./plan-transforms";
import { shapeBounds, type PlanShape } from "./plan-model";

const shape: PlanShape = {
  id: "copied-region",
  kind: "unit",
  label: "А",
  unitSlot: 2,
  inventory: { rooms: 3, areaM2: 72 },
  points: [
    { x: 90, y: 325 },
    { x: 355, y: 325 },
    { x: 355, y: 400 },
    { x: 170, y: 400 },
    { x: 170, y: 505 },
    { x: 90, y: 505 },
  ],
};
for (const axis of ["horizontal", "vertical"] as const) {
  test(`${axis} reflection preserves bounds, inventory and restores on a second flip`, () => {
    const before = structuredClone(shape);
    const mirrored = mirrorPlanShape(shape, axis);
    assert.deepEqual(shapeBounds(mirrored), shapeBounds(shape));
    assert.deepEqual(mirrored.inventory, shape.inventory);
    assert.equal(mirrored.id, shape.id);
    assert.equal(mirrored.unitSlot, shape.unitSlot);
    assert.deepEqual(mirrorPlanShape(mirrored, axis), shape);
    assert.deepEqual(shape, before);
    assert.notDeepEqual(mirrored.points, shape.points);
    assert.deepEqual(
      mirrored.points[0],
      axis === "horizontal" ? { x: 355, y: 325 } : { x: 90, y: 505 },
    );
  });
}
