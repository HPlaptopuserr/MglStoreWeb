import { prisma, type Prisma } from "@mgl/database";
import { createProductSearchScorer, normalizeDiscoveryText } from "@mgl/types";

const searchSelect = {
  id: true,
  name: true,
  description: true,
  sku: true,
  barcode: true,
  barcodeAliases: true,
  classificationCode: true,
  taxProductCode: true,
  marketplacePriority: true,
  createdAt: true,
  businessCategory: {
    select: {
      id: true,
      name: true,
      slug: true,
      parent: { select: { id: true, name: true, slug: true } },
    },
  },
  organization: { select: { id: true, name: true } },
} satisfies Prisma.ProductSelect;

export type CatalogSearchCandidate = Prisma.ProductGetPayload<{
  select: typeof searchSelect;
}>;

interface CatalogSearchInput {
  where: Prisma.ProductWhereInput;
  search: string;
  offset: number;
  limit: number;
}

const loadCandidates = (where: Prisma.ProductWhereInput) =>
  prisma.product.findMany({ where, select: searchSelect });

/** Rank the whole matching catalog before paging; hydrate only one page later. */
export async function findOrganizationCatalogSearchPage(
  { where, search, offset, limit }: CatalogSearchInput,
  load: (
    where: Prisma.ProductWhereInput,
  ) => Promise<CatalogSearchCandidate[]> = loadCandidates,
) {
  const score = createProductSearchScorer(search);
  const terms = normalizeDiscoveryText(search).split(/\s+/).filter(Boolean);
  const candidates = (await load(where))
    .filter((product) => {
      // Store management searches identify a product, not its shop or category.
      // Require every term so a shared SKU prefix cannot match the entire store.
      const fields = [
        product.name,
        product.sku,
        product.barcode,
        ...product.barcodeAliases,
      ].map((value) => normalizeDiscoveryText(value ?? ""));
      return (
        terms.length > 0 &&
        terms.every((term) => fields.some((field) => field.includes(term)))
      );
    })
    .map((product) => ({ product, score: score(product) }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.product.marketplacePriority - a.product.marketplacePriority ||
        b.product.createdAt.getTime() - a.product.createdAt.getTime() ||
        a.product.id.localeCompare(b.product.id),
    );

  return {
    ids: candidates
      .slice(offset, limit > 0 ? offset + limit : undefined)
      .map(({ product }) => product.id),
    total: candidates.length,
  };
}
