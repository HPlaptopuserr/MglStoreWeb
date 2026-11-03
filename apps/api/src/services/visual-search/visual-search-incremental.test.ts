import assert from "node:assert/strict";
import test from "node:test";
import {
  reconcileVisualImages,
  type CatalogSearchImage,
  type IncrementalSearchDependencies,
} from "./visual-search-incremental";
import { imageSourceHash, type VisualEntry } from "./visual-search-index";
import { buildVisualSnapshot } from "./visual-search-builder";
import { VisualIndexCache } from "./visual-search-cache";

function fixture() {
  const images: CatalogSearchImage[] = [
    { productId: "p", imageId: "one", url: "https://images/one" },
  ];
  const stored = new Map<string, VisualEntry>();
  const leases = new Map<string, string>();
  const failures = new Set<string>();
  let fetches = 0;
  let encodes = 0;
  const deps: IncrementalSearchDependencies = {
    images: async () => images,
    pending: async (catalog) =>
      catalog.filter(
        (image) =>
          !failures.has(image.imageId) &&
          stored.get(image.imageId)?.sourceHash !== imageSourceHash(image.url),
      ),
    claim: async (image, token) => {
      if (leases.has(image.imageId)) return false;
      leases.set(image.imageId, token);
      return true;
    },
    load: async (url) => {
      fetches++;
      return Buffer.from(url);
    },
    encode: async () => {
      encodes++;
      return [1, ...Array<number>(511).fill(0)];
    },
    complete: async (image, token, entry) => {
      if (leases.get(image.imageId) !== token) return;
      stored.set(image.imageId, entry);
      leases.delete(image.imageId);
    },
    fail: async (image) => {
      failures.add(image.imageId);
      leases.delete(image.imageId);
    },
    token: () => crypto.randomUUID(),
    now: () => 1,
  };
  return { images, stored, deps, counts: () => ({ fetches, encodes }) };
}

test("unchanged catalog after restart fetches and encodes zero images; one upload processes only itself", async () => {
  const f = fixture();
  await reconcileVisualImages(f.deps);
  assert.deepEqual(f.counts(), { fetches: 1, encodes: 1 });
  await reconcileVisualImages({ ...f.deps }); // fresh worker, same durable store
  assert.deepEqual(f.counts(), { fetches: 1, encodes: 1 });
  f.images.push({
    productId: "new",
    imageId: "two",
    url: "https://images/two",
  });
  await reconcileVisualImages(f.deps);
  assert.deepEqual(f.counts(), { fetches: 2, encodes: 2 });
  f.images[0].url = "https://images/replacement";
  await reconcileVisualImages(f.deps);
  assert.deepEqual(f.counts(), { fetches: 3, encodes: 3 });
  assert.equal(f.stored.size, 2);
});

test("two workers cannot encode the same claimed image concurrently", async () => {
  const f = fixture();
  await Promise.all([
    reconcileVisualImages(f.deps),
    reconcileVisualImages(f.deps),
  ]);
  assert.equal(f.counts().encodes, 1);
});

test("1,000 existing images plus one upload requires exactly one new embedding", async () => {
  const f = fixture();
  f.images.length = 0;
  for (let i = 0; i < 1000; i++) {
    const image = {
      productId: `p${i}`,
      imageId: `i${i}`,
      url: `https://images/${i}`,
    };
    f.images.push(image);
    f.stored.set(image.imageId, {
      productId: image.productId,
      imageId: image.imageId,
      sourceHash: imageSourceHash(image.url),
      contentHash: "a".repeat(64),
      vector: [1, ...Array<number>(511).fill(0)],
    });
  }
  await reconcileVisualImages(f.deps);
  assert.deepEqual(f.counts(), { fetches: 0, encodes: 0 });
  f.images.push({
    productId: "new",
    imageId: "new",
    url: "https://images/new",
  });
  await reconcileVisualImages(f.deps);
  assert.deepEqual(f.counts(), { fetches: 1, encodes: 1 });
  assert.equal(f.stored.size, 1001);
});

test("failed image is deferred without losing completed images or blocking later uploads", async () => {
  const f = fixture();
  f.images.push({
    productId: "new",
    imageId: "two",
    url: "https://images/two",
  });
  const load = f.deps.load;
  f.deps.load = async (url) => {
    if (url.endsWith("one")) throw new Error("unavailable image");
    return load(url);
  };
  const result = await reconcileVisualImages(f.deps);
  assert.equal(result.failed, 1);
  assert.equal(f.stored.has("two"), true);
  assert.equal((await reconcileVisualImages(f.deps)).pending, 0);
});

test("work budget bounds inference per pass", async () => {
  const f = fixture();
  let clock = 0;
  f.deps.now = () => (clock += 6000);
  await reconcileVisualImages(f.deps);
  assert.equal(f.counts().encodes, 0);
});

test("snapshot cache deduplicates reads, checks revisions cheaply and survives a process restart", async () => {
  let clock = 0;
  let revision = "one";
  let loads = 0;
  const deps = {
    now: () => clock,
    revision: async () => revision,
    load: async () => {
      loads++;
      return buildVisualSnapshot([], 0, 0);
    },
  };
  const cache = new VisualIndexCache(deps);
  await Promise.all([cache.get(), cache.get(), cache.get()]);
  assert.equal(loads, 1);
  clock = 16000;
  await cache.get();
  assert.equal(loads, 1);
  revision = "two";
  clock = 32000;
  await cache.get();
  assert.equal(loads, 2);
  await new VisualIndexCache(deps).get();
  assert.equal(loads, 3); // reloads vectors, never invokes the encoder
  clock += 300000;
  await cache.get();
  assert.equal(loads, 4); // reconcile public visibility even without vector changes
});

test("failed snapshot refresh is retried without caching a rejected promise", async () => {
  let fail = true;
  const cache = new VisualIndexCache({
    now: () => 0,
    revision: async () => "r",
    load: async () => {
      if (fail) throw new Error("database unavailable");
      return buildVisualSnapshot([], 0, 0);
    },
  });
  await assert.rejects(cache.get(), /database unavailable/);
  fail = false;
  assert.equal((await cache.get()).entries.length, 0);
});
