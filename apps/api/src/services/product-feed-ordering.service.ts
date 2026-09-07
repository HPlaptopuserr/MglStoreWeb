export type FeedProduct = {
  id: string;
  marketplacePriority?: number | null;
  organizationId?: string | null;
  organization?: { id: string } | null;
  businessCategoryId?: string | null;
  businessCategory?: { id: string; parent?: { id: string } | null } | null;
};

type ScoredFeedProduct<T extends FeedProduct> = {
  product: T;
  score: number;
};

function organizationId(product: FeedProduct): string | null {
  return product.organizationId ?? product.organization?.id ?? null;
}

function categoryId(product: FeedProduct): string | null {
  return (
    product.businessCategory?.parent?.id ??
    product.businessCategoryId ??
    product.businessCategory?.id ??
    null
  );
}

/**
 * Produces a stable marketplace feed while preventing a single merchant or
 * top-level category from occupying consecutive positions when an alternative
 * is available. Marketplace priority remains the primary ordering signal.
 */
export function orderRecommendedProductFeed<T extends FeedProduct>(
  products: T[],
  score: (product: T) => number,
): T[] {
  const remaining: ScoredFeedProduct<T>[] = products
    .map((product) => ({ product, score: score(product) }))
    .sort((left, right) => {
      const priorityDifference =
        (right.product.marketplacePriority ?? 0) -
        (left.product.marketplacePriority ?? 0);
      if (priorityDifference !== 0) return priorityDifference;
      if (right.score !== left.score) return right.score - left.score;
      return left.product.id.localeCompare(right.product.id);
    });

  const ordered: T[] = [];
  let previousOrganizationId: string | null = null;
  let previousCategoryId: string | null = null;

  while (remaining.length > 0) {
    const highestPriority = remaining[0].product.marketplacePriority ?? 0;
    const samePriorityCount = remaining.findIndex(
      ({ product }) => (product.marketplacePriority ?? 0) !== highestPriority,
    );
    const searchLimit =
      samePriorityCount === -1 ? remaining.length : samePriorityCount;

    let nextIndex = remaining.slice(0, searchLimit).findIndex(({ product }) => {
      const nextOrganizationId = organizationId(product);
      const nextCategoryId = categoryId(product);
      return (
        (!previousOrganizationId ||
          nextOrganizationId !== previousOrganizationId) &&
        (!previousCategoryId || nextCategoryId !== previousCategoryId)
      );
    });

    if (nextIndex < 0) {
      nextIndex = remaining
        .slice(0, searchLimit)
        .findIndex(
          ({ product }) =>
            !previousCategoryId || categoryId(product) !== previousCategoryId,
        );
    }
    if (nextIndex < 0) nextIndex = 0;

    const [next] = remaining.splice(nextIndex, 1);
    ordered.push(next.product);
    previousOrganizationId = organizationId(next.product);
    previousCategoryId = categoryId(next.product);
  }

  return ordered;
}
