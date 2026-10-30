import { getProductSearchPhrases } from "@mgl/types";
import type { Prisma } from "@mgl/database";

export {
  normalizeDiscoveryText,
  tokenizeDiscoveryText,
  scoreProductForSearch,
  buildProductDiscoveryText,
  scoreProductSimilarity,
  suggestProductCategory,
} from "@mgl/types";

/** Group relation predicates so Prisma emits one join per relation, not per phrase. */
export function buildProductSearchWhere(
  search: string,
): Prisma.ProductWhereInput[] {
  const phrases = getProductSearchPhrases(search);
  const contains = (phrase: string) => ({
    contains: phrase,
    mode: "insensitive" as const,
  });

  return [
    ...phrases.flatMap((phrase) => [
      { name: contains(phrase) },
      { description: contains(phrase) },
      { sku: contains(phrase) },
      { barcode: contains(phrase) },
      { classificationCode: contains(phrase) },
      { taxProductCode: contains(phrase) },
    ]),
    { barcodeAliases: { hasSome: phrases } },
    {
      organization: {
        OR: phrases.map((phrase) => ({ name: contains(phrase) })),
      },
    },
    {
      businessCategory: {
        OR: [
          ...phrases.flatMap((phrase) => [
            { name: contains(phrase) },
            { slug: contains(phrase) },
          ]),
          {
            parent: {
              OR: phrases.flatMap((phrase) => [
                { name: contains(phrase) },
                { slug: contains(phrase) },
              ]),
            },
          },
        ],
      },
    },
  ];
}
