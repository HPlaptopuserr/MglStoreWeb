import assert from "node:assert/strict";
import { test } from "node:test";
import { BuildingInputError, parseBuildingProject } from "./project-input";
const valid = {
  title: " River Garden ",
  slug: "river-garden",
};
test("project input normalizes text and cannot accept publication or verification from create", () => {
  const result = parseBuildingProject({
    ...valid,
    status: "PUBLISHED",
    verification: "VERIFIED",
  });
  assert.equal(result.title, "River Garden");
  assert.equal("status" in result, false);
  assert.equal("verification" in result, false);
});
test("project input rejects client organization overrides, unsafe URLs, invalid slug and oversized names", () => {
  for (const patch of [
    { organizationId: "other-org" },
    { coverImageUrl: "javascript:alert(1)" },
    { coverImageUrl: "https://user:secret@example.com/x" },
    { slug: "../admin" },
    { title: "a".repeat(181) },
  ]) {
    assert.throws(
      () => parseBuildingProject({ ...valid, ...patch }),
      BuildingInputError,
    );
  }
});
