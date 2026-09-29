import { SELF_SERVICE_TAKEAWAY_PACKAGING_SKU } from "@mgl/types";
import { prisma, type Prisma } from "@mgl/database";
import {
  PUBLIC_PRODUCT_STATE_FILTER,
  areWebProductsGloballyEnabled,
  getWebProductsEnabledOrganizationIds,
} from "../product-visibility.service";
import { productImageOrderBy } from "../../lib/product-images";

export async function publicVisualCatalogWhere(): Promise<Prisma.ProductWhereInput> {
  const enabled = await areWebProductsGloballyEnabled();
  const organizationIds = enabled
    ? await getWebProductsEnabledOrganizationIds()
    : [];
  return {
    ...PUBLIC_PRODUCT_STATE_FILTER,
    OR: [{ sku: null }, { sku: { not: SELF_SERVICE_TAKEAWAY_PACKAGING_SKU } }],
    organizationId: { in: organizationIds },
    organization: { status: "ACTIVE", deletedAt: null },
  };
}
export async function getVisualCatalogPage(cursor?: string) {
  return prisma.product.findMany({
    where: await publicVisualCatalogWhere(),
    orderBy: { id: "asc" },
    take: 100,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      images: {
        select: { id: true, url: true },
        orderBy: productImageOrderBy(),
        take: 3,
      },
    },
  });
}
