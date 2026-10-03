import { encodeSearchImage, prepareSearchImage } from "./visual-search-encoder";
import { imageSourceHash, rankVisualMatches } from "./visual-search-index";
import { currentVisualIndex } from "./visual-search-snapshot";
import {
  defaultVisualSearchOptions,
  type VisualSearchOptions,
} from "./visual-search-options";
import {
  loadVisualProducts,
  projectVisualProducts,
} from "./visual-search-products";
import { VisualSearchError } from "./visual-search-errors";
import { rankHybridMatches } from "./visual-search-ranking";

export interface VisualSearchResult {
  productIds: string[];
  indexedProducts: number;
  partial: boolean;
  indexedAt: string;
  products?: Awaited<ReturnType<typeof projectVisualProducts>>;
  outcome?: "matches" | "no_match" | "no_filter_match" | "empty_catalog";
}

export function createCatalogImageSearcher(
  dependencies = {
    index: currentVisualIndex,
    encode: encodeSearchImage,
    load: loadVisualProducts,
    project: projectVisualProducts,
  },
) {
  return async function searchCatalogByImage(
    bytes: Buffer,
    options: VisualSearchOptions = defaultVisualSearchOptions,
    signal?: AbortSignal,
  ): Promise<VisualSearchResult> {
    const index = await dependencies.index();
    if (!index.entries.length) {
      await prepareSearchImage(bytes);
      return {
        productIds: [],
        indexedProducts: 0,
        partial: false,
        indexedAt: index.updatedAt,
        ...(options.responseVersion === 2
          ? { products: [], outcome: "empty_catalog" as const }
          : {}),
      };
    }
    const vector = await dependencies.encode(bytes, false, signal);
    if (signal?.aborted)
      throw new VisualSearchError(499, "SEARCH_CANCELLED", "Хайлт цуцлагдсан.");
    const matches = rankVisualMatches(vector, index.entries);
    const publicProducts = await dependencies.load(
      matches.map((m) => m.productId),
      options,
    );
    const identities = new Set(
      publicProducts.flatMap((product) =>
        product.images.map(
          (image) => `${product.id}:${image.id}:${imageSourceHash(image.url)}`,
        ),
      ),
    );
    const currentEntries = index.entries.filter((entry) =>
      identities.has(`${entry.productId}:${entry.imageId}:${entry.sourceHash}`),
    );
    const currentMatches = rankVisualMatches(vector, currentEntries);
    const ids = rankHybridMatches(
      currentMatches,
      publicProducts,
      options,
    ).slice(0, 40);
    const products = await dependencies.project(ids, options);
    // If an image changed between ranking and hydration, wait for its reindex.
    const currentIds = new Set(
      products
        .filter((product) =>
          product.images.some((image) =>
            currentEntries.some(
              (entry) =>
                entry.productId === product.id &&
                entry.imageId === image.id &&
                entry.sourceHash === imageSourceHash(image.url),
            ),
          ),
        )
        .map((product) => product.id),
    );
    const productIds = ids.filter((id) => currentIds.has(id));
    return {
      productIds,
      indexedProducts: new Set(index.entries.map((entry) => entry.productId))
        .size,
      partial:
        index.failedImages > 0 ||
        Date.now() - Date.parse(index.updatedAt) > 86_400_000,
      indexedAt: index.updatedAt,
      ...(options.responseVersion === 2
        ? {
            products: products.filter((product) => currentIds.has(product.id)),
            outcome: productIds.length
              ? "matches"
              : index.eligibleProducts === 0
                ? "empty_catalog"
                : matches.length &&
                    (options.query ||
                      options.inStock ||
                      options.priceMin !== undefined ||
                      options.priceMax !== undefined)
                  ? "no_filter_match"
                  : "no_match",
          }
        : {}),
    };
  };
}
export const searchCatalogByImage = createCatalogImageSearcher();
