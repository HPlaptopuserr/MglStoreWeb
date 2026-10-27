import assert from "node:assert/strict";
import { test } from "node:test";
import { parseBuildingBlocks } from "./block-input";
const unit = { unitNo: "101", typeLabel: "A", rooms: 2, areaM2: 56.5 };
const block = {
  name: "101-р блок",
  floors: [
    { number: 1, units: [unit] },
    {
      number: 2,
      units: [
        { ...unit, unitNo: "201", rooms: 4, areaM2: 95.25 },
        { ...unit, unitNo: "202", typeLabel: "B", areaM2: 60 },
      ],
    },
  ],
};
test("preserves differing floor layouts, per-unit rooms, area and numbers", () => {
  const result = parseBuildingBlocks([block])[0];
  assert.equal(result.floors.create[0].units.create.length, 1);
  assert.equal(result.floors.create[1].units.create.length, 2);
  assert.equal(result.floors.create[1].units.create[0].areaM2, 95.25);
  assert.equal(result.floors.create[1].units.create[0].rooms, 4);
  assert.equal(result.floors.create[1].units.create[0].unitNo, "201");
  assert.ok(
    result.floors.create.every((f) =>
      f.units.create.every((u) => !u.published),
    ),
  );
});
test("rejects duplicate blocks, floors, cross-floor unit numbers and missing inventory", () => {
  for (const input of [
    [block, block],
    [{ ...block, floors: [] }],
    [{ ...block, floors: [block.floors[0], block.floors[0]] }],
    [{ ...block, floors: [block.floors[0], { number: 2, units: [unit] }] }],
  ])
    assert.throws(() => parseBuildingBlocks(input));
});
test("rejects missing/invalid area and rooms without trusting publication input", () => {
  for (const patch of [
    { areaM2: undefined },
    { areaM2: 0 },
    { areaM2: Infinity },
    { areaM2: 12.345 },
    { rooms: 0 },
    { rooms: 1.5 },
    { typeLabel: "" },
  ])
    assert.throws(() =>
      parseBuildingBlocks([
        { name: "A", floors: [{ number: 1, units: [{ ...unit, ...patch }] }] },
      ]),
    );
  assert.equal(
    parseBuildingBlocks([
      {
        name: "A",
        floors: [{ number: 1, units: [{ ...unit, published: true }] }],
      },
    ])[0].floors.create[0].units.create[0].published,
    false,
  );
});
test("bounds aggregate inventory and allows identical numbers in separate blocks", () => {
  assert.equal(parseBuildingBlocks([block, { ...block, name: "B" }]).length, 2);
  const floors = Array.from({ length: 41 }, (_, floor) => ({
    number: floor + 1,
    units: Array.from({ length: 50 }, (_, index) => ({
      ...unit,
      unitNo: `${floor}-${index}`,
    })),
  }));
  assert.throws(() => parseBuildingBlocks([{ name: "A", floors }]));
});
