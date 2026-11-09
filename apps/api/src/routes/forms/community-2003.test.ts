import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseCommunityResponse,
  toPublicCommunityMember,
} from "./community-2003";

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

test("keeps legacy and non-public registrations out of the directory", () => {
  assert.equal(toPublicCommunityMember("old", valid), null);
  assert.equal(
    toPublicCommunityMember("private", { ...valid, publishConsent: "" }),
    null,
  );
  assert.equal(
    parseCommunityResponse({ ...valid, publishConsent: "no" }),
    null,
  );
  assert.equal(
    toPublicCommunityMember("invalid", {
      ...valid,
      publishConsent: "yes",
      phone: "invalid",
    }),
    null,
  );
});

test("publishes only profile fields and maps each activity category", () => {
  for (const [business, activity] of [
    ["no", "employed"],
    ["yes", "business"],
    ["planning", "planning"],
  ]) {
    const member = toPublicCommunityMember("member-id", {
      ...valid,
      business,
      industry: "IT",
      businessName: "Example",
      city: "Улаанбаатар",
      notes: "Танилцуулга",
      publishConsent: "yes",
      secret: "private",
    });
    assert.ok(member);
    assert.deepEqual(member, {
      id: "member-id",
      activity,
      name: "Бат",
      city: "Улаанбаатар",
      profession: "Инженер",
      role: "Инженер",
      organization: business === "yes" ? "Example" : "",
      sector: business === "yes" ? "IT" : "Инженер",
      bio: "Танилцуулга",
      offers: [],
      needs: [],
    });
  }
});
