import { prisma, type Prisma } from "@mgl/database";
import { reservedStock, stockAvailability } from "./stock-reservation.service";
import { readWarehouseCatalogSales } from "./warehouse-catalog-sales.service";

type CatalogCategory = {
  id: string;
  name: string;
  parentId: string | null;
  productCount: number;
};

type CategorySource = { id: string; name: string; parentId: string | null };
type ProductCategorySource = {
  businessCategoryId: string | null;
  category: { id: string; name: string } | null;
};

/** Count each product once at every ancestor; keep legacy categories separate. */
export function buildShoppingCategories(
  products: ProductCategorySource[],
  businessCategories: CategorySource[],
): CatalogCategory[] {
  const byId = new Map(
    businessCategories.map((category) => [category.id, category]),
  );
  const result = new Map<string, CatalogCategory>();
  for (const product of products) {
    let category = product.businessCategoryId
      ? byId.get(product.businessCategoryId)
      : undefined;
    const visited = new Set<string>();
    if (category) {
      while (category && !visited.has(category.id)) {
        visited.add(category.id);
        const id = `business:${category.id}`;
        const parentId =
          category.parentId && byId.has(category.parentId)
            ? `business:${category.parentId}`
            : null;
        const entry = result.get(id) ?? {
          id,
          name: category.name,
          parentId,
          productCount: 0,
        };
        entry.productCount += 1;
        result.set(id, entry);
        category = category.parentId ? byId.get(category.parentId) : undefined;
      }
    } else {
      const id = product.category
        ? `legacy:${product.category.id}`
        : "uncategorized";
      const entry = result.get(id) ?? {
        id,
        name: product.category?.name ?? "Ангилалгүй бараа",
        parentId: null,
        productCount: 0,
      };
      entry.productCount += 1;
      result.set(id, entry);
    }
  }
  return [...result.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "mn"),
  );
}

export function shoppingCategoryProductWhere(
  selectedId: string,
  categories: CategorySource[],
): Prisma.ProductWhereInput {
  const withoutActiveBusinessCategory: Prisma.ProductWhereInput = {
    OR: [
      { businessCategoryId: null },
      {
        businessCategoryId: {
          notIn: categories.map((category) => category.id),
        },
      },
    ],
  };
  if (selectedId === "uncategorized") {
    return { AND: [withoutActiveBusinessCategory, { categoryId: null }] };
  }
  if (selectedId.startsWith("legacy:")) {
    return {
      AND: [withoutActiveBusinessCategory, { categoryId: selectedId.slice(7) }],
    };
  }
  const ids = new Set<string>();
  const pending = selectedId.startsWith("business:")
    ? [selectedId.slice(9)]
    : [];
  const children = new Map<string, string[]>();
  for (const category of categories) {
    if (category.parentId) {
      children.set(category.parentId, [
        ...(children.get(category.parentId) ?? []),
        category.id,
      ]);
    }
  }
  while (pending.length) {
    const id = pending.pop()!;
    if (ids.has(id)) continue;
    ids.add(id);
    pending.push(...(children.get(id) ?? []));
  }
  return { businessCategoryId: { in: [...ids] } };
}

export function shoppingSearchProductWhere(
  search: string,
): Prisma.ProductWhereInput {
  const terms = [...new Set(search.trim().split(/\s+/).filter(Boolean))];
  return {
    AND: terms.map((term) => ({
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { sku: { contains: term, mode: "insensitive" } },
        { barcode: { contains: term, mode: "insensitive" } },
        { barcodeAliases: { has: term } },
      ],
    })),
  };
}

interface ShoppingCatalogInput {
  warehouseId: string;
  search?: string;
  categoryId?: string;
  page: number;
  limit: number;
  productIds?: string[];
  sort?: "name" | "topSelling";
}

/** Shopping needs stock and categories, without procurement sales analytics. */
export async function readWarehouseShoppingCatalog(
  input: ShoppingCatalogInput,
  dependencies: {
    db: Prisma.TransactionClient;
    reservedStock: typeof reservedStock;
    readSales?: typeof readWarehouseCatalogSales;
  } = { db: prisma, reservedStock },
) {
  const { db } = dependencies;
  const baseProductWhere: Prisma.ProductWhereInput = {
    deletedAt: null,
    isActive: true,
  };
  const baseWhere: Prisma.WarehouseInventoryWhereInput = {
    warehouseId: input.warehouseId,
    quantity: { gt: 0 },
    product: baseProductWhere,
  };
  const [businessCategories, categoryProducts] = await Promise.all([
    db.businessCategory.findMany({
      where: { isActive: true },
      select: { id: true, name: true, parentId: true },
    }),
    db.warehouseInventory.findMany({
      where: baseWhere,
      select: {
        product: {
          select: {
            businessCategoryId: true,
            category: { select: { id: true, name: true } },
          },
        },
      },
    }),
  ]);
  const categories = buildShoppingCategories(
    categoryProducts.map((item) => item.product),
    businessCategories,
  );
  const productFilters: Prisma.ProductWhereInput[] = [baseProductWhere];
  if (input.search?.trim())
    productFilters.push(shoppingSearchProductWhere(input.search));
  if (input.categoryId)
    productFilters.push(
      shoppingCategoryProductWhere(input.categoryId, businessCategories),
    );
  const where: Prisma.WarehouseInventoryWhereInput = {
    ...baseWhere,
    ...(input.productIds?.length
      ? { productId: { in: input.productIds } }
      : {}),
    product: { AND: productFilters },
  };
  const offset = (input.page - 1) * input.limit;
  let rankedIds: string[] | undefined;
  let rankedTotal: number | undefined;
  if (input.sort === "topSelling") {
    const candidates = await db.warehouseInventory.findMany({
      where,
      select: {
        id: true,
        productId: true,
        product: {
          select: {
            id: true,
            name: true,
            masterProductId: true,
            barcode: true,
            barcodeAliases: true,
            sku: true,
            unit: true,
          },
        },
      },
    });
    const sales = await (dependencies.readSales ?? readWarehouseCatalogSales)(
      candidates.map((item) => item.product),
      db,
    );
    candidates.sort(
      (a, b) =>
        (sales.get(b.productId) ?? 0) - (sales.get(a.productId) ?? 0) ||
        a.product.name.localeCompare(b.product.name, "mn") ||
        a.id.localeCompare(b.id),
    );
    rankedTotal = candidates.length;
    rankedIds = candidates
      .slice(offset, offset + input.limit)
      .map((item) => item.productId);
  }
  const [total, items] = await Promise.all([
    rankedTotal === undefined
      ? db.warehouseInventory.count({ where })
      : Promise.resolve(rankedTotal),
    db.warehouseInventory.findMany({
      where: rankedIds ? { ...where, productId: { in: rankedIds } } : where,
      select: {
        id: true,
        productId: true,
        quantity: true,
        minQuantity: true,
        location: true,
        product: {
          select: {
            id: true,
            masterProductId: true,
            name: true,
            sku: true,
            barcode: true,
            unit: true,
            price: true,
            images: { take: 1, select: { url: true } },
            category: { select: { id: true, name: true } },
            businessCategory: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ product: { name: "asc" } }, { id: "asc" }],
      skip: rankedIds ? undefined : offset,
      take: input.limit,
    }),
  ]);
  if (rankedIds) {
    const position = new Map(rankedIds.map((id, index) => [id, index]));
    items.sort(
      (a, b) =>
        (position.get(a.productId) ?? 0) - (position.get(b.productId) ?? 0),
    );
  }
  const reserved = await dependencies.reservedStock(
    input.warehouseId,
    items.map((item) => item.productId),
  );
  return {
    items: items.map((item) => ({
      ...item,
      ...stockAvailability(item.quantity, reserved.get(item.productId) ?? 0),
    })),
    categories,
    total,
    hasMore: offset + items.length < total,
  };
}
