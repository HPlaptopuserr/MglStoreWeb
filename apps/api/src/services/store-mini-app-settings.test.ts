import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { prisma } from "@mgl/database";
import {
  emptyStoreMiniAppSettings,
  normalizeMiniAppPhone,
  parseStoreMiniAppSettings,
} from "@mgl/types";
import {
  assertMiniAppOrderAccess,
  canOrderVendorMiniApp,
  resolvePhoneGrants,
  type StoredMiniApps,
} from "./store-mini-app-settings";
const restores: Array<() => void> = [];
function stub(target: object, key: string, value: unknown) {
  const previous: unknown = Reflect.get(target, key);
  Reflect.set(target, key, value);
  restores.push(() => {
    Reflect.set(target, key, previous);
  });
}
afterEach(() => {
  while (restores.length) restores.pop()?.();
});
function config(): StoredMiniApps {
  const settings = emptyStoreMiniAppSettings();
  settings["store-owners"] = {
    enabled: true,
    sourceIds: ["vendor"],
    allowedPhones: ["99112233"],
  };
  return { settings, grants: [{ phone: "99112233", userId: "approved" }] };
}
test("phone normalization accepts Mongolian international numbers without arbitrary suffix matching", () => {
  assert.equal(normalizeMiniAppPhone("+976 9911-2233"), "99112233");
  assert.equal(normalizeMiniAppPhone("99112233"), "99112233");
  assert.equal(normalizeMiniAppPhone("197699112233"), null);
  assert.equal(normalizeMiniAppPhone("abc99112233"), null);
});
test("settings validate source requirements and deduplicate grants", () => {
  const settings = config().settings;
  settings["store-owners"].allowedPhones = ["99112233", "+97699112233", ""];
  assert.deepEqual(
    parseStoreMiniAppSettings(settings)["store-owners"].allowedPhones,
    ["99112233"],
  );
  settings["store-owners"].sourceIds = [];
  assert.throws(() => parseStoreMiniAppSettings(settings));
  assert.throws(() => parseStoreMiniAppSettings({}));
});
test("access is bound to account, removed grants and disabled apps deny orders", () => {
  const value = config();
  assert.equal(canOrderVendorMiniApp(value, "approved"), true);
  assert.equal(canOrderVendorMiniApp(value, "other-user"), false);
  value.settings["store-owners"].allowedPhones = [];
  assert.equal(canOrderVendorMiniApp(value, "approved"), false);
  value.settings["store-owners"].allowedPhones = ["99112233"];
  value.settings["store-owners"].enabled = false;
  assert.equal(canOrderVendorMiniApp(value, "approved"), false);
});
test("checkout enforces selected vendor restrictions even without a mini app id", async () => {
  stub(prisma.siteSetting, "findUnique", async () => ({
    value: JSON.stringify(config()),
  }));
  assert.equal(
    await assertMiniAppOrderAccess("other-user", [
      { organizationId: "vendor", managedByWarehouseId: null },
    ]),
    false,
  );
  assert.equal(
    await assertMiniAppOrderAccess("approved", [
      { organizationId: "vendor", managedByWarehouseId: null },
    ]),
    true,
  );
  assert.equal(
    await assertMiniAppOrderAccess("other-user", [
      { organizationId: "other", managedByWarehouseId: null },
    ]),
    true,
  );
  assert.equal(
    await assertMiniAppOrderAccess("other-user", [
      { organizationId: "vendor", managedByWarehouseId: "central" },
    ]),
    true,
  );
});
test("unknown and duplicate registered phones cannot silently grant access", async () => {
  stub(prisma.profile, "findMany", async () => [
    { userId: "one", phoneNumber: "+976 99112233" },
  ]);
  assert.deepEqual(await resolvePhoneGrants(["99112233"]), [
    { phone: "99112233", userId: "one" },
  ]);
  await assert.rejects(resolvePhoneGrants(["88112233"]));
  stub(prisma.profile, "findMany", async () => [
    { userId: "one", phoneNumber: "99112233" },
    { userId: "two", phoneNumber: "+97699112233" },
  ]);
  await assert.rejects(resolvePhoneGrants(["99112233"]));
});

test("checkout rejects stale or forged mini app source selections", async () => {
  const value = config();
  value.settings["shared-store"] = {
    enabled: true,
    sourceIds: ["selected"],
    allowedPhones: [],
  };
  stub(prisma.siteSetting, "findUnique", async () => ({
    value: JSON.stringify(value),
  }));
  assert.equal(
    await assertMiniAppOrderAccess("approved", [
      {
        organizationId: "vendor",
        managedByWarehouseId: null,
        miniAppId: "unknown",
      },
    ]),
    false,
  );
  assert.equal(
    await assertMiniAppOrderAccess("approved", [
      {
        organizationId: "vendor",
        managedByWarehouseId: "other",
        miniAppId: "shared-store",
      },
    ]),
    false,
  );
  assert.equal(
    await assertMiniAppOrderAccess("approved", [
      {
        organizationId: "vendor",
        managedByWarehouseId: "selected",
        miniAppId: "shared-store",
      },
    ]),
    true,
  );
  assert.equal(
    await assertMiniAppOrderAccess("approved", [
      {
        organizationId: "unselected",
        managedByWarehouseId: null,
        miniAppId: "store-owners",
      },
    ]),
    false,
  );
});
