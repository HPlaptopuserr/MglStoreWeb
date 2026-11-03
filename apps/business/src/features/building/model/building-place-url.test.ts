import assert from "node:assert/strict";
import { test } from "node:test";
import { buildingPlaceUrl } from "./building-place-url";
test("readable hierarchy keeps preview and public URLs separate", () => {
  assert.equal(
    decodeURIComponent(
      buildingPlaceUrl({ slug: "111" }, true, "А", 17, "1753"),
    ),
    "/building/preview/111/А/17/1753",
  );
  assert.equal(
    buildingPlaceUrl({ slug: "euro-plaza" }, false, "A", 20, "2053"),
    "/building/hotkhon/euro-plaza/A/20/2053",
  );
  assert.equal(
    buildingPlaceUrl({ slug: "111" }, true),
    "/building/preview/111",
  );
});
test("URL segments encode reserved characters and retain basement and unit labels", () => {
  assert.equal(
    buildingPlaceUrl({ slug: "test" }, true, "A/B", -1, "01 #2"),
    "/building/preview/test/A%2FB/-1/01%20%232",
  );
});

test("block routes resolve their project block in preview and public modes", async () => {
  const { resolveBuildingBlock } = await import("./building-place-resolver");
  const blocks = [{id: "a-block", name: "А"}];
  for (const preview of [true, false]) {
    const url = buildingPlaceUrl({slug: "111"}, preview, blocks[0].name);
    const segments = url.split("/");
    assert.equal(segments[2], preview ? "preview" : "hotkhon");
    assert.equal(segments[3], "111");
    assert.equal(resolveBuildingBlock(blocks, segments[4])?.id, "a-block");
  }
});
