import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveBuildingBlock } from "./building-place-resolver";
test("resolves Cyrillic, encoded and Latin visual block labels", () => {
 const blocks = [{ id: "block-1", name: "А" }];
 for (const segment of ["А", "A", "%D0%90", "block-1"]) assert.equal(resolveBuildingBlock(blocks, segment)?.id, "block-1");
 assert.equal(resolveBuildingBlock(blocks, "B"), undefined);
 assert.equal(resolveBuildingBlock(blocks, "%"), undefined);
});
test("does not choose arbitrarily between duplicate block names", () => {
 assert.equal(resolveBuildingBlock([{id:"1",name:"А"},{id:"2",name:"А"}], "A"),undefined);
});
