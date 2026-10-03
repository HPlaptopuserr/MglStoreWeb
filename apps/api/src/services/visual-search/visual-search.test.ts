import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { prepareSearchImage, VisualSearchError } from "./visual-search-encoder";
import {
  EMBEDDING_SIZE,
  EMBEDDING_VERSION,
  MODEL_ID,
  MODEL_REVISION,
  normalizeVector,
  parseIndex,
  rankVisualMatches,
} from "./visual-search-index";
import { visualImageStorageOrigin } from "./visual-search-image-source";

const vector = (first: number, second: number) =>
  normalizeVector([
    first,
    second,
    ...Array<number>(EMBEDDING_SIZE - 2).fill(0),
  ]);
const entry = (productId: string, embedding: number[]) => ({
  productId,
  imageId: productId,
  sourceHash: "a".repeat(64),
  contentHash: "b".repeat(64),
  vector: embedding,
});
test("rank by cosine, deduplicate multi-image products, reject unrelated matches", () => {
  const query = vector(1, 0);
  const results = rankVisualMatches(query, [
    entry("similar", vector(0.8, 0.6)),
    entry("exact", query),
    entry("exact", query),
    entry("unrelated", vector(0, 1)),
  ]);
  assert.deepEqual(
    results.map((r) => r.productId),
    ["exact", "similar"],
  );
  assert.deepEqual(
    rankVisualMatches(vector(-1, 0), [entry("other", query)]),
    [],
  );
});
test("malformed, NaN, zero and different-model indexes are rejected", () => {
  assert.throws(() => normalizeVector([1, 2]));
  assert.throws(() => normalizeVector(Array<number>(512).fill(NaN)));
  assert.throws(() => normalizeVector(Array<number>(512).fill(0)));
  const index = {
    version: 2,
    embeddingVersion: EMBEDDING_VERSION,
    model: MODEL_ID,
    revision: MODEL_REVISION,
    updatedAt: new Date().toISOString(),
    eligibleProducts: 1,
    failedImages: 0,
    entries: [entry("p1", vector(1, 0))],
  };
  assert.equal(parseIndex(JSON.stringify(index)).entries.length, 1);
  assert.throws(() =>
    parseIndex(JSON.stringify({ ...index, revision: "unknown" })),
  );
});
test("decode validates contents, caps size/pixels, strips metadata and letterboxes", async () => {
  const input = await sharp({
    create: { width: 500, height: 100, channels: 3, background: "red" },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const result = await prepareSearchImage(input);
  const metadata = await sharp(result).metadata();
  assert.equal(metadata.width, 224);
  assert.equal(metadata.height, 224);
  assert.equal(metadata.exif, undefined);
  await assert.rejects(
    prepareSearchImage(Buffer.from("not an image")),
    (e: unknown) => e instanceof VisualSearchError && e.status === 422,
  );
  await assert.rejects(
    prepareSearchImage(Buffer.alloc(5 * 1024 * 1024 + 1)),
    (e: unknown) => e instanceof VisualSearchError && e.status === 413,
  );
  const tiny = await sharp({
    create: { width: 10, height: 10, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  await assert.rejects(prepareSearchImage(tiny));
  const huge = await sharp({
    create: { width: 5000, height: 5000, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  await assert.rejects(prepareSearchImage(huge));
});
test("catalog image host validation never expands to lookalikes or arbitrary URLs", () => {
  assert.equal(
    visualImageStorageOrigin("https://mglstore.mn/mgl-water/500ml.jpg"),
    "https://mglstore.mn",
  );
  for (const source of [
    "http://127.0.0.1/private",
    "https://mglstore.mn.evil.test/mgl-water/a",
    "https://mglstore.mn/admin",
    "https://mglstore.mn/mgl-water/../admin",
  ]) {
    assert.equal(visualImageStorageOrigin(source), process.env.SUPABASE_URL);
  }
});
