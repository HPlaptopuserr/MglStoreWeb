import { prisma, type Prisma } from "@mgl/database";
import { createProductSearchScorer } from "@mgl/types";

const searchSelect = {
  id: true,
  name: true,
  description: true,
  sku: true,
  barcode: true,
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
  const candidates = (await load(where))
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
