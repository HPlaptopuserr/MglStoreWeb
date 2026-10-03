import assert from "node:assert/strict";
import test from "node:test";
import {
  createIdentityLinkDryRunReport,
  type IdentityCandidateUser
} from "./identity-link-report";

function user(
  id: string,
  overrides: Partial<IdentityCandidateUser> = {}
): IdentityCandidateUser {
  return {
    id,
    email: `${id}@example.com`,
    emailVerified: true,
    identitySubject: null,
    isActive: true,
    deletedAt: null,
    ...overrides
  };
}

test("reports eligible users without emitting personal data", () => {
  const report = createIdentityLinkDryRunReport([user("one"), user("two")]);

  assert.equal(report.eligibleUsers, 2);
  assert.equal(JSON.stringify(report).includes("@example.com"), false);
  assert.equal(JSON.stringify(report).includes("one"), false);
});

test("separates linked, inactive, unverified, and invalid users", () => {
  const report = createIdentityLinkDryRunReport([
    user("linked", { identitySubject: "subject-1" }),
    user("inactive", { isActive: false }),
    user("unverified", { emailVerified: false }),
    user("invalid", { email: "invalid" })
  ]);

  assert.equal(report.alreadyLinked, 1);
  assert.equal(report.excludedInactiveOrDeleted, 1);
  assert.equal(report.blockedWithoutVerifiedEmail, 1);
  assert.equal(report.blockedInvalidEmail, 1);
  assert.equal(report.eligibleUsers, 0);
});

test("routes normalized email collisions to manual review", () => {
  const report = createIdentityLinkDryRunReport([
    user("one", { email: "PERSON@example.com" }),
    user("two", { email: " person@example.com " })
  ]);

  assert.equal(report.normalizedEmailCollisionGroups, 1);
  assert.equal(report.manualReviewUsers, 2);
  assert.equal(report.eligibleUsers, 0);
});
