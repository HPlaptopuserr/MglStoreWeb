import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCommunityResponse } from "./community-2003";

const valid = {
  name: " Бат ",
  profession: "Инженер",
  phone: "99112233",
  business: "no",
  consent: "yes",
};
test("normalizes answers and strips unrelated fields", () => {
  const result = parseCommunityResponse({
    ...valid,
    industry: "stale",
    secret: "ignored",
  });
  assert.equal(result?.name, "Бат");
  assert.equal(result?.industry, "");
  assert.equal(result?.secret, undefined);
});
test("requires industry for business owners", () => {
  assert.equal(parseCommunityResponse({ ...valid, business: "yes" }), null);
  assert.equal(
    parseCommunityResponse({ ...valid, business: "yes", industry: "IT" })
      ?.industry,
    "IT",
  );
});
test("rejects malformed, oversized, and unconsented submissions", () => {
  for (const input of [
    null,
    [],
    { ...valid, phone: "abc" },
    { ...valid, consent: "" },
    { ...valid, business: "unknown" },
    { ...valid, name: [] },
    { ...valid, notes: "x".repeat(1001) },
    { ...valid, profession: " " },
  ]) {
    assert.equal(parseCommunityResponse(input), null);
  }
});
