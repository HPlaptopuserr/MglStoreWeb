import { loadVisualCatalogImage } from "./visual-search-image-source";
import { ProductImageDeliveryError } from "../../lib/product-image-errors";
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  buildVisualEntry,
  buildVisualSnapshot,
  withVisualIndexLock,
} from "./visual-search-builder";
import {
  EMBEDDING_VERSION,
  saveIndex,
  readIndex,
  parseIndex,
} from "./visual-search-index";
import { VisualSearchQueue } from "./visual-search-queue";
import { VisualSearchError, visualSearchEnabled } from "./visual-search-errors";
import {
  parseVisualSearchOptions,
  defaultVisualSearchOptions,
  visualSearchFilter,
} from "./visual-search-options";
import { rankHybridMatches } from "./visual-search-ranking";

const vector = [1, ...Array<number>(511).fill(0)];
const entryInput = {
  productId: "p",
  imageId: "image",
  sourceHash: "a".repeat(64),
  bytes: Buffer.from("first"),
};

test("same URL changed bytes re-embeds; unchanged bytes reuse; force bypasses reuse", async () => {
  let calls = 0;
  const encode = async () => {
    calls++;
    return vector;
  };
  const first = await buildVisualEntry(entryInput, encode);
  const second = await buildVisualEntry(
    { ...entryInput, previous: first },
    encode,
  );
  assert.equal(calls, 1);
  assert.deepEqual(second.vector, first.vector);
  const changed = await buildVisualEntry(
    { ...entryInput, bytes: Buffer.from("changed"), previous: first },
    encode,
  );
  assert.notEqual(changed.contentHash, first.contentHash);
  assert.equal(calls, 2);
  await buildVisualEntry(
    { ...entryInput, previous: first, force: true },
    encode,
  );
  assert.equal(calls, 3);
});

test("snapshot coverage, preprocessing version, builder lock and atomic rollback protection", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mgl-visual-test-"));
  const old = process.env.VISUAL_SEARCH_CACHE_DIR;
  process.env.VISUAL_SEARCH_CACHE_DIR = directory;
  try {
    const entry = await buildVisualEntry(entryInput, async () => vector);
    const index = buildVisualSnapshot([entry], 1, 0);
    await withVisualIndexLock(async () => {
      await assert.rejects(
        withVisualIndexLock(async () => undefined),
        /locked/,
      );
      await saveIndex(index);
    });
    assert.throws(() => buildVisualSnapshot([], 1, 1), /retained/);
    assert.equal(buildVisualSnapshot([], 0, 0).entries.length, 0);
    assert.throws(
      () => parseIndex(JSON.stringify({ ...index, embeddingVersion: "other" })),
      /Incompatible/,
    );
    await assert.rejects(saveIndex({ ...index, embeddingVersion: "other" }));
    assert.equal((await readIndex()).embeddingVersion, EMBEDDING_VERSION);
    await saveIndex({
      ...index,
      updatedAt: new Date(Date.now() + 10).toISOString(),
    });
    assert.equal(
      parseIndex(
        await readFile(path.join(directory, "index.json.previous"), "utf8"),
      ).updatedAt,
      index.updatedAt,
    );
  } finally {
    if (old === undefined) delete process.env.VISUAL_SEARCH_CACHE_DIR;
    else process.env.VISUAL_SEARCH_CACHE_DIR = old;
    await rm(directory, { recursive: true, force: true });
  }
});

test("bounded inference queue is FIFO, cancels waiting work and releases after failure", async () => {
  const queue = new VisualSearchQueue(2, 1000);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const order: number[] = [];
  const first = queue.run(async () => {
    order.push(1);
    await gate;
    return 1;
  });
  const abort = new AbortController();
  const cancelled = queue.run(async () => {
    order.push(99);
  }, abort.signal);
  const last = queue.run(async () => {
    order.push(2);
    throw new Error("native failure");
  });
  const rejection = assert.rejects(last, /native failure/);
  await assert.rejects(
    queue.run(async () => 4),
    (e: unknown) => e instanceof VisualSearchError && e.status === 429,
  );
  const cancelledCheck = assert.rejects(
    cancelled,
    (e: unknown) =>
      e instanceof VisualSearchError && e.code === "SEARCH_CANCELLED",
  );
  abort.abort();
  await cancelledCheck;
  release();
  await first;
  await rejection;
  assert.equal(await queue.run(async () => 3), 3);
  assert.deepEqual(order, [1, 2]);
});

test("queue deadline expires without running expired work", async () => {
  const queue = new VisualSearchQueue(1, 10);
  let release!: () => void;
  const first = queue.run(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
  );
  let ran = false;
  await assert.rejects(
    queue.run(async () => {
      ran = true;
    }),
    (e: unknown) => e instanceof VisualSearchError && e.status === 429,
  );
  release();
  await first;
  assert.equal(ran, false);
});

test("explicit kill switch wins; query and filter validation never coerces unsafe input", () => {
  assert.equal(
    visualSearchEnabled({
      MGL_LOCAL_DEV: "true",
      VISUAL_SEARCH_ENABLED: "false",
    }),
    false,
  );
  assert.equal(visualSearchEnabled({ MGL_LOCAL_DEV: "true" }), true);
  for (const options of [
    { query: ["a", "b"] },
    { query: "x".repeat(161) },
    { secret: "x" },
    { inStock: "yes" },
    { priceMax: "NaN" },
    { priceMin: "-1" },
    { priceMin: "20", priceMax: "10" },
    { sort: "sql" },
  ]) {
    assert.throws(() => parseVisualSearchOptions(options));
  }
  const options = parseVisualSearchOptions({
    query: "  har gutal ",
    priceMax: "200000",
    inStock: "true",
    responseVersion: "2",
  });
  assert.equal(options.query, "har gutal");
  assert.deepEqual(visualSearchFilter(options), {
    OR: [{ stock: { gt: 0 } }, { supplyType: "CHINA_PREORDER" }],
    price: { lte: 200000 },
  });
});

test("hybrid ranking uses Mongolian/Latin normalization, honors constraints and stable price sort", () => {
  const products = [
    {
      id: "white",
      name: "Цагаан гутал",
      price: 80000,
      description: null,
      sku: null,
      barcode: null,
    },
    {
      id: "black",
      name: "Хар гутал",
      price: 60000,
      description: null,
      sku: null,
      barcode: null,
    },
    {
      id: "black2",
      name: "Хар гутал",
      price: 90000,
      description: null,
      sku: null,
      barcode: null,
    },
  ];
  const visual = products.map((p, i) => ({
    productId: p.id,
    score: 0.99 - i * 0.01,
  }));
  assert.deepEqual(
    rankHybridMatches(visual, products, {
      ...defaultVisualSearchOptions,
      query: "har gutal",
    }),
    ["black", "black2"],
  );
  assert.deepEqual(
    rankHybridMatches(visual, products, {
      ...defaultVisualSearchOptions,
      query: "gutal",
      sort: "price_asc",
    }),
    ["black", "white", "black2"],
  );
  assert.deepEqual(
    rankHybridMatches(visual, products, {
      ...defaultVisualSearchOptions,
      query: "iphone",
    }),
    [],
  );
});

test("index fetch retries only transient storage failures with bounded backoff", async () => {
  let calls = 0;
  const waits: number[] = [];
  const result = await loadVisualCatalogImage(
    "https://mglstore.mn/mgl-water/test.png",
    async () => {
      calls++;
      if (calls < 3)
        throw new ProductImageDeliveryError("IMAGE_STORAGE_TIMEOUT");
      return { body: Buffer.from("image"), contentType: "image/png" };
    },
    async (ms) => {
      waits.push(ms);
    },
  );
  assert.equal(result.body.toString(), "image");
  assert.deepEqual(waits, [250, 500]);
  calls = 0;
  await assert.rejects(
    loadVisualCatalogImage(
      "invalid",
      async () => {
        calls++;
        throw new ProductImageDeliveryError("IMAGE_SOURCE_INVALID");
      },
      async () => undefined,
    ),
  );
  assert.equal(calls, 1);
});
