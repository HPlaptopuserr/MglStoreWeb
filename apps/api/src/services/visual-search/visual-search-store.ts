import { randomUUID } from "node:crypto";
import { prisma } from "@mgl/database";
import { getVisualCatalogPage } from "./visual-search-catalog";
import {
  EMBEDDING_VERSION,
  MODEL_ID,
  MODEL_REVISION,
  imageSourceHash,
  normalizeVector,
  type VisualEntry,
  type VisualIndex,
} from "./visual-search-index";
import type { CatalogSearchImage } from "./visual-search-incremental";

export async function visualCatalogImages() {
  const images: CatalogSearchImage[] = [];
  let eligibleProducts = 0;
  let cursor: string | undefined;
  do {
    const products = await getVisualCatalogPage(cursor);
    if (!products.length) break;
    eligibleProducts += products.length;
    for (const product of products) {
      for (const image of product.images)
        images.push({
          productId: product.id,
          imageId: image.id,
          url: image.url,
        });
    }
    cursor = products.at(-1)?.id;
  } while (cursor);
  return { images, eligibleProducts };
}

export async function pendingVisualImages(images: CatalogSearchImage[]) {
  const rows = await prisma.visualSearchEmbedding.findMany({
    where: { imageId: { in: images.map((image) => image.imageId) } },
    select: {
      imageId: true,
      sourceHash: true,
      embeddingVersion: true,
      indexedAt: true,
      retryAt: true,
      leaseUntil: true,
    },
  });
  const byId = new Map(rows.map((row) => [row.imageId, row]));
  const now = Date.now();
  return images.filter((image) => {
    const row = byId.get(image.imageId);
    if (!row) return true;
    if (row.leaseUntil && row.leaseUntil.getTime() > now) return false;
    if (
      row.sourceHash !== imageSourceHash(image.url) ||
      row.embeddingVersion !== EMBEDDING_VERSION
    )
      return true;
    return !row.indexedAt && (!row.retryAt || row.retryAt.getTime() <= now);
  });
}

export async function claimVisualImage(
  image: CatalogSearchImage,
  token: string,
) {
  const rows = await prisma.$queryRaw<{ imageId: string }[]>`
    INSERT INTO "VisualSearchEmbedding"
      ("imageId", "productId", "sourceHash", "embeddingVersion", "leaseToken", "leaseUntil", "updatedAt")
    SELECT ${image.imageId}, ${image.productId}, ${imageSourceHash(image.url)}, ${EMBEDDING_VERSION}, ${token},
      timezone('UTC', now()) + interval '2 minutes', timezone('UTC', now())
    FROM "ProductImage" WHERE "id" = ${image.imageId} AND "url" = ${image.url}
    ON CONFLICT ("imageId") DO UPDATE SET
      "sourceHash" = EXCLUDED."sourceHash", "embeddingVersion" = EXCLUDED."embeddingVersion",
      "leaseToken" = EXCLUDED."leaseToken", "leaseUntil" = EXCLUDED."leaseUntil",
      "updatedAt" = EXCLUDED."updatedAt", "vector" = NULL, "contentHash" = NULL, "indexedAt" = NULL
    WHERE ("VisualSearchEmbedding"."leaseUntil" IS NULL OR "VisualSearchEmbedding"."leaseUntil" < timezone('UTC', now()))
      AND (("VisualSearchEmbedding"."sourceHash" <> EXCLUDED."sourceHash"
          OR "VisualSearchEmbedding"."embeddingVersion" <> EXCLUDED."embeddingVersion")
        OR ("VisualSearchEmbedding"."indexedAt" IS NULL
          AND ("VisualSearchEmbedding"."retryAt" IS NULL OR "VisualSearchEmbedding"."retryAt" <= timezone('UTC', now()))))
    RETURNING "imageId"`;
  return rows.length === 1;
}

export async function completeVisualImage(
  image: CatalogSearchImage,
  token: string,
  entry: VisualEntry,
) {
  await prisma.visualSearchEmbedding.updateMany({
    where: {
      imageId: image.imageId,
      leaseToken: token,
      image: { url: image.url },
    },
    data: {
      vector: normalizeVector(entry.vector),
      contentHash: entry.contentHash,
      indexedAt: new Date(),
      attempts: 0,
      retryAt: null,
      leaseUntil: null,
      leaseToken: null,
    },
  });
}

export async function failVisualImage(
  image: CatalogSearchImage,
  token: string,
) {
  // A persistent backoff prevents an unavailable image from being fetched on every tick.
  await prisma.visualSearchEmbedding.updateMany({
    where: { imageId: image.imageId, leaseToken: token },
    data: {
      attempts: { increment: 1 },
      retryAt: new Date(Date.now() + 15 * 60_000),
      leaseUntil: null,
      leaseToken: null,
    },
  });
}

export async function visualStoreRevision() {
  const row = await prisma.visualSearchEmbedding.aggregate({
    _count: { _all: true },
    _max: { updatedAt: true },
  });
  return `${row._count._all}:${row._max.updatedAt?.toISOString() ?? "empty"}`;
}

export async function loadPersistentVisualIndex(): Promise<VisualIndex> {
  const catalog = await visualCatalogImages();
  const images = new Map(catalog.images.map((image) => [image.imageId, image]));
  const rows = await prisma.visualSearchEmbedding.findMany({
    where: {
      imageId: { in: [...images.keys()] },
      embeddingVersion: EMBEDDING_VERSION,
      indexedAt: { not: null },
    },
  });
  const entries: VisualEntry[] = [];
  for (const row of rows) {
    const image = images.get(row.imageId);
    if (
      !image ||
      row.sourceHash !== imageSourceHash(image.url) ||
      !row.contentHash
    )
      continue;
    if (
      !Array.isArray(row.vector) ||
      !row.vector.every((value): value is number => typeof value === "number")
    )
      throw new Error("Invalid stored visual embedding");
    entries.push({
      productId: image.productId,
      imageId: image.imageId,
      sourceHash: row.sourceHash,
      contentHash: row.contentHash,
      vector: normalizeVector(row.vector),
    });
  }
  return {
    version: 2,
    embeddingVersion: EMBEDDING_VERSION,
    model: MODEL_ID,
    revision: MODEL_REVISION,
    // Freshness describes reconciliation against the current catalog, not a rebuild.
    updatedAt: new Date().toISOString(),
    eligibleProducts: catalog.eligibleProducts,
    failedImages: catalog.images.length - entries.length,
    entries,
  };
}

/** One-time migration preserves existing vectors without fetching or encoding images. */
export async function importVisualSnapshot(index: VisualIndex) {
  const catalog = await visualCatalogImages();
  const images = new Map(catalog.images.map((image) => [image.imageId, image]));
  let imported = 0;
  for (let start = 0; start < index.entries.length; start += 100) {
    const data = index.entries
      .slice(start, start + 100)
      .filter((entry) => {
        const image = images.get(entry.imageId);
        return (
          image?.productId === entry.productId &&
          imageSourceHash(image.url) === entry.sourceHash
        );
      })
      .map((entry) => ({
        ...entry,
        embeddingVersion: EMBEDDING_VERSION,
        indexedAt: new Date(index.updatedAt),
      }));
    const result = await prisma.visualSearchEmbedding.createMany({
      data,
      skipDuplicates: true,
    });
    imported += result.count;
  }
  return { imported, eligibleImages: catalog.images.length };
}

export const visualImageToken = randomUUID;
