import { getReviewStatusForVendorMutation } from "./vendor-content-review.service";
import { randomUUID } from "node:crypto";
import { InventoryReason, Prisma } from "@mgl/database";
import {
  Permission,
  fromPosStoredStockQuantity,
  normalizePosMeasureUnit,
  toPosStoredStockQuantity,
} from "@mgl/types";
import { adjustStock } from "./inventory.service";
import {
  lockOrganizationInventory,
  resolveProductInventoryWarehouse,
} from "./vendor-inventory-warehouse.service";

export class StockCheckError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
export interface StockCheckInput {
  organizationId: string;
  expectedStock: number;
  expectedPrice: number;
  expectedUnit: string;
  stock?: number;
  price?: number;
  note: string;
}
export function parseStockCheckInput(body: unknown): StockCheckInput {
  if (!body || typeof body !== "object")
    throw new StockCheckError(400, "Засварын мэдээлэл буруу байна");
  const data = body as Record<string, unknown>;
  const validNumber = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value) && value >= 0;
  if (
    typeof data.organizationId !== "string" ||
    !data.organizationId.trim() ||
    typeof data.expectedUnit !== "string" ||
    !validNumber(data.expectedStock) ||
    !validNumber(data.expectedPrice) ||
    (data.stock !== undefined && !validNumber(data.stock)) ||
    (data.price !== undefined && !validNumber(data.price)) ||
    (data.stock === undefined && data.price === undefined)
  ) {
    throw new StockCheckError(
      400,
      "Үнэ, үлдэгдэл болон өмнөх мэдээллээ шалгана уу",
    );
  }
  if (
    typeof data.note !== "string" ||
    data.note.trim().length < 3 ||
    data.note.trim().length > 500
  )
    throw new StockCheckError(
      400,
      "Засварын шалтгааныг 3–500 тэмдэгтээр оруулна уу",
    );
  if (
    data.price !== undefined &&
    (data.price > 999999999999999 ||
      Math.abs(data.price * 100 - Math.round(data.price * 100)) > 0.00001)
  )
    throw new StockCheckError(
      400,
      "Үнэ хамгийн ихдээ хоёр орны бутархайтай байна",
    );
  return {
    organizationId: data.organizationId.trim(),
    expectedStock: data.expectedStock,
    expectedPrice: data.expectedPrice,
    expectedUnit: data.expectedUnit,
    stock: data.stock,
    price: data.price,
    note: data.note.trim(),
  };
}

export async function saveBusinessStockCheck(
  tx: Prisma.TransactionClient,
  productId: string,
  actorId: string,
  permissions: ReadonlySet<Permission>,
  input: StockCheckInput,
) {
  // Use the inventory service's canonical organization → product lock order.
  await lockOrganizationInventory(tx, input.organizationId);
  await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id" = ${productId} FOR UPDATE`;
  const product = await tx.product.findFirst({
    where: {
      id: productId,
      organizationId: input.organizationId,
      managedByWarehouseId: null,
      deletedAt: null,
      organization: {
        deletedAt: null,
        status: "ACTIVE",
        businessInventoryEnabled: true,
      },
    },
  });
  if (!product)
    throw new StockCheckError(404, "Танай байгууллагын бараа олдсонгүй");
  if (product.supplyType === "CHINA_PREORDER")
    throw new StockCheckError(
      409,
      "Захиалгын барааны үлдэгдлийг тооллогоор өөрчлөх боломжгүй",
    );
  const unit = normalizePosMeasureUnit(product.unit);
  const beforeStock = fromPosStoredStockQuantity(product.stock, unit);
  const beforePrice = Number(product.price);
  if (
    normalizePosMeasureUnit(input.expectedUnit) !== unit ||
    input.expectedStock !== beforeStock ||
    !product.price.equals(input.expectedPrice)
  )
    throw new StockCheckError(
      409,
      "Барааны үнэ эсвэл үлдэгдэл өөрчлөгдсөн байна. Мэдээллээ шинэчлээд дахин тоолно уу.",
    );
  const afterStock = input.stock ?? beforeStock;
  const afterPrice = input.price ?? beforePrice;
  const storedStock = toPosStoredStockQuantity(afterStock, unit);
  if (
    !Number.isSafeInteger(storedStock) ||
    storedStock > 2147483647 ||
    Math.abs(fromPosStoredStockQuantity(storedStock, unit) - afterStock) >
      0.0000001
  )
    throw new StockCheckError(
      400,
      "Ширхэгийн тоо бүхэл, жингийн тоо гурван орны бутархайтай байна",
    );
  const stockChanged = storedStock !== product.stock;
  const priceChanged = !product.price.equals(afterPrice);
  if (stockChanged && !permissions.has(Permission.MANAGE_STOCK))
    throw new StockCheckError(403, "Үлдэгдэл засах эрхгүй байна");
  if (priceChanged && !permissions.has(Permission.MANAGE_PRODUCTS))
    throw new StockCheckError(403, "Үнэ засах эрхгүй байна");
  if (!stockChanged && !priceChanged)
    return {
      changed: false,
      productId,
      stock: beforeStock,
      price: beforePrice,
    };
  const referenceId = randomUUID();
  const metadata = {
    version: 1,
    organizationId: input.organizationId,
    beforeStock,
    afterStock,
    beforePrice,
    afterPrice,
    unit,
  };
  if (stockChanged) {
    const warehouseId = await resolveProductInventoryWarehouse(
      tx,
      input.organizationId,
      productId,
      actorId,
      true,
    );
    if (warehouseId) {
      const inventory = await tx.warehouseInventory.findUnique({
        where: { warehouseId_productId: { warehouseId, productId } },
        select: { quantity: true },
      });
      if ((inventory?.quantity ?? 0) !== product.stock)
        throw new StockCheckError(
          409,
          "Барааны үлдэгдэл агуулахын бүртгэлтэй зөрсөн байна. Эхлээд бүртгэлийг тулгана уу.",
        );
    }
    await adjustStock(tx, {
      productId,
      warehouseId: warehouseId ?? undefined,
      change: storedStock - product.stock,
      reason: InventoryReason.MANUAL_ADJUST,
      note: input.note,
      createdById: actorId,
      referenceId,
      referenceType: "BUSINESS_STOCK_CHECK",
      metadata,
    });
    if (warehouseId)
      await tx.warehouseInventory.updateMany({
        where: { productId, warehouseId },
        data: { lastAuditedAt: new Date() },
      });
  } else {
    await tx.inventoryLedger.create({
      data: {
        productId,
        change: 0,
        reason: InventoryReason.MANUAL_ADJUST,
        createdById: actorId,
        referenceId,
        referenceType: "BUSINESS_STOCK_CHECK",
        note: input.note,
        metadata,
      },
    });
  }
  if (priceChanged)
    await tx.product.update({
      where: { id: productId },
      data: {
        price: afterPrice,
        ...(await getReviewStatusForVendorMutation()),
      },
    });
  return {
    changed: true,
    productId,
    stock: afterStock,
    price: afterPrice,
    referenceId,
  };
}
