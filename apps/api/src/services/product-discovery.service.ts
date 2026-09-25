import { getProductSearchPhrases } from "@mgl/types";

export {
  normalizeDiscoveryText,
  tokenizeDiscoveryText,
  scoreProductForSearch,
  buildProductDiscoveryText,
  scoreProductSimilarity,
  suggestProductCategory,
} from "@mgl/types";

export function buildProductSearchWhere(search: string) {
  return getProductSearchPhrases(search).flatMap((phrase) => [
    { name: { contains: phrase, mode: "insensitive" as const } },
    { description: { contains: phrase, mode: "insensitive" as const } },
    { sku: { contains: phrase, mode: "insensitive" as const } },
    { barcode: { contains: phrase, mode: "insensitive" as const } },
    { classificationCode: { contains: phrase, mode: "insensitive" as const } },
    { taxProductCode: { contains: phrase, mode: "insensitive" as const } },
    {
      organization: {
        name: { contains: phrase, mode: "insensitive" as const },
      },
    },
    {
      businessCategory: {
        OR: [
          { name: { contains: phrase, mode: "insensitive" as const } },
          { slug: { contains: phrase, mode: "insensitive" as const } },
          {
            parent: {
              name: { contains: phrase, mode: "insensitive" as const },
            },
          },
          {
            parent: {
              slug: { contains: phrase, mode: "insensitive" as const },
            },
          },
        ],
      },
    },
  ]);
}
