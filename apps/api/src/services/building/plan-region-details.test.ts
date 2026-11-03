import assert from "node:assert/strict";
import { test } from "node:test";
import {
  emptyUnitContent,
  parseUnitContent,
  unitRoomCount,
  emptyWebsiteContent,
  readWebsiteRecord,
  regionBindingKey,
  type BuildingWebsiteRecord,
} from "@mgl/types/building-website";
import { applyPlanRegionDetails } from "./plan-region-details";

function fixture() {
  const unit = (id: string) => ({
    id,
    typeLabel: "А",
    rooms: null as number | null,
    areaM2: null as string | null,
    status: "AVAILABLE",
    unitNo: id,
  });
  const blocks = ["block-a", "block-b"].map((id) => ({
    id,
    floors: [16, 17, 18, 19, 20].map((number) => ({
      id: `${id}-${number}`,
      number,
      units: [unit(`${id}-a-${number}`), unit(`${id}-b-${number}`)],
    })),
  }));
  const website: BuildingWebsiteRecord = {
    content: emptyWebsiteContent(),
    plansByBlock: {},
    unitBindings: {},
    unitContent: {},
  };
  for (const block of blocks) {
    website.plansByBlock[block.id] = {
      version: 1,
      assignments: {
        "16": "other",
        "17": "plan",
        "18": "plan",
        "19": "plan",
        "20": "plan",
      },
      plans: ["plan", "other"].map((id) => ({
        id,
        name: id,
        background: null,
        shapes: ["a", "b"].map((id, unitSlot) => ({
          id,
          kind: "unit" as const,
          label: id,
          unitSlot,
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 100 },
          ],
        })),
      })),
    };
    for (const floor of block.floors) {
      for (const [index, unit] of floor.units.entries())
        website.unitBindings![
          regionBindingKey(
            floor.id,
            floor.number === 16 ? "other" : "plan",
            index === 0 ? "a" : "b",
          )
        ] = unit.id;
    }
  }
  const source = blocks[0].floors[1].units[0];
  source.rooms = 3;
  source.areaM2 = "71.37";
  website.unitContent![source.id] = {
    ...emptyUnitContent(),
    layout3d:
      "/api/building/projects/project/media/11111111-1111-1111-1111-111111111111.webp",
    description: "Shared apartment",
  };
  website.unitContent![blocks[0].floors[4].units[0].id] = {
    ...emptyUnitContent(),
    paymentTerms: "Only this unit",
    useProjectPrice: false,
  };
  return { website, blocks };
}
test("legacy 17th-floor image and metadata reach 17–20 only, preserving financial content", () => {
  const { website, blocks } = fixture();
  const before = structuredClone(blocks);
  applyPlanRegionDetails(website, blocks);
  for (const number of [17, 18, 19, 20])
    assert.equal(
      website.unitContent![`block-a-a-${number}`].layout3d,
      website.unitContent!["block-a-a-17"].layout3d,
    );
  assert.equal(website.unitContent!["block-a-a-16"].layout3d, "");
  assert.equal(website.unitContent!["block-a-b-20"].layout3d, "");
  assert.equal(website.unitContent!["block-b-a-20"].layout3d, "");
  assert.equal(
    website.unitContent!["block-a-a-20"].paymentTerms,
    "Only this unit",
  );
  assert.equal(website.unitContent!["block-a-a-20"].useProjectPrice, false);
  assert.equal(
    website.plansByBlock["block-a"].plans[0].shapes[0].inventory?.areaM2,
    71.37,
  );
  assert.equal(
    website.plansByBlock["block-a"].plans[0].shapes[0].inventory?.rooms,
    3,
  );
  assert.deepEqual(blocks, before);
});
test("saved shared edits and removals survive serialization and apply to newly assigned floors", () => {
  const { website, blocks } = fixture();
  applyPlanRegionDetails(website, blocks);
  const key = regionBindingKey("block-a", "plan", "a");
  website.planRegionDetails![key].content.layout3d = "";
  website.planRegionDetails![key].rooms = 2;
  website.planRegionDetails![key].areaM2 = 49.32;
  website.plansByBlock["block-a"].assignments["16"] = "plan";
  website.unitBindings![regionBindingKey("block-a-16", "plan", "a")] =
    "block-a-a-16";
  const restored = readWebsiteRecord({ website });
  applyPlanRegionDetails(restored, blocks);
  for (const number of [16, 17, 18, 19, 20])
    assert.equal(restored.unitContent![`block-a-a-${number}`].layout3d, "");
  assert.equal(
    restored.plansByBlock["block-a"].plans[0].shapes[0].inventory?.rooms,
    2,
  );
  assert.equal(restored.planRegionDetails![key].areaM2, 49.32);
});
test("stale binding does not borrow an unrelated positional unit", () => {
  const { website, blocks } = fixture();
  website.unitBindings![regionBindingKey("block-a-17", "plan", "a")] =
    "missing";
  applyPlanRegionDetails(website, blocks);
  assert.equal(website.unitContent!["block-a-a-20"].layout3d, "");
});

test("room interiors survive parsing and shared floor metadata without leaking to another plan", () => {
  const { website, blocks } = fixture();
  const interiors = [
    {
      name: "Зочны өрөө",
      description: "Том цонхтой",
      image:
        "/api/building/projects/project/media/11111111-1111-1111-1111-111111111111.webp",
    },
    { name: "", description: "", image: "" },
    { name: "Унтлагын өрөө", description: "", image: "" },
  ];
  website.unitContent!["block-a-a-17"].roomInteriors = interiors;
  applyPlanRegionDetails(website, blocks);
  const parsed = readWebsiteRecord({ website });
  applyPlanRegionDetails(parsed, blocks);
  for (const number of [17, 18, 19, 20])
    assert.deepEqual(
      parsed.unitContent![`block-a-a-${number}`].roomInteriors,
      interiors,
    );
  assert.equal(parsed.unitContent!["block-a-a-16"]?.roomInteriors, undefined);
  assert.equal(parsed.unitContent!["block-b-a-20"]?.roomInteriors, undefined);
  assert.equal(
    parsed.unitContent!["block-a-a-20"].paymentTerms,
    "Only this unit",
  );
});

test("room content validates media and size while legacy room labels resolve their count", () => {
  assert.equal(unitRoomCount(null, "А айл 3 өрөө"), 3);
  assert.equal(unitRoomCount(2, "А айл 3 өрөө"), 2);
  assert.equal(unitRoomCount(null, "Үйлчилгээ 3"), null);
  assert.equal(unitRoomCount(null, "21 өрөө"), null);
  assert.equal(parseUnitContent(emptyUnitContent()).roomInteriors, undefined);
  for (const roomInteriors of [
    Array(21).fill({ name: "", description: "", image: "" }),
    [{ name: "x", description: "", image: "https://invalid.test/image.jpg" }],
    [{ name: "x".repeat(101), description: "", image: "" }],
  ])
    assert.throws(() =>
      parseUnitContent({ ...emptyUnitContent(), roomInteriors }),
    );
});
