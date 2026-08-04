import assert from "node:assert/strict";
import test from "node:test";
import {
  MEMBERSHIP_SPONSORED_PLAN_ID,
  isPersonalMembershipActive,
  resolveVendorPlanEntitlementFromRecords,
  type OrganizationPlanRecord,
} from "./vendor-plan-entitlement.service";

const now = new Date("2026-08-04T00:00:00.000Z");
const organization: OrganizationPlanRecord = {
  id: "org-1",
  name: "Partner store",
  slug: "partner-store",
  subdomainEnabled: false,
  planType: null,
  planActivatedAt: null,
  planExpiresAt: null,
  trialUsed: false,
};

test("active login member membership activates vendor entitlement", () => {
  const expiresAt = new Date("2026-09-01T00:00:00.000Z");
  const result = resolveVendorPlanEntitlementFromRecords(
    organization,
    [
      {
        userId: "member-1",
        membershipPaidAt: now,
        membershipStartedAt: now,
        membershipExpiresAt: expiresAt,
      },
    ],
    now,
  );

  assert.equal(result.isActive, true);
  assert.equal(result.source, "MEMBER_MEMBERSHIP");
  assert.equal(result.effectivePlanType, MEMBERSHIP_SPONSORED_PLAN_ID);
  assert.equal(result.effectivePlanExpiresAt, expiresAt);
});

test("organization paid plan takes precedence over member sponsorship", () => {
  const result = resolveVendorPlanEntitlementFromRecords(
    {
      ...organization,
      subdomainEnabled: true,
      planType: "gold_1m",
      planExpiresAt: new Date("2026-08-20T00:00:00.000Z"),
    },
    [
      {
        userId: "member-1",
        membershipPaidAt: now,
        membershipStartedAt: now,
        membershipExpiresAt: null,
      },
    ],
    now,
  );

  assert.equal(result.source, "ORGANIZATION_PLAN");
  assert.equal(result.effectivePlanType, "gold_1m");
});

test("no eligible member leaves expired organization plan inactive", () => {
  const result = resolveVendorPlanEntitlementFromRecords(
    {
      ...organization,
      subdomainEnabled: true,
      planType: "trial",
      planExpiresAt: new Date("2026-08-01T00:00:00.000Z"),
    },
    [],
    now,
  );

  assert.equal(result.isActive, false);
  assert.equal(result.source, "NONE");
});

test("personal membership requires prime flag and a future or open expiry", () => {
  assert.equal(
    isPersonalMembershipActive(
      { isPrime: true, membershipExpiresAt: null },
      now,
    ),
    true,
  );
  assert.equal(
    isPersonalMembershipActive(
      {
        isPrime: true,
        membershipExpiresAt: new Date("2026-08-05T00:00:00.000Z"),
      },
      now,
    ),
    true,
  );
  assert.equal(
    isPersonalMembershipActive(
      {
        isPrime: true,
        membershipExpiresAt: new Date("2026-08-03T00:00:00.000Z"),
      },
      now,
    ),
    false,
  );
  assert.equal(
    isPersonalMembershipActive(
      { isPrime: false, membershipExpiresAt: null },
      now,
    ),
    false,
  );
});
