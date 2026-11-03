import { buildVisualEntry } from "./visual-search-builder";
import { imageSourceHash, type VisualEntry } from "./visual-search-index";

export interface CatalogSearchImage {
  productId: string;
  imageId: string;
  url: string;
}
export interface IncrementalSearchDependencies {
  images(): Promise<CatalogSearchImage[]>;
  pending(images: CatalogSearchImage[]): Promise<CatalogSearchImage[]>;
  claim(image: CatalogSearchImage, token: string): Promise<boolean>;
  load(url: string): Promise<Buffer>;
  encode(bytes: Buffer): Promise<number[]>;
  complete(
    image: CatalogSearchImage,
    token: string,
    entry: VisualEntry,
  ): Promise<void>;
  fail(image: CatalogSearchImage, token: string): Promise<void>;
  token(): string;
  now(): number;
}

/** No unchanged image is fetched or encoded; every completed image is durable. */
export async function reconcileVisualImages(
  deps: IncrementalSearchDependencies,
) {
  const pending = await deps.pending(await deps.images());
  const started = deps.now();
  let processed = 0;
  let failed = 0;
  // Limit CPU work per pass; user searches share the bounded inference queue.
  for (const image of pending.slice(0, 20)) {
    if (deps.now() - started >= 5000) break;
    const token = deps.token();
    if (!(await deps.claim(image, token))) continue;
    try {
      const entry = await buildVisualEntry(
        {
          productId: image.productId,
          imageId: image.imageId,
          sourceHash: imageSourceHash(image.url),
          bytes: await deps.load(image.url),
        },
        deps.encode,
      );
      await deps.complete(image, token, entry);
      processed++;
    } catch {
      failed++;
      await deps.fail(image, token);
    }
  }
  return { pending: pending.length, processed, failed };
}
