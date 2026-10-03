import { createProductSearchScorer, tokenizeDiscoveryText } from "@mgl/types";
import type { VisualSearchOptions } from "./visual-search-options";

export interface VisualCandidate {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  price: number | { toString(): string };
  businessCategory?: {
    id: string;
    name: string;
    slug: string | null;
    parent?: { id: string; name: string; slug: string | null } | null;
  } | null;
}

/** Fuse ranks, never add incomparable cosine/lexical scores or call them confidence. */
export function rankHybridMatches<T extends VisualCandidate>(
  visual: readonly { productId: string; score: number }[],
  products: readonly T[],
  options: VisualSearchOptions,
): string[] {
  const byId = new Map(products.map((product) => [product.id, product]));
  const scoreText = createProductSearchScorer(options.query);
  const termScorers = tokenizeDiscoveryText(options.query).map(
    createProductSearchScorer,
  );
  const lexical = options.query
    ? products
        .filter((product) => termScorers.every((score) => score(product) > 0))
        .map((product) => ({ id: product.id, score: scoreText(product) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    : [];
  const lexicalRanks = new Map(
    lexical.map((item, rank) => [item.id, rank + 1]),
  );
  const results = visual.flatMap((match, rank) => {
    const product = byId.get(match.productId);
    const textRank = lexicalRanks.get(match.productId);
    // Written constraints are deliberate. Do not silently return image-only results.
    if (!product || (options.query && textRank === undefined)) return [];
    return [
      {
        id: product.id,
        price: Number(product.price),
        visual: match.score,
        score:
          1 / (60 + rank + 1) +
          (textRank === undefined ? 0 : 1 / (60 + textRank)),
      },
    ];
  });
  results.sort((a, b) => {
    if (options.sort !== "relevance" && a.price !== b.price) {
      return options.sort === "price_asc"
        ? a.price - b.price
        : b.price - a.price;
    }
    return b.score - a.score || b.visual - a.visual || a.id.localeCompare(b.id);
  });
  return results.map((result) => result.id);
}
