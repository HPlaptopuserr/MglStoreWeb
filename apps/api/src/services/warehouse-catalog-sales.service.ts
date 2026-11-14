import { prisma, type Prisma } from "@mgl/database";
import { fromPosStoredStockQuantity } from "@mgl/types";

export interface CatalogSalesProduct {
  id: string;
  name: string;
  masterProductId: string | null;
  barcode: string | null;
  barcodeAliases: string[];
  sku: string | null;
  unit: string | null;
}

const normalized = (value: string) => value.trim().toLocaleLowerCase("mn-MN");

function identityKeys(product: CatalogSalesProduct): string[] {
  const barcodes = [product.barcode, ...product.barcodeAliases]
    .filter((value): value is string => Boolean(value?.trim()))
    .map(normalized);
  return [
    `id:${product.id}`,
    ...(product.masterProductId ? [`master:${product.masterProductId}`] : []),
    ...barcodes.map((barcode) => `barcode:${barcode}`),
    ...(!product.masterProductId && !barcodes.length && product.sku?.trim()
      ? [`sku-name:${normalized(product.sku)}:${normalized(product.name)}`]
      : []),
  ];
}

/** Match store copies using identifiers; a shared name alone is insufficient. */
export function mapSalesProducts(
  warehouseProducts: CatalogSalesProduct[],
  storeProducts: CatalogSalesProduct[],
): Map<string, string[]> {
  const byKey = new Map<string, Set<string>>();
  const byId = new Map(
    warehouseProducts.map((product) => [product.id, product]),
  );
  for (const product of warehouseProducts) {
    for (const key of identityKeys(product)) {
      const ids = byKey.get(key) ?? new Set<string>();
      ids.add(product.id);
      byKey.set(key, ids);
    }
  }
  return new Map(
    storeProducts.map((product) => {
      const ids = new Set(
        identityKeys(product).flatMap((key) => [...(byKey.get(key) ?? [])]),
      );
      return [
        product.id,
        [...ids].filter((id) => {
          const target = byId.get(id)!;
          return (
            !product.masterProductId ||
            !target.masterProductId ||
            product.masterProductId === target.masterProductId
          );
        }),
      ];
    }),
  );
}

/** Completed network sales only; requests and warehouse transfers are not sales. */
export async function readWarehouseCatalogSales(
  products: CatalogSalesProduct[],
  db: Prisma.TransactionClient = prisma,
  now = new Date(),
): Promise<Map<string, number>> {
  if (!products.length) return new Map();
  const since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const masterIds = [
    ...new Set(
      products.flatMap((product) =>
        product.masterProductId ? [product.masterProductId] : [],
      ),
    ),
  ];
  const barcodes = [
    ...new Set(
      products
        .flatMap((product) => [product.barcode, ...product.barcodeAliases])
        .filter((value): value is string => Boolean(value?.trim())),
    ),
  ];
  const skus = [
    ...new Set(
      products.flatMap((product) => (product.sku?.trim() ? [product.sku] : [])),
    ),
  ];
  const copies = await db.product.findMany({
    where: {
      OR: [
        { id: { in: products.map((product) => product.id) } },
        ...(masterIds.length ? [{ masterProductId: { in: masterIds } }] : []),
        ...(barcodes.length
          ? [
              { barcode: { in: barcodes, mode: "insensitive" as const } },
              { barcodeAliases: { hasSome: barcodes } },
            ]
          : []),
        ...(skus.length
          ? [{ sku: { in: skus, mode: "insensitive" as const } }]
          : []),
      ],
    },
    select: {
      id: true,
      name: true,
      masterProductId: true,
      barcode: true,
      barcodeAliases: true,
      sku: true,
      unit: true,
    },
  });
  const targets = mapSalesProducts(products, copies);
  const ids = copies
    .filter((product) => targets.get(product.id)?.length)
    .map((product) => product.id);
  if (!ids.length) return new Map();
  const [online, pos] = await Promise.all([
    db.orderItem.groupBy({
      by: ["productId"],
      where: {
        productId: { in: ids },
        order: {
          status: "COMPLETED",
          deletedAt: null,
          createdAt: { gte: since },
        },
      },
      _sum: { quantity: true },
    }),
    db.posSaleLine.groupBy({
      by: ["productId"],
      where: {
        productId: { in: ids },
        sale: { status: "COMPLETED", createdAt: { gte: since } },
      },
      _sum: { qty: true },
    }),
  ]);
  const units = new Map(copies.map((product) => [product.id, product.unit]));
  const totals = new Map<string, number>();
  const add = (productId: string, quantity: number) => {
    for (const id of targets.get(productId) ?? [])
      totals.set(id, (totals.get(id) ?? 0) + quantity);
  };
  online.forEach((row) => add(row.productId, Number(row._sum.quantity ?? 0)));
  pos.forEach((row) =>
    add(
      row.productId,
      fromPosStoredStockQuantity(
        Number(row._sum.qty ?? 0),
        units.get(row.productId),
      ),
    ),
  );
  return totals;
}
