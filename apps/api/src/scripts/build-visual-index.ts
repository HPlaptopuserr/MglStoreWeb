import { ProductImageDeliveryError } from "../lib/product-image-errors";
import "../config/env";
import { prisma } from "@mgl/database";
import { loadVisualCatalogImage } from "../services/visual-search/visual-search-image-source";
import { getVisualCatalogPage } from "../services/visual-search/visual-search-catalog";
import { encodeSearchImage } from "../services/visual-search/visual-search-encoder";
import {
  readIndex,
  saveIndex,
  imageSourceHash,
  type VisualEntry,
} from "../services/visual-search/visual-search-index";

import {
  buildVisualEntry,
  buildVisualSnapshot,
  withVisualIndexLock,
} from "../services/visual-search/visual-search-builder";

async function build() {
  const previous = await readIndex().catch(() => null);
  const reuse = new Map(
    previous?.entries.map((entry) => [
      `${entry.imageId}:${entry.sourceHash}`,
      entry,
    ]),
  );
  const entries: VisualEntry[] = [];
  let cursor: string | undefined;
  let eligibleProducts = 0;
  let failedImages = 0;
  do {
    const products = await getVisualCatalogPage(cursor);
    if (!products.length) break;
    for (const product of products) {
      eligibleProducts++;
      for (const image of product.images) {
        const sourceHash = imageSourceHash(image.url);
        const cached = reuse.get(`${image.id}:${sourceHash}`);
        try {
          // Fetch bytes on every reconciliation: a stable URL is not a content revision.
          const loaded = await loadVisualCatalogImage(image.url);
          entries.push(
            await buildVisualEntry(
              {
                productId: product.id,
                imageId: image.id,
                sourceHash,
                bytes: loaded.body,
                previous: cached,
                force: process.argv.includes("--force"),
              },
              (bytes) => encodeSearchImage(bytes, true),
            ),
          );
        } catch (error: unknown) {
          failedImages++;
          // No image payloads, signed URLs, credentials or user data in logs.
          console.warn("Visual indexing failed", {
            productId: product.id,
            reason:
              error instanceof ProductImageDeliveryError
                ? error.code
                : error instanceof Error
                  ? error.name
                  : "UnknownError",
          });
        }
      }
      console.log(
        `Indexed ${eligibleProducts} products (${entries.length} images)`,
      );
    }
    cursor = products.at(-1)?.id;
  } while (cursor);
  await saveIndex(buildVisualSnapshot(entries, eligibleProducts, failedImages));
  console.log(
    JSON.stringify({
      eligibleProducts,
      indexedProducts: new Set(entries.map((e) => e.productId)).size,
      failedImages,
    }),
  );
}
withVisualIndexLock(build)
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
