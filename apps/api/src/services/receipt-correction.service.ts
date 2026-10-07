import { prisma, Prisma, InventoryReason } from "@mgl/database";
import { fromPosStoredStockQuantity } from "@mgl/types";
import { adjustStock, resolveOrgWarehouse } from "./inventory.service";
import { reservedStock } from "./stock-reservation.service";
import {
  canCorrectReceipt,
  ReceiptCorrectionError,
  receiptStoredQuantity,
  type ReceiptCorrection,
} from "./receipt-correction.policy";

type Actor = {
  id: string;
  role: string;
  organizationId: string | null;
  orgRole: string | null;
};
interface Change {
  field: string;
  before: string | number | null;
  after: string | number | null;
}
export async function correctReceipt(
  id: string,
  actor: Actor,
  input: ReceiptCorrection,
) {
  return prisma.$transaction(
    async (tx) => {
      const head = await tx.posGoodsReceipt.findUnique({
        where: { id },
        select: { organizationId: true },
      });
      if (!head || !canCorrectReceipt(actor, head.organizationId))
        throw new ReceiptCorrectionError(
          "Зөвхөн өөрийн дэлгүүрийн эзэмшигч засварлана",
          403,
        );
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${head.organizationId}))`;
      await tx.$queryRaw`SELECT "id" FROM "PosGoodsReceipt" WHERE "id"=${id} FOR UPDATE`;
      const receipt = await tx.posGoodsReceipt.findUniqueOrThrow({
        where: { id },
        include: { items: true },
      });
      if (receipt.mergedIntoId || receipt.version !== input.version)
        throw new ReceiptCorrectionError(
          "Баримт өөрчлөгдсөн байна. Хаагаад дахин нээнэ үү.",
          409,
        );
      if (
        input.items.length !== receipt.items.length ||
        input.items.some((i) => !receipt.items.some((r) => r.id === i.id))
      )
        throw new ReceiptCorrectionError(
          "Баримтын мөр нэмэх, устгах боломжгүй",
        );
      const ids = [...new Set(receipt.items.map((i) => i.productId))].sort();
      await tx.$queryRaw(
        Prisma.sql`SELECT "id" FROM "Product" WHERE "id" IN (${Prisma.join(ids)}) ORDER BY "id" FOR UPDATE`,
      );
      await tx.$queryRaw(
        Prisma.sql`SELECT "id" FROM "PosGoodsReceiptItem" WHERE "receiptId"=${id} ORDER BY "id" FOR UPDATE`,
      );
      const lots = await tx.posGoodsReceiptItem.findMany({
        where: { receiptId: id },
        include: { product: true },
      });
      const changes: Change[] = [];
      const record = (
        field: string,
        before: Change["before"],
        after: Change["after"],
      ) => {
        if (before !== after) changes.push({ field, before, after });
      };
      for (const field of [
        "supplierName",
        "supplierRegisterNo",
        "documentNo",
        "note",
      ] as const)
        record(field, receipt[field], input[field]);
      const priceUpdates = new Map<string, number>();
      for (const item of input.items) {
        const lot = lots.find((l) => l.id === item.id)!;
        const label = `${lot.product.name} (мөр ${input.items.indexOf(item) + 1})`;
        const quantity = receiptStoredQuantity(item.quantity, lot.product.unit);
        const delta = quantity - lot.quantity;
        if (delta && receipt.receiptNo.startsWith("STK-"))
          throw new ReceiptCorrectionError(
            "Тооллогоос үүссэн баримтын тоог тооллогын урсгалаар засна уу",
          );
        if (lot.remainingQuantity + delta < 0)
          throw new ReceiptCorrectionError(
            `${lot.product.name}: зарцуулсан хэмжээнээс багасгах боломжгүй`,
          );
        if (delta) {
          const warehouseId = await resolveOrgWarehouse(
            tx,
            receipt.organizationId,
            lot.productId,
          );
          let available = lot.product.stock;
          if (warehouseId) {
            await tx.$queryRaw`SELECT "id" FROM "Warehouse" WHERE "id"=${warehouseId} FOR UPDATE`;
            const inventory = await tx.warehouseInventory.findUniqueOrThrow({
              where: {
                warehouseId_productId: {
                  warehouseId,
                  productId: lot.productId,
                },
              },
            });
            const reserved = await reservedStock(
              warehouseId,
              [lot.productId],
              tx,
            );
            available = inventory.quantity - (reserved.get(lot.productId) ?? 0);
          } else {
            available = (
              await tx.product.findUniqueOrThrow({
                where: { id: lot.productId },
                select: { stock: true },
              })
            ).stock;
          }
          if (available + delta < 0 || available + delta > 2147483647)
            throw new ReceiptCorrectionError(
              `${lot.product.name}: үлдэгдэл / захиалгын нөөц хүрэлцэхгүй`,
            );
          await adjustStock(tx, {
            productId: lot.productId,
            warehouseId: warehouseId ?? undefined,
            change: delta,
            reason: InventoryReason.MANUAL_ADJUST,
            createdById: actor.id,
            referenceType: "POS_RECEIPT_CORRECTION",
            referenceId: receipt.receiptNo,
            note: input.reason,
          });
        }
        record(
          `${label} · Тоо`,
          fromPosStoredStockQuantity(lot.quantity, lot.product.unit),
          item.quantity,
        );
        record(
          `${label} · Авсан нэгжийн өртөг`,
          lot.unitCost === null ? null : Number(lot.unitCost),
          item.unitCost,
        );
        if (item.salePrice !== undefined) {
          if (Number(lot.product.price) !== item.previousSalePrice)
            throw new ReceiptCorrectionError(
              `${lot.product.name}: зарах үнэ өөрчлөгдсөн. Баримтыг дахин нээнэ үү.`,
              409,
            );
          const previous = priceUpdates.get(lot.productId);
          if (previous !== undefined && previous !== item.salePrice)
            throw new ReceiptCorrectionError(
              "Нэг барааны багцуудын зарах үнэ зөрсөн байна",
            );
          if (previous === undefined)
            record(
              `${lot.product.name} · Одоогийн зарах үнэ`,
              Number(lot.product.price),
              item.salePrice,
            );
          priceUpdates.set(lot.productId, item.salePrice);
        }
        await tx.posGoodsReceiptItem.update({
          where: { id: lot.id },
          data: {
            quantity,
            remainingQuantity: { increment: delta },
            unitCost: item.unitCost,
          },
        });
      }
      if (!changes.length)
        throw new ReceiptCorrectionError("Өөрчлөлт оруулаагүй байна");
      for (const [productId, price] of priceUpdates)
        await tx.product.update({ where: { id: productId }, data: { price } });
      const user = await tx.user.findUniqueOrThrow({
        where: { id: actor.id },
        select: { email: true, profile: { select: { fullName: true } } },
      });
      await tx.posGoodsReceipt.update({
        where: { id },
        data: {
          supplierName: input.supplierName,
          supplierRegisterNo: input.supplierRegisterNo,
          documentNo: input.documentNo,
          note: input.note,
          version: { increment: 1 },
        },
      });
      await tx.posGoodsReceiptRevision.create({
        data: {
          receiptId: id,
          actorId: actor.id,
          actorName: user.profile?.fullName || user.email,
          kind: "CORRECTION",
          reason: input.reason,
          changes: changes.map((change) => ({ ...change })),
        },
      });
      return { id, version: receipt.version + 1 };
    },
    { timeout: 30000 },
  );
}
