import assert from "node:assert/strict";
import test from "node:test";
import { CatalogResource } from "./catalog-resource";
import {
  catalogKey,
  CATALOG_FRESH_MS,
  CATALOG_MAX_AGE_MS,
  type CatalogFetcher,
  type CatalogPersistence,
  type CatalogResponse,
  type CatalogSnapshot,
} from "./catalog-model";

const products = Array.from({ length: 5001 }, (_, index) => ({
  id: `p${index}`,
  name: `Product ${index}`,
  sku: `SKU${index}`,
  price: 1000,
  stockQty: 10,
  isActive: true,
}));
const timestamp = 1_800_000_000_000;
const snapshot = (updatedAt = timestamp): CatalogSnapshot => ({
  version: 1,
  products,
  count: products.length,
  updatedAt,
  etag: '"v1"',
});
function persistence(saved: unknown = null) {
  const rows = new Map<string, unknown>([["key", saved]]);
  const storage: CatalogPersistence = {
    read: async (key) => rows.get(key),
    write: async (key, value) => {
      rows.set(key, value);
    },
    remove: async (key) => {
      rows.delete(key);
    },
  };
  return { storage, rows };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test("a fresh persistent cache restores every product without another download", async () => {
  const { storage } = persistence(snapshot());
  let calls = 0;
  const resource = new CatalogResource(
    "key",
    async () => {
      calls++;
      return { unchanged: false, products: [], etag: null };
    },
    storage,
    () => timestamp + 1000,
  );
  await resource.start();
  await resource.start();
  assert.equal(calls, 0);
  assert.equal(resource.getSnapshot().products.length, 5001);
  assert.equal(resource.getSnapshot().products.at(-1)?.id, "p5000");
});

test("simultaneous consumers share one download and a 304 retains the complete snapshot", async () => {
  const { storage } = persistence(snapshot(timestamp - CATALOG_FRESH_MS));
  const response = deferred<CatalogResponse>();
  let calls = 0;
  const resource = new CatalogResource(
    "key",
    async (_signal, etag) => {
      calls++;
      assert.equal(etag, '"v1"');
      return response.promise;
    },
    storage,
    () => timestamp,
  );
  const a = resource.start();
  const b = resource.start();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 1);
  assert.equal(resource.getSnapshot().products.length, 5001);
  assert.equal(resource.getSnapshot().refreshing, true);
  response.resolve({ unchanged: true, etag: '"v1"' });
  await Promise.all([a, b]);
  assert.equal(resource.getSnapshot().updatedAt, timestamp);
  assert.equal(resource.getSnapshot().products.length, 5001);
});

test("returning to POS after a product mutation refreshes even a fresh saved catalog", async () => {
  const { storage } = persistence(snapshot());
  let calls = 0;
  const resource = new CatalogResource(
    "key",
    async () => {
      calls++;
      return {
        unchanged: false,
        etag: '"new"',
        products: [...products, { ...products[0]!, id: "new-product" }],
      };
    },
    storage,
    () => timestamp + 1000,
  );
  await resource.start(timestamp + 500);
  assert.equal(calls, 1);
  assert.equal(resource.getSnapshot().products.length, 5002);
  await resource.start(timestamp + 500);
  assert.equal(calls, 1);
});

test("failed or corrupt downloads preserve the last complete list", async () => {
  const { storage, rows } = persistence(snapshot());
  let fail = false;
  const fetcher: CatalogFetcher = async () => {
    if (fail) throw new TypeError("Network unavailable");
    return {
      unchanged: false,
      etag: '"bad"',
      products: [products[0]!, products[0]!],
    };
  };
  const resource = new CatalogResource(
    "key",
    fetcher,
    storage,
    () => timestamp,
  );
  await resource.start();
  await resource.refresh(true);
  assert.equal(resource.getSnapshot().products.length, 5001);
  assert.ok(resource.getSnapshot().error);
  fail = true;
  await resource.refresh(true);
  assert.equal(resource.getSnapshot().products.length, 5001);
  assert.equal((rows.get("key") as CatalogSnapshot).etag, '"v1"');
});

test("new full snapshots add new products and remove deleted or deactivated products atomically", async () => {
  const { storage } = persistence(snapshot());
  const replacement = [
    ...products.slice(1),
    { ...products[0]!, id: "new-product" },
  ];
  const resource = new CatalogResource(
    "key",
    async () => ({ unchanged: false, etag: '"v2"', products: replacement }),
    storage,
    () => timestamp,
  );
  await resource.start();
  await resource.refresh(true);
  assert.equal(resource.getSnapshot().products.length, 5001);
  assert.equal(
    resource.getSnapshot().products.some((p) => p.id === "p0"),
    false,
  );
  assert.equal(resource.getSnapshot().products.at(-1)?.id, "new-product");
});

test("an older in-flight response cannot overwrite a forced refresh after a sale", async () => {
  const { storage, rows } = persistence();
  const old = deferred<CatalogResponse>();
  let calls = 0;
  const resource = new CatalogResource(
    "key",
    async () =>
      ++calls === 1
        ? old.promise
        : {
            unchanged: false,
            etag: '"v2"',
            products: [{ ...products[0]!, stockQty: 9 }],
          },
    storage,
    () => timestamp,
  );
  const first = resource.refresh();
  await resource.refresh(true);
  old.resolve({ unchanged: false, etag: '"v1"', products });
  await first;
  assert.equal(resource.getSnapshot().products[0]?.stockQty, 9);
  assert.equal((rows.get("key") as CatalogSnapshot).etag, '"v2"');
});

test("revoked access removes the cached catalog; a real empty catalog replaces old products", async () => {
  for (const status of [401, 403]) {
    const { storage, rows } = persistence(snapshot());
    const resource = new CatalogResource(
      "key",
      async () => {
        throw Object.assign(new Error("Access denied"), { status });
      },
      storage,
      () => timestamp,
    );
    await resource.start();
    await resource.refresh(true);
    assert.equal(resource.getSnapshot().hasSnapshot, false);
    assert.equal(rows.has("key"), false);
  }
  const { storage } = persistence(snapshot());
  const resource = new CatalogResource(
    "key",
    async () => ({ unchanged: false, products: [], etag: '"empty"' }),
    storage,
    () => timestamp,
  );
  await resource.start();
  await resource.refresh(true);
  assert.equal(resource.getSnapshot().hasSnapshot, true);
  assert.equal(resource.getSnapshot().products.length, 0);
});

test("expired, incomplete and future-dated cache entries are never treated as complete", async () => {
  for (const saved of [
    snapshot(timestamp - CATALOG_MAX_AGE_MS - 1),
    { ...snapshot(), count: 5002 },
    snapshot(timestamp + 1),
  ]) {
    const { storage } = persistence(saved);
    const resource = new CatalogResource(
      "key",
      async () => ({ unchanged: false, products: [products[0]!], etag: null }),
      storage,
      () => timestamp,
    );
    await resource.start();
    assert.equal(resource.getSnapshot().products.length, 1);
  }
});

test("cache keys isolate API environments, accounts, organizations and branches", () => {
  const scope = {
    api: "https://api.test",
    userId: "u1",
    organizationId: "o1",
    kind: "branch" as const,
    id: "b1",
  };
  const keys = [
    scope,
    { ...scope, api: "http://localhost:4000" },
    { ...scope, userId: "u2" },
    { ...scope, organizationId: "o2" },
    { ...scope, id: "b2" },
    { ...scope, kind: "organization" as const },
  ].map(catalogKey);
  assert.equal(new Set(keys).size, keys.length);
});
