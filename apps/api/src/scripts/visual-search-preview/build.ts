import "../../config/env";
import { ProductImageDeliveryError } from "../../lib/product-image-errors";
import { prisma } from "@mgl/database";
import { readPublicCatalog } from "./public-catalog";
import {
  buildVisualEntry,
  buildVisualSnapshot,
  withVisualIndexLock,
} from "../../services/visual-search/visual-search-builder";
import { loadVisualCatalogImage } from "../../services/visual-search/visual-search-image-source";
import { encodeSearchImage } from "../../services/visual-search/visual-search-encoder";
import {
  readIndex,
  saveIndex,
  imageSourceHash,
  type VisualEntry,
} from "../../services/visual-search/visual-search-index";

async function build() {
  if (
    !process.env.VISUAL_SEARCH_CACHE_DIR ||
    !process.env.VISUAL_SEARCH_CACHE_DIR.includes("public-catalog-preview")
  )
    throw new Error("Set a separate public-catalog-preview cache directory");
  const products = await readPublicCatalog();
  const eligible = products.filter((product) => product.images.length > 0);
  console.log(
    JSON.stringify({
      publicProducts: products.length,
      eligibleProducts: eligible.length,
    }),
  );
  const previous = await readIndex().catch(() => null);
  const reuse = new Map(
    previous?.entries.map((entry) => [
      `${entry.productId}:${entry.imageId}:${entry.sourceHash}`,
      entry,
    ]),
  );
  const entries: VisualEntry[] = [];
  let next = 0,
    complete = 0,
    failed = 0;
  async function worker() {
    for (;;) {
      const product = eligible[next++];
      if (!product) return;
      for (const image of product.images.slice(0, 3)) {
        const sourceHash = imageSourceHash(image.url);
        try {
          const loaded = await loadVisualCatalogImage(image.url);
          entries.push(
            await buildVisualEntry(
              {
                productId: product.id,
                imageId: image.id,
                sourceHash,
                bytes: loaded.body,
                previous: reuse.get(`${product.id}:${image.id}:${sourceHash}`),
              },
              (bytes) => encodeSearchImage(bytes, false),
            ),
          );
        } catch (error: unknown) {
          failed++;
          console.warn(
            JSON.stringify({
              productId: product.id,
              reason:
                error instanceof ProductImageDeliveryError
                  ? error.code
                  : error instanceof Error
                    ? error.name
                    : "UnknownError",
            }),
          );
        }
      }
      if (++complete % 50 === 0)
        console.log(
          `Indexed ${complete}/${eligible.length} products; ${entries.length} images; ${failed} failures`,
        );
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  await saveIndex(buildVisualSnapshot(entries, eligible.length, failed));
  console.log(
    JSON.stringify({
      publicProducts: products.length,
      indexedProducts: new Set(entries.map((entry) => entry.productId)).size,
      images: entries.length,
      failedImages: failed,
    }),
  );
}

withVisualIndexLock(build)
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Preview index failed",
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
