import { Prisma, type WarehouseType } from "@mgl/database";

export class WarehouseProductOwnershipError extends Error {
  readonly status = 409;
  constructor() {
    super("Барааны дэлгүүр, агуулахын эзэмшил зөрсөн байна. Бүртгэлийг тулгаж зассаны дараа дахин оролдоно уу.");
  }
}

type OwnershipTransaction = Pick<Prisma.TransactionClient, "warehouse" | "product" | "$queryRaw">;

const warehouseOwnershipSelect = {
  id: true,
  type: true,
  catalogOrganizationId: true,
  isActive: true,
  deletedAt: true,
  organizations: { select: { organizationId: true } },
} satisfies Prisma.WarehouseSelect;

interface WarehouseOwnership {
  id: string;
  type: WarehouseType;
  catalogOrganizationId: string | null;
  isActive: boolean;
  deletedAt: Date | null;
  organizations: readonly { organizationId: string }[];
}

interface ProductOwnership {
  organizationId: string | null;
  managedByWarehouseId: string | null;
}

/** Delivery assignments are customer relationships, never catalog ownership. */
export function warehouseOwnsProduct(warehouse: WarehouseOwnership, product: ProductOwnership): boolean {
  if (!warehouse.isActive || warehouse.deletedAt) return false;
  if (warehouse.type === "CENTRAL") {
    return product.organizationId === null && product.managedByWarehouseId === warehouse.id;
  }
  return warehouse.type === "VENDOR_INTERNAL" && warehouse.organizations.length === 1 &&
    product.organizationId === warehouse.organizations[0].organizationId && product.managedByWarehouseId === null;
}

async function ownedProducts(tx: OwnershipTransaction, productIds: readonly string[]) {
  const ids = [...new Set(productIds)].sort();
  if (!ids.length) return [];
  // Serialize ownership changes with stock mutations. Archived products remain
  // eligible for a legitimate reversal; callers validate their document state.
  await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id" IN (${Prisma.join(ids)}) ORDER BY "id" FOR UPDATE`;
  const products = await tx.product.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      organizationId: true,
      managedByWarehouseId: true,
      warehouseInventories: { select: { warehouse: { select: warehouseOwnershipSelect } } },
    },
  });
  if (products.length !== ids.length || products.some(product =>
    product.warehouseInventories.some(inventory => !warehouseOwnsProduct(inventory.warehouse, product)))) {
    throw new WarehouseProductOwnershipError();
  }
  return products;
}

/** Validate every link before aggregating stock, including pre-existing bad links. */
export async function assertProductInventoryOwnership(tx: OwnershipTransaction, productIds: readonly string[]): Promise<void> {
  await ownedProducts(tx, productIds);
}

export async function assertUnassignedProductInventory(tx: OwnershipTransaction, productIds: readonly string[]): Promise<void> {
  const products = await ownedProducts(tx, productIds);
  if (products.some(product => product.managedByWarehouseId !== null || product.warehouseInventories.length > 0)) {
    throw new WarehouseProductOwnershipError();
  }
}

export async function assertWarehouseProductsOwned(
  tx: OwnershipTransaction,
  warehouseId: string,
  productIds: readonly string[],
): Promise<void> {
  const products = await ownedProducts(tx, productIds);
  const warehouse = await tx.warehouse.findUnique({
    where: { id: warehouseId },
    select: warehouseOwnershipSelect,
  });
  if (!warehouse || products.some(product => !warehouseOwnsProduct(warehouse, product))) {
    throw new WarehouseProductOwnershipError();
  }
}

/** Refuse legacy identity collisions instead of importing a second physical stock. */
export async function assertWarehouseImportIdentity(
  tx: OwnershipTransaction,
  warehouseId: string,
  identity: { sku: string | null; name: string },
): Promise<void> {
  const identifiers: Prisma.ProductWhereInput[] = [
    { name: { equals: identity.name, mode: "insensitive" } },
  ];
  if (identity.sku) identifiers.push(
    { sku: identity.sku },
    { barcode: identity.sku },
    { barcodeAliases: { has: identity.sku } },
  );
  const candidates = await tx.product.findMany({
    where: {
      deletedAt: null,
      warehouseInventories: { some: { warehouseId } },
      OR: identifiers,
    },
    select: { id: true },
  });
  if (candidates.length) {
    await assertWarehouseProductsOwned(tx, warehouseId, candidates.map(product => product.id));
  }
}
