import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import { parseStagingManifest, planStaging, type StagingUser } from "./staging";

const user: StagingUser = {
  id: "test-user",
  isActive: true,
  deletedAt: null,
  passwordHash: null,
};

test("copied bcrypt hashes accept the original password and are independent values", async () => {
  const password = "fixture-original-password";
  const original = { ...user, passwordHash: await bcrypt.hash(password, 4) };
  const plan = planStaging(original, ["VENDOR", "STORE", "ORG"], []);
  assert.equal(plan.inserts.length, 3);
  for (const account of plan.inserts) {
    assert.equal(account.passwordHash, original.passwordHash);
    assert.ok(await bcrypt.compare(password, account.passwordHash!));
  }
  const vendor = plan.inserts.find((account) => account.platform === "VENDOR")!;
  vendor.passwordHash = await bcrypt.hash("fixture-vendor-password", 4);
  assert.equal(await bcrypt.compare(password, vendor.passwordHash), false);
  for (const account of plan.inserts.filter(
    (account) => account.platform !== "VENDOR",
  )) {
    assert.ok(await bcrypt.compare(password, account.passwordHash!));
    assert.equal(
      await bcrypt.compare("fixture-vendor-password", account.passwordHash!),
      false,
    );
  }
  assert.ok(await bcrypt.compare(password, original.passwordHash));
});

test("rerunning never resets existing active, disabled or staged credentials", () => {
  const original = { ...user, passwordHash: "legacy-hash" };
  const accounts = [
    { platform: "VENDOR", passwordHash: "new-vendor-hash", status: "ACTIVE" },
    { platform: "STORE", passwordHash: null, status: "DISABLED" },
    { platform: "ORG", passwordHash: "older-hash", status: "STAGED" },
  ] as const;
  const snapshot = structuredClone(accounts);
  assert.deepEqual(
    planStaging(original, ["VENDOR", "STORE", "ORG"], accounts),
    {
      inserts: [],
      existing: 3,
      stale: 1,
    },
  );
  assert.deepEqual(accounts, snapshot);
});

test("passwordless invited users remain passwordless; no grants are copied", () => {
  assert.deepEqual(planStaging(user, ["VENDOR"], []).inserts, [
    { userId: user.id, platform: "VENDOR", passwordHash: null },
  ]);
});

test("inactive and deleted users cannot be silently staged", () => {
  assert.throws(() => planStaging({ ...user, isActive: false }, ["STORE"], []));
  assert.throws(() =>
    planStaging({ ...user, deletedAt: new Date() }, ["STORE"], []),
  );
});

test("manifest requires explicit unique assignments and forbids credentials", () => {
  assert.deepEqual(
    parseStagingManifest([{ userId: "u", platforms: ["STORE", "ORG"] }]),
    [{ userId: "u", platforms: ["STORE", "ORG"] }],
  );
  for (const invalid of [
    [],
    null,
    [{ userId: "u", platforms: [] }],
    [{ userId: "u", platforms: ["UNKNOWN"] }],
    [{ userId: "u", platforms: ["STORE", "STORE"] }],
    [{ userId: "u", platforms: ["STORE"], password: "must-not-be-here" }],
    [{ userId: " u", platforms: ["STORE"] }],
    [
      { userId: "u", platforms: ["STORE"] },
      { userId: "u", platforms: ["ORG"] },
    ],
  ])
    assert.throws(() => parseStagingManifest(invalid));
});
