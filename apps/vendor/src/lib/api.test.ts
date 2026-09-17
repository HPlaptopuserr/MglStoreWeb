import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { authFetch } from "./api";
import { VENDOR_TOKEN_KEY, VENDOR_USER_KEY } from "./vendor-session-storage";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalStorage = Object.getOwnPropertyDescriptor(
  globalThis,
  "localStorage",
);

afterEach(() => {
  mock.restoreAll();
  for (const [key, descriptor] of [
    ["window", originalWindow],
    ["localStorage", originalStorage],
  ] as const) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

function mockBrowser() {
  const values = new Map([
    [VENDOR_TOKEN_KEY, "old-token"],
    [VENDOR_USER_KEY, "old-user"],
  ]);
  const redirects: string[] = [];
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { location: { replace: (url: string) => redirects.push(url) } },
  });
  return { values, redirects };
}

test("an in-flight request using the old token cannot log out the new store", async () => {
  const { values, redirects } = mockBrowser();
  mock.method(
    globalThis,
    "fetch",
    async (_input: unknown, init: RequestInit) => {
      assert.equal(
        new Headers(init.headers).get("Authorization"),
        "Bearer old-token",
      );
      values.set(VENDOR_TOKEN_KEY, "new-token");
      values.set(VENDOR_USER_KEY, "new-user");
      return new Response(null, { status: 401 });
    },
  );
  await authFetch("http://test.invalid/stats");
  assert.equal(values.get(VENDOR_TOKEN_KEY), "new-token");
  assert.equal(values.get(VENDOR_USER_KEY), "new-user");
  assert.deepEqual(redirects, []);
});

test("401 for the current token clears the expired session and redirects to login", async () => {
  const { values, redirects } = mockBrowser();
  mock.method(
    globalThis,
    "fetch",
    async () => new Response(null, { status: 401 }),
  );
  await authFetch("http://test.invalid/stats");
  assert.equal(values.has(VENDOR_TOKEN_KEY), false);
  assert.equal(values.has(VENDOR_USER_KEY), false);
  assert.deepEqual(redirects, ["/login"]);
});

test("401 for an explicit different credential cannot clear the vendor session", async () => {
  const { values, redirects } = mockBrowser();
  mock.method(
    globalThis,
    "fetch",
    async () => new Response(null, { status: 401 }),
  );
  await authFetch("http://test.invalid/stats", {
    headers: { Authorization: "Bearer other-token" },
  });
  assert.equal(values.get(VENDOR_TOKEN_KEY), "old-token");
  assert.deepEqual(redirects, []);
});
