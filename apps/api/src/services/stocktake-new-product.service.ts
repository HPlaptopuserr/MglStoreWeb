import { Prisma, prisma } from "@mgl/database";
import { type StocktakeNewProduct } from "@mgl/types";
import { inputRecord, StocktakeError } from "./stocktake.policy";
import { assertStocktakeScope } from "./stocktake-scope";

export function parseStocktakeNewProduct(value: unknown): StocktakeNewProduct {
  const body = inputRecord(value);
  const text = (key: string, max: number, required = true) => {
    const value = body[key];
    if (typeof value !== "string" || value.trim().length > max || (required && !value.trim()))
      throw new StocktakeError("Барааны мэдээллээ шалгана уу");
    return value.trim();
  };
  const id = text("id", 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
    throw new StocktakeError("Хүсэлтийн дугаар буруу байна");
  if (body.unit !== "pcs" && body.unit !== "kg") throw new StocktakeError("Хэмжих нэгж буруу байна");
  for (const key of ["quantity", "unitCost", "salePrice"] as const) {
    if (typeof body[key] !== "number" || !Number.isFinite(body[key]) || body[key] < 0 || body[key] > 1_000_000_000)
      throw new StocktakeError("Тоо хэмжээ, үнээ шалгана уу");
  }
  const quantity = body.quantity as number;
  const scaled = quantity * (body.unit === "kg" ? 1000 : 1);
  if (Math.round(scaled) < 1 || scaled > 2147483647 || Math.abs(scaled - Math.round(scaled)) > 0.000001)
    throw new StocktakeError("Ширхэг бүхэл, кг 3 хүртэл орны нарийвчлалтай байна");
  return { id, name: text("name", 200), barcode: text("barcode", 100, false),
    registerId: text("registerId", 100), unit: body.unit, quantity,
    unitCost: body.unitCost as number, salePrice: body.salePrice as number };
}

export async function addStocktakeProduct(input: {
  organizationId: string; stocktakeId: string; actorId: string; version: number; product: StocktakeNewProduct;
}) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Stocktake" WHERE "id" = ${input.stocktakeId} AND "organizationId" = ${input.organizationId} FOR UPDATE`;
    const session = await tx.stocktake.findFirst({ where: { id: input.stocktakeId, organizationId: input.organizationId } });
    if (!session) throw new StocktakeError("Тооллого олдсонгүй", 404);
    await assertStocktakeScope(tx, input.organizationId, session.warehouseId);
    const include = { warehouse: { select: { name: true } }, lines: { orderBy: { name: "asc" as const } } };
    const prior = await tx.stocktakeLine.findUnique({ where: { stocktakeId_productId: { stocktakeId: session.id, productId: input.product.id } } });
    if (prior) return tx.stocktake.findUniqueOrThrow({ where: { id: session.id }, include });
    if (session.status !== "DRAFT" || session.version !== input.version)
      throw new StocktakeError("Тооллого өөрчлөгдсөн байна. Дахин ачаална уу", 409);
    const register = await tx.posRegister.findFirst({ where: { id: input.product.registerId, organizationId: input.organizationId, isActive: true, deletedAt: null } });
    if (!register) throw new StocktakeError("Байгууллагын идэвхтэй касс сонгоно уу");
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.organizationId}))`;
    const data = input.product;
    if (data.barcode && await tx.product.findFirst({ where: { organizationId: input.organizationId, deletedAt: null,
      OR: [{ barcode: data.barcode }, { barcodeAliases: { has: data.barcode } }] }, select: { id: true } }))
      throw new StocktakeError("Энэ баркодтой бараа бүртгэлтэй байна. Тоолох сангаа шалгаж, өөрчлөгдсөн барааг дахин ачаална уу", 409);
    const product = await tx.product.create({ data: {
      id: data.id, organizationId: input.organizationId, name: data.name, barcode: data.barcode || null,
      unit: data.unit, price: data.salePrice, costPrice: data.unitCost, stock: 0,
    } });
    const inventory = session.warehouseId ? await tx.warehouseInventory.create({ data: { warehouseId: session.warehouseId, productId: product.id, quantity: 0 } }) : null;
    await tx.stocktakeLine.create({ data: {
      stocktakeId: session.id, productId: product.id, name: product.name, barcode: product.barcode, unit: product.unit,
      expected: 0, counted: Math.round(data.quantity * (data.unit === "kg" ? 1000 : 1)),
      stockUpdatedAt: inventory?.updatedAt ?? product.updatedAt, countedAt: new Date(), countedById: input.actorId,
      note: "Тооллогоор илэрсэн бүртгэлгүй бараа", receiptRegisterId: register.id, receiptUnitCost: data.unitCost,
    } });
    return tx.stocktake.update({ where: { id: session.id }, data: { version: { increment: 1 } }, include });
  }, { isolationLevel: "Serializable", timeout: 30000 });
}

export async function createStocktakeReceipts(tx: Prisma.TransactionClient, session: {
  id: string; title: string; organizationId: string;
  lines: { productId: string; counted: number | null; expected: number; receiptRegisterId: string | null; receiptUnitCost: Prisma.Decimal | null }[];
}, actorId: string) {
  const lines = session.lines.filter(line => line.receiptRegisterId && line.counted !== null && line.counted > line.expected);
  for (const registerId of new Set(lines.map(line => line.receiptRegisterId!))) {
    const register = await tx.posRegister.findFirst({ where: { id: registerId, organizationId: session.organizationId, deletedAt: null, isActive: true } });
    if (!register) throw new StocktakeError("Шинэ барааны баримтад сонгосон касс идэвхгүй болсон байна", 409);
    await tx.posGoodsReceipt.create({ data: {
      receiptNo: `STK-${session.id}-${registerId}`, organizationId: session.organizationId,
      branchId: register.branchId, registerId, receivedById: actorId, supplierName: "Тооллогоор илэрсэн бараа",
      documentNo: session.id, note: `Тооллого: ${session.title}`,
      items: { create: lines.filter(line => line.receiptRegisterId === registerId).map(line => ({
        productId: line.productId, quantity: line.counted! - line.expected,
        remainingQuantity: line.counted! - line.expected, unitCost: line.receiptUnitCost,
      })) },
    } });
  }
}
