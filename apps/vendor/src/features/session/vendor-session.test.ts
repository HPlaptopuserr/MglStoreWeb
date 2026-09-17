import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import {
  loadVendorSession,
  loadVendorSettings,
  switchVendorOrganization,
  VendorSessionExpiredError,
} from "./vendor-session.api";
import {
  canSwitchToOrganization,
  organizationDestination,
  parseVendorSessionUser,
  vendorAccessMode,
} from "./vendor-session.model";
import {
  clearVendorSessionIfCurrent,
  saveVendorSession,
  VENDOR_TOKEN_KEY,
  VENDOR_USER_KEY,
  type VendorSessionStorage,
} from "../../lib/vendor-session-storage";

const owner = {
  id: "user",
  fullName: "Test owner",
  email: "owner@example.test",
  organizationId: "store-b",
  organizationName: "Store B",
  orgRole: "OWNER",
  capabilities: [],
  organizations: [
    {
      id: "store-a",
      name: "Store A",
      role: "OWNER",
      capabilities: [],
      status: "ACTIVE",
    },
  ],
};

function storage(): VendorSessionStorage {
  const values = new Map([
    [VENDOR_TOKEN_KEY, "old-token"],
    [VENDOR_USER_KEY, "old-user"],
  ]);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

function respond(body: unknown, status = 200) {
  mock.method(
    globalThis,
    "fetch",
    async () => new Response(JSON.stringify(body), { status }),
  );
}

afterEach(() => mock.restoreAll());

test("valid owner-to-owner switch returns the requested context and token", async () => {
  respond({ accessToken: "new-token", user: owner });
  const result = await switchVendorOrganization(
    "http://test.invalid",
    "old-token",
    "store-b",
  );
  const session = storage();
  saveVendorSession(session, "old-token", result.accessToken, result.user);
  assert.equal(result.mode, "owner");
  assert.equal(session.getItem(VENDOR_TOKEN_KEY), "new-token");
  assert.equal(
    JSON.parse(session.getItem(VENDOR_USER_KEY)!).organizationName,
    "Store B",
  );
});

test("unsupported roles and mismatched destination responses never replace the existing session", async () => {
  const session = storage();
  for (const user of [
    { ...owner, orgRole: "STAFF" },
    { ...owner, organizationId: "wrong-store" },
  ]) {
    respond({ accessToken: "new-token", user });
    await assert.rejects(async () => {
      const result = await switchVendorOrganization(
        "http://test.invalid",
        "old-token",
        "store-b",
      );
      saveVendorSession(session, "old-token", result.accessToken, result.user);
    });
    assert.equal(session.getItem(VENDOR_TOKEN_KEY), "old-token");
    assert.equal(session.getItem(VENDOR_USER_KEY), "old-user");
  }
});

test("only genuine 401 responses expire authentication; 403, 500 and network failures remain recoverable", async () => {
  respond({}, 401);
  await assert.rejects(
    loadVendorSession(
      "http://test.invalid",
      "old-token",
      new AbortController().signal,
    ),
    VendorSessionExpiredError,
  );
  for (const status of [403, 500, 503]) {
    respond({ message: "Temporary failure" }, status);
    await assert.rejects(
      loadVendorSession(
        "http://test.invalid",
        "old-token",
        new AbortController().signal,
      ),
      (error: unknown) =>
        error instanceof Error && !(error instanceof VendorSessionExpiredError),
    );
  }
  mock.method(globalThis, "fetch", async () => {
    throw new TypeError("Network unavailable");
  });
  await assert.rejects(
    switchVendorOrganization("http://test.invalid", "old-token", "store-b"),
    TypeError,
  );
});

test("malformed successful switch responses are rejected before persisting a token", async () => {
  for (const body of [
    null,
    {},
    { accessToken: "", user: owner },
    { accessToken: "new-token", user: {} },
  ]) {
    respond(body);
    await assert.rejects(
      switchVendorOrganization("http://test.invalid", "old-token", "store-b"),
    );
  }
});

test("optional settings failures cannot invalidate the user's authentication", async () => {
  respond({}, 500);
  assert.deepEqual(
    await loadVendorSettings(
      "http://test.invalid",
      new AbortController().signal,
    ),
    {},
  );
  mock.method(globalThis, "fetch", async () => {
    throw new TypeError("Offline");
  });
  assert.deepEqual(
    await loadVendorSettings(
      "http://test.invalid",
      new AbortController().signal,
    ),
    {},
  );
});

test("late 401 for the old token cannot clear a newly selected account", () => {
  const session = storage();
  saveVendorSession(session, "old-token", "new-token", owner);
  assert.equal(clearVendorSessionIfCurrent(session, "old-token"), false);
  assert.equal(session.getItem(VENDOR_TOKEN_KEY), "new-token");
  assert.equal(clearVendorSessionIfCurrent(session, "new-token"), true);
  assert.equal(session.getItem(VENDOR_TOKEN_KEY), null);
  assert.equal(session.getItem(VENDOR_USER_KEY), null);
});

test("a delayed switch result cannot overwrite another tab's newer session", () => {
  const session = storage();
  session.setItem(VENDOR_TOKEN_KEY, "other-tab-token");
  assert.throws(() =>
    saveVendorSession(session, "old-token", "new-token", owner),
  );
  assert.equal(session.getItem(VENDOR_TOKEN_KEY), "other-tab-token");
  assert.equal(session.getItem(VENDOR_USER_KEY), "old-user");
});

test("a failed token write restores the previous user context", () => {
  const session = storage();
  const setItem = session.setItem;
  session.setItem = (key, value) => {
    if (key === VENDOR_TOKEN_KEY) throw new Error("Storage unavailable");
    setItem(key, value);
  };
  assert.throws(() =>
    saveVendorSession(session, "old-token", "new-token", owner),
  );
  assert.equal(session.getItem(VENDOR_TOKEN_KEY), "old-token");
  assert.equal(session.getItem(VENDOR_USER_KEY), "old-user");
});

test("switcher offers only active owner or explicitly assigned cashier contexts", () => {
  const organization = owner.organizations[0];
  assert.equal(canSwitchToOrganization(organization), true);
  assert.equal(
    canSwitchToOrganization({ ...organization, role: "STAFF" }),
    false,
  );
  assert.equal(
    canSwitchToOrganization({ ...organization, status: "SUSPENDED" }),
    false,
  );
  assert.equal(
    canSwitchToOrganization({
      ...organization,
      role: "STAFF",
      capabilities: ["POS_CASHIER"],
    }),
    true,
  );
  assert.equal(vendorAccessMode("ADMIN", []), null);
});

test("cashier switches navigate before restricted dashboard content can mount", () => {
  assert.equal(organizationDestination("cashier", "/dashboard"), "/pos");
  assert.equal(organizationDestination("cashier", "/employees"), "/pos");
  assert.equal(organizationDestination("cashier", "/inventory"), "/inventory");
  assert.equal(organizationDestination("owner", "/dashboard"), "/dashboard");
});

test("profile hydration keeps the server's selected organization name and validates malformed profiles", () => {
  assert.equal(parseVendorSessionUser(owner).organizationName, "Store B");
  assert.throws(() => parseVendorSessionUser(null));
  assert.throws(() => parseVendorSessionUser({ organizations: [] }));
});
