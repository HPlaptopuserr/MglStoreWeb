import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { buildVisualEntry, buildVisualSnapshot } from "./visual-search-builder";
import { imageSourceHash } from "./visual-search-index";

test(
  "Postgres: import, concurrent leases, stale completions, backoff, URL invalidation and deletion",
  {
    skip: !process.env.VISUAL_SEARCH_TEST_DATABASE_URL,
  },
  async () => {
    const url = new URL(process.env.VISUAL_SEARCH_TEST_DATABASE_URL!);
    assert.ok(
      ["127.0.0.1", "localhost"].includes(url.hostname),
      "integration test requires an isolated loopback database",
    );
    process.env.DATABASE_URL = url.toString();
    const { prisma } = await import("@mgl/database");
    const store = await import("./visual-search-store.js");
    const suffix = randomUUID();
    const org = await prisma.organization.create({
      data: { name: "Visual test", slug: suffix, taxId: suffix },
    });
    const key = `web-products-enabled-${org.id}`;
    const product = await prisma.product.create({
      data: { name: "Visual test", price: 1000, organizationId: org.id },
    });
    await prisma.siteSetting.create({ data: { key, value: "true" } });
    const row = await prisma.productImage.create({
      data: { productId: product.id, url: "https://images/one" },
    });
    const image = { productId: product.id, imageId: row.id, url: row.url };
    const vector = [1, ...Array<number>(511).fill(0)];
    try {
      const entry = await buildVisualEntry(
        {
          ...image,
          sourceHash: imageSourceHash(row.url),
          bytes: Buffer.from("image"),
        },
        async () => vector,
      );
      const snapshot = buildVisualSnapshot([entry], 1, 0);
      assert.equal((await store.importVisualSnapshot(snapshot)).imported, 1);
      assert.equal((await store.importVisualSnapshot(snapshot)).imported, 0);
      assert.equal((await store.pendingVisualImages([image])).length, 0);
      assert.equal((await store.loadPersistentVisualIndex()).entries.length, 1);

      await prisma.productImage.update({
        where: { id: row.id },
        data: { url: "https://images/replaced" },
      });
      image.url = "https://images/replaced";
      assert.equal(await prisma.visualSearchEmbedding.count(), 0);
      const tokens = [randomUUID(), randomUUID()];
      const claims = await Promise.all(
        tokens.map((token) => store.claimVisualImage(image, token)),
      );
      assert.equal(claims.filter(Boolean).length, 1);
      const owner = tokens[claims.indexOf(true)];
      await store.completeVisualImage(image, "stale-token", entry);
      assert.equal(
        (
          await prisma.visualSearchEmbedding.findUniqueOrThrow({
            where: { imageId: row.id },
          })
        ).indexedAt,
        null,
      );
      await store.failVisualImage(image, owner);
      assert.equal((await store.pendingVisualImages([image])).length, 0);
      assert.equal(await store.claimVisualImage(image, "too-early"), false);
      await prisma.visualSearchEmbedding.update({
        where: { imageId: row.id },
        data: { retryAt: new Date(0) },
      });
      assert.equal((await store.pendingVisualImages([image])).length, 1);
      assert.equal(await store.claimVisualImage(image, "abandoned"), true);
      await prisma.visualSearchEmbedding.update({
        where: { imageId: row.id },
        data: { leaseUntil: new Date(0) },
      });
      assert.equal(await store.claimVisualImage(image, "recovered"), true);
      await store.completeVisualImage(image, "abandoned", entry);
      assert.equal(
        (
          await prisma.visualSearchEmbedding.findUniqueOrThrow({
            where: { imageId: row.id },
          })
        ).indexedAt,
        null,
      );
      const replacement = await buildVisualEntry(
        {
          ...image,
          sourceHash: imageSourceHash(image.url),
          bytes: Buffer.from("new image"),
        },
        async () => vector,
      );
      await store.completeVisualImage(image, "recovered", replacement);
      assert.equal((await store.pendingVisualImages([image])).length, 0);
      assert.equal(
        (await store.loadPersistentVisualIndex()).entries[0].sourceHash,
        replacement.sourceHash,
      );
      // Explicit same-URL replacement invalidates the durable vector too.
      await prisma.productImage.update({
        where: { id: row.id },
        data: { url: image.url },
      });
      assert.equal(await prisma.visualSearchEmbedding.count(), 0);
      assert.equal(await store.claimVisualImage(image, "last"), true);
      await prisma.productImage.delete({ where: { id: row.id } });
      assert.equal(await prisma.visualSearchEmbedding.count(), 0);
      assert.equal(await store.claimVisualImage(image, "deleted"), false);
    } finally {
      await prisma.product.delete({ where: { id: product.id } });
      await prisma.siteSetting.delete({ where: { key } });
      await prisma.organization.delete({ where: { id: org.id } });
      await prisma.$disconnect();
    }
  },
);
