export type StorefrontConnection = {
  email?: string | null;
  phone?: string | null;
  qpayEnabled?: boolean;
  qpayMerchantId?: string | null;
  webQpayEnabled?: boolean;
  webQpayMerchantId?: string | null;
};

/** Checkout accepts a seller-owned merchant connected through POS or WEB. */
export function hasConnectedStorefront(
  organization: StorefrontConnection,
): boolean {
  return Boolean(
    organization.email?.trim() &&
    organization.phone?.trim() &&
    ((organization.qpayEnabled && organization.qpayMerchantId?.trim()) ||
      (organization.webQpayEnabled && organization.webQpayMerchantId?.trim())),
  );
}

export const storefrontConnectionSelect = {
  email: true,
  phone: true,
  qpayEnabled: true,
  qpayMerchantId: true,
  webQpayEnabled: true,
  webQpayMerchantId: true,
} as const;

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
 * is available. Connected storefronts come first, followed by marketplace priority.
 */
export function orderRecommendedProductFeed<T extends FeedProduct>(
  products: T[],
  score: (product: T) => number,
  isConnected: (product: T) => boolean = () => false,
): T[] {
  const remaining: ScoredFeedProduct<T>[] = products
    .map((product) => ({ product, score: score(product) }))
    .sort((left, right) => {
      const connectionDifference =
        Number(isConnected(right.product)) - Number(isConnected(left.product));
      if (connectionDifference !== 0) return connectionDifference;
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
    const connected = isConnected(remaining[0].product);
    const samePriorityCount = remaining.findIndex(
      ({ product }) =>
        isConnected(product) !== connected ||
        (product.marketplacePriority ?? 0) !== highestPriority,
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
