import { prisma, type Prisma } from "@mgl/database";
import { fromPosStoredStockQuantity } from "@mgl/types";
import { productImageOrderBy } from "../../lib/product-images";
import { publicVisualCatalogWhere } from "./visual-search-catalog";
import {
  visualSearchFilter,
  type VisualSearchOptions,
} from "./visual-search-options";

// Explicit storefront projection: never serialize supplier documents, cost or warehouse data.
const select = {
  id: true,
  name: true,
  description: true,
  sku: true,
  barcode: true,
  price: true,
  stock: true,
  unit: true,
  supplyType: true,
  isRestaurantMenuItem: true,
  menuCategory: true,
  images: { select: { id: true, url: true }, orderBy: productImageOrderBy() },
  businessCategory: {
    select: {
      id: true,
      name: true,
      slug: true,
      parent: { select: { id: true, name: true, slug: true } },
    },
  },
  organization: { select: { id: true, name: true, logoUrl: true } },
} satisfies Prisma.ProductSelect;
export type VisualPublicProduct = Prisma.ProductGetPayload<{
  select: typeof select;
}>;

export async function loadVisualProducts(
  ids: string[],
  options: VisualSearchOptions,
): Promise<VisualPublicProduct[]> {
  if (!ids.length) return [];
  const visibility = await publicVisualCatalogWhere();
  const products: VisualPublicProduct[] = [];
  // Check every candidate, rather than letting 1,000 stale/private IDs crowd out valid results.
  for (let start = 0; start < ids.length; start += 500) {
    products.push(
      ...(await prisma.product.findMany({
        where: {
          AND: [
            visibility,
            visualSearchFilter(options),
            { id: { in: ids.slice(start, start + 500) } },
          ],
        },
        select,
      })),
    );
  }
  return products;
}

export async function projectVisualProducts(
  ids: string[],
  options: VisualSearchOptions,
) {
  // Revalidate at the last read. No cached second HTTP request and no admin bypass.
  const products = await loadVisualProducts(ids, options);
  const discounts = ids.length
    ? await prisma.discount.findMany({
        where: {
          productId: { in: products.map((p) => p.id) },
          isActive: true,
          OR: [{ validFrom: null }, { validFrom: { lte: new Date() } }],
          validUntil: { gte: new Date() },
        },
        select: { productId: true, percent: true, validUntil: true },
        orderBy: { percent: "desc" },
      })
    : [];
  const byId = new Map(
    products.map((product) => [
      product.id,
      {
        ...product,
        stock: fromPosStoredStockQuantity(product.stock, product.unit),
        discounts: discounts
          .filter((discount) => discount.productId === product.id)
          .slice(0, 1)
          .map(({ percent, validUntil }) => ({ percent, validUntil })),
      },
    ]),
  );
  return ids.flatMap((id) => {
    const product = byId.get(id);
    return product ? [product] : [];
  });
}
