import assert from "node:assert/strict";
import { test } from "node:test";
import {
  emptyWebsiteContent,
  regionBindingKey,
  type WebsiteInventoryUnit,
  type WebsiteProject,
} from "@mgl/types/building-website";
import type { FloorPlan } from "@mgl/types/building-plans";
import { getProjectFloorInventory } from "./project-floor-inventory";

function unit(
  floor: number,
  index: number,
  status = "AVAILABLE",
): WebsiteInventoryUnit {
  return {
    id: `unit-${floor}-${index}`,
    unitNo: `${floor}${String(index + 1).padStart(2, "0")}`,
    typeLabel: "A",
    rooms: 2,
    areaM2: "50",
    priceTotal: String((index + 1) * 100),
    pricePerM2: "3",
    planImageUrl: null,
    status,
    published: true,
  };
}
function plan(id: string, count: number): FloorPlan {
  return {
    id,
    name: id,
    background: null,
    shapes: Array.from({ length: count }, (_, index) => ({
      id: `shape-${index}`,
      kind: "unit",
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
      ],
      label: `Type ${index}`,
      unitSlot: index,
    })),
  };
}
function fixture(): Pick<WebsiteProject, "blocks" | "website"> {
  return {
    blocks: [
      {
        id: "block",
        name: "A",
        minPaymentPercent: "10",
        maxPaymentPercent: "100",
        floors: [
          {
            id: "floor-20",
            number: 20,
            units: Array.from({ length: 65 }, (_, index) =>
              unit(20, index, index === 0 ? "SOLD" : "AVAILABLE"),
            ),
          },
          {
            id: "floor-18",
            number: 18,
            units: Array.from({ length: 65 }, (_, index) =>
              unit(18, index, index === 0 ? "RESERVED" : "AVAILABLE"),
            ),
          },
          { id: "floor-1", number: 1, units: [unit(1, 0), unit(1, 1, "HOLD")] },
        ],
      },
    ],
    website: {
      content: emptyWebsiteContent(),
      plansByBlock: {
        block: {
          version: 1,
          plans: [plan("plan-20", 12), plan("plan-18", 3)],
          assignments: { "20": "plan-20", "18": "plan-18" },
        },
      },
    },
  };
}

test("a twelve-unit plan excludes obsolete inventory from totals and prices", () => {
  const result = getProjectFloorInventory(fixture(), "block", 20, false);
  assert.equal(result.entries.length, 12);
  assert.equal(result.available.length, 11);
  assert.equal(Math.max(...result.prices), 1200);
  assert.ok(
    result.entries.every((entry) => entry.unit?.unitNo.startsWith("20")),
  );
});

test("switching floors resolves that floor's plan, bindings, counts and unit numbers", () => {
  const project = fixture();
  project.website.unitBindings = {
    [regionBindingKey("floor-18", "plan-18", "shape-1")]: "unit-18-8",
  };
  const floor20 = getProjectFloorInventory(project, "block", 20, false);
  const floor18 = getProjectFloorInventory(project, "block", 18, false);
  assert.equal(floor20.entries.length, 12);
  assert.equal(floor18.entries.length, 3);
  assert.equal(floor18.available.length, 2);
  assert.equal(floor18.entries[1].unit?.id, "unit-18-8");
  assert.ok(
    floor18.entries.every((entry) => entry.unit?.unitNo.startsWith("18")),
  );
  assert.equal(floor18.plan?.id, "plan-18");
});

test("public counts respect publication and floors without plans use registered units", () => {
  const project = fixture();
  project.blocks[0].floors[0].units[1].published = false;
  assert.equal(
    getProjectFloorInventory(project, "block", 20, true).entries.length,
    11,
  );
  assert.equal(
    getProjectFloorInventory(project, "block", 20, true).available.length,
    10,
  );
  const withoutPlan = getProjectFloorInventory(project, "block", 1, false);
  assert.equal(withoutPlan.entries.length, 2);
  assert.equal(withoutPlan.available.length, 1);
  assert.equal(withoutPlan.plan, undefined);
  assert.equal(
    getProjectFloorInventory(project, "block", 99, false).entries.length,
    0,
  );
});
