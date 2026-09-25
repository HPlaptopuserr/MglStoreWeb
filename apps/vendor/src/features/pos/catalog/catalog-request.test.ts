import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { requestCatalog } from "./catalog-request";

afterEach(() => mock.restoreAll());

test("conditional catalog reads accept 304 without attempting to parse JSON", async () => {
  mock.method(globalThis, "fetch", async (_url: unknown, init: RequestInit) => {
    assert.equal(new Headers(init.headers).get("If-None-Match"), '"v1"');
    return new Response(null, { status: 304, headers: { ETag: '"v1"' } });
  });
  assert.deepEqual(
    await requestCatalog("https://test.invalid/catalog", undefined, '"v1"'),
    { unchanged: true, etag: '"v1"' },
  );
});

test("partial, truncated and unexpected response shapes cannot replace the cached catalog", async () => {
  for (const body of [
    { products: [{ id: "a" }], total: 494, hasMore: true },
    { products: [], total: 494 },
    { error: "broken" },
  ]) {
    mock.method(globalThis, "fetch", async () => Response.json(body));
    await assert.rejects(
      requestCatalog("https://test.invalid/catalog"),
      /бүрэн/,
    );
    mock.restoreAll();
  }
  mock.method(globalThis, "fetch", async () =>
    Response.json([], { headers: { "X-MGL-Catalog-Count": "494" } }),
  );
  await assert.rejects(requestCatalog("https://test.invalid/catalog"), /бүрэн/);
});
