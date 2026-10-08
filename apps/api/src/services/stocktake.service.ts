import { assertStocktakeScope } from "./stocktake-scope";
export { assertStocktakeScope } from "./stocktake-scope";
import { createStocktakeReceipts } from "./stocktake-new-product.service";
import { Prisma, prisma } from "@mgl/database";
import type {
  StocktakeCountEdit,
  StocktakeKind,
  StocktakeStatus,
} from "@mgl/types";
import { reconcilePhysicalStock } from "./inventory.service";
import { reservedStock } from "./stock-reservation.service";
import {
  assertReadyForReview,
  StocktakeError,
  stockChanged,
} from "./stocktake.policy";
import { stocktakeDetailInclude } from "./stocktake-query";

type Tx = Prisma.TransactionClient;

export function stocktakeProductFilter(
  organizationId: string,
): Prisma.ProductWhereInput {
  return {
    organizationId,
    deletedAt: null,
    isActive: true,
    isRestaurantMenuItem: false,
    supplyType: "IN_STOCK",
  };
}

async function snapshot(
  tx: Tx,
  organizationId: string,
  warehouseId: string | null,
) {
  const products = await tx.product.findMany({
    where: {
      ...stocktakeProductFilter(organizationId),
      ...(warehouseId
        ? { warehouseInventories: { some: { warehouseId } } }
        : { warehouseInventories: { none: {} } }),
    },
    select: {
      id: true,
      name: true,
      barcode: true,
      barcodeAliases: true,
      unit: true,
      stock: true,
      updatedAt: true,
      warehouseInventories: {
        where: { warehouseId: warehouseId ?? "" },
        select: { quantity: true, updatedAt: true },
      },
    },
    orderBy: { id: "asc" },
  });
  return products.map((product) => ({
    productId: product.id,
    name: product.name,
    barcode: product.barcode,
    barcodeAliases: product.barcodeAliases,
    unit: product.unit,
    expected: warehouseId
      ? product.warehouseInventories[0]!.quantity
      : product.stock,
    stockUpdatedAt: warehouseId
      ? product.warehouseInventories[0]!.updatedAt
      : product.updatedAt,
  }));
}

export function missingStocktakeLines<T extends { productId: string }>(
  current: T[],
  existing: { productId: string }[],
) {
  const existingProductIds = new Set(existing.map((line) => line.productId));
  return current.filter((line) => !existingProductIds.has(line.productId));
}

async function addMissingStocktakeLines(
  tx: Tx,
  session: {
    id: string;
    organizationId: string;
    warehouseId: string | null;
    lines: { productId: string }[];
  },
) {
  const missing = missingStocktakeLines(
    await snapshot(tx, session.organizationId, session.warehouseId),
    session.lines,
  );

  for (let offset = 0; offset < missing.length; offset += 500)
    await tx.stocktakeLine.createMany({
      data: missing
        .slice(offset, offset + 500)
        .map((line) => ({ ...line, stocktakeId: session.id })),
    });

  return missing.length;
}

export function createStocktake(input: {
  id: string;
  organizationId: string;
  warehouseId: string | null;
  title: string;
  kind: StocktakeKind;
  actorId: string;
}) {
  return prisma.$transaction(
    async (tx) => {
      await assertStocktakeScope(tx, input.organizationId, input.warehouseId);
      // Serialize creation per organization. Idempotency survives a lost HTTP response.
      await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${input.organizationId} FOR UPDATE`;
      const existing = await tx.stocktake.findUnique({
        where: { id: input.id },
        include: stocktakeDetailInclude,
      });
      if (existing) {
        if (
          existing.organizationId !== input.organizationId ||
          existing.createdById !== input.actorId
        )
          throw new StocktakeError("Тооллогын дугаар ашиглагдсан байна", 409);
        return existing;
      }
      const active = await tx.stocktake.findFirst({
        where: {
          organizationId: input.organizationId,
          warehouseId: input.warehouseId,
          status: { in: ["DRAFT", "REVIEW"] },
        },
      });
      if (active)
        throw new StocktakeError(
          "Энэ санд дуусаагүй тооллого байна. Түүнийг үргэлжлүүлнэ үү.",
          409,
        );
      const lines = await snapshot(tx, input.organizationId, input.warehouseId);
      if (!lines.length)
        throw new StocktakeError("Сонгосон санд тоолох бараа алга байна");
      await tx.stocktake.create({
        data: {
          id: input.id,
          organizationId: input.organizationId,
          warehouseId: input.warehouseId,
          title: input.title,
          kind: input.kind,
          createdById: input.actorId,
        },
      });
      for (let offset = 0; offset < lines.length; offset += 500)
        await tx.stocktakeLine.createMany({
          data: lines
            .slice(offset, offset + 500)
            .map((line) => ({ ...line, stocktakeId: input.id })),
        });
      return tx.stocktake.findUniqueOrThrow({
        where: { id: input.id },
        include: stocktakeDetailInclude,
      });
    },
    { isolationLevel: "Serializable", timeout: 30000 },
  );
}

/**
 * Remove products that became ineligible after a draft stocktake was opened.
 * This keeps existing drafts aligned with the active POS catalog without
 * resetting counts for otherwise unchanged products.
 */
export function loadStocktake(input: {
  id: string;
  organizationId: string;
}) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Stocktake" WHERE "id" = ${input.id} AND "organizationId" = ${input.organizationId} FOR UPDATE`;
    const session = await tx.stocktake.findFirst({
      where: { id: input.id, organizationId: input.organizationId },
      include: stocktakeDetailInclude,
    });
    if (!session || session.status !== "DRAFT") return session;

    const removed = await tx.stocktakeLine.deleteMany({
      where: {
        stocktakeId: session.id,
        NOT: {
          product: { is: stocktakeProductFilter(input.organizationId) },
        },
      },
    });
    const added =
      session.kind === "FULL"
        ? await addMissingStocktakeLines(tx, session)
        : 0;
    if (!removed.count && !added) return session;

    return tx.stocktake.update({
      where: { id: session.id },
      data: { version: { increment: 1 } },
      include: stocktakeDetailInclude,
    });
  });
}

export type StocktakeAction =
  | "save"
  | "submit"
  | "reopen"
  | "refresh"
  | "convert_full"
  | "approve"
  | "cancel";
export function mutateStocktake(input: {
  organizationId: string;
  id: string;
  version: number;
  action: StocktakeAction;
  actorId: string;
  edits?: StocktakeCountEdit[];
}) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Stocktake" WHERE "id" = ${input.id} AND "organizationId" = ${input.organizationId} FOR UPDATE`;
      const session = await tx.stocktake.findFirst({
        where: { id: input.id, organizationId: input.organizationId },
        include: stocktakeDetailInclude,
      });
      if (!session) throw new StocktakeError("Тооллого олдсонгүй", 404);
      // Retried approvals must never create a second ledger adjustment.
      if (
        (input.action === "approve" && session.status === "APPROVED") ||
        (input.action === "cancel" && session.status === "CANCELLED") ||
        (input.action === "convert_full" && session.kind === "FULL")
      )
        return session;
      if (session.version !== input.version)
        throw new StocktakeError(
          "Тооллого өөр цонхонд шинэчлэгдсэн байна. Хадгалаагүй тоогоо шалгаад дахин ачаална уу.",
          409,
        );
      if (session.status === "APPROVED" || session.status === "CANCELLED")
        throw new StocktakeError("Дууссан тооллогыг засах боломжгүй", 409);
      await assertStocktakeScope(tx, input.organizationId, session.warehouseId);
      let status: StocktakeStatus = session.status;
      if (input.action === "save") {
        if (status !== "DRAFT")
          throw new StocktakeError(
            "Хяналтад илгээсэн тооллогыг засах боломжгүй",
            409,
          );
        const ids = new Set(session.lines.map((line) => line.id));
        if (
          !input.edits?.length ||
          input.edits.some((edit) => !ids.has(edit.id))
        )
          throw new StocktakeError("Тооллогын мөр олдсонгүй");
        const values = Prisma.join(
          input.edits.map(
            (edit) =>
              Prisma.sql`(${edit.id}, ${edit.counted}::integer, ${edit.note})`,
          ),
        );
        await tx.$executeRaw`UPDATE "StocktakeLine" AS line
          SET "counted" = edits.quantity, "note" = edits.note,
            "countedAt" = CASE WHEN edits.quantity IS NULL THEN NULL ELSE clock_timestamp() END,
            "countedById" = CASE WHEN edits.quantity IS NULL THEN NULL ELSE ${input.actorId} END
          FROM (VALUES ${values}) AS edits(id, quantity, note)
          WHERE line."id" = edits.id AND line."stocktakeId" = ${session.id}`;
      } else if (input.action === "submit") {
        if (status !== "DRAFT")
          throw new StocktakeError("Тооллого аль хэдийн хяналтад байна", 409);
        assertReadyForReview(session.kind, session.lines);
        status = "REVIEW";
      } else if (input.action === "reopen") {
        if (status !== "REVIEW")
          throw new StocktakeError(
            "Зөвхөн хяналтад байгаа тооллогыг буцаана",
            409,
          );
        status = "DRAFT";
      } else if (input.action === "refresh") {
        if (status !== "DRAFT")
          throw new StocktakeError("Эхлээд тооллогыг засварт буцаана уу", 409);
        const current = await snapshot(
          tx,
          session.organizationId,
          session.warehouseId,
        );
        const previous = new Map(
          session.lines.map((line) => [line.productId, line]),
        );
        const ids = current.map((line) => line.productId);
        const reset = current.filter((row) => {
          const old = previous.get(row.productId);
          return !old || stockChanged(old, row);
        });
        await tx.stocktakeLine.deleteMany({
          where: {
            stocktakeId: session.id,
            OR: [
              { productId: { notIn: ids } },
              { productId: { in: reset.map((row) => row.productId) } },
            ],
          },
        });
        for (let offset = 0; offset < reset.length; offset += 500)
          await tx.stocktakeLine.createMany({
            data: reset.slice(offset, offset + 500).map((row) => ({
              ...row,
              id: previous.get(row.productId)?.id,
              receiptRegisterId: previous.get(row.productId)?.receiptRegisterId,
              receiptUnitCost: previous.get(row.productId)?.receiptUnitCost,
              stocktakeId: session.id,
            })),
          });
      } else if (input.action === "convert_full") {
        if (status !== "DRAFT")
          throw new StocktakeError(
            "Хяналтад байгаа тооллогыг эхлээд засварт буцаана уу",
            409,
          );
        await addMissingStocktakeLines(tx, session);
      } else if (input.action === "approve") {
        if (status !== "REVIEW")
          throw new StocktakeError("Эхлээд хяналтад илгээнэ үү", 409);
        assertReadyForReview(session.kind, session.lines);
        const counted = session.lines
          .filter((line) => line.counted !== null)
          .sort((a, b) => a.productId.localeCompare(b.productId));
        const ids = counted.map((line) => line.productId);
        // Product locks also serialize warehouse aggregate updates against other scopes.
        await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id" IN (${Prisma.join(ids)}) ORDER BY "id" FOR UPDATE`;
        if (session.warehouseId)
          await tx.$queryRaw`SELECT "id" FROM "WarehouseInventory" WHERE "warehouseId" = ${session.warehouseId} AND "productId" IN (${Prisma.join(ids)}) ORDER BY "productId" FOR UPDATE`;
        const current = await snapshot(
          tx,
          session.organizationId,
          session.warehouseId,
        );
        const byId = new Map(current.map((line) => [line.productId, line]));
        const changed = counted.filter((line) =>
          stockChanged(line, byId.get(line.productId)),
        );
        if (
          changed.length ||
          (session.kind === "FULL" && current.length !== session.lines.length)
        )
          throw new StocktakeError(
            `Үлдэгдэл эсвэл барааны бүртгэл өөрчлөгдсөн (${changed.length} мөр). Засварт буцааж «Өөрчлөгдсөн барааг дахин тоолох» үйлдлийг хийнэ үү.`,
            409,
          );
        const reserved = session.warehouseId
          ? await reservedStock(session.warehouseId, ids, tx)
          : new Map<string, number>();
        for (const line of counted) {
          const quantity = line.counted!;
          if (quantity < (reserved.get(line.productId) ?? 0))
            throw new StocktakeError(
              `${line.name}: тоолсон тоо нөөцөлсөн захиалгын тооноос бага байна. Захиалгын нөөцлөлтийг эхлээд шийдвэрлэнэ үү.`,
              409,
            );
        }
        await reconcilePhysicalStock(tx, {
          warehouseId: session.warehouseId,
          referenceId: session.id,
          createdById: input.actorId,
          lines: counted.map((line) => ({
            productId: line.productId,
            change: line.counted! - line.expected,
            note: `${session.title}: ${line.note}`,
          })),
        });
        await createStocktakeReceipts(tx, session, input.actorId);
        status = "APPROVED";
      } else status = "CANCELLED";
      return tx.stocktake.update({
        where: { id: session.id },
        data: {
          status,
          ...(input.action === "convert_full" ? { kind: "FULL" as const } : {}),
          version: { increment: 1 },
          ...(status === "APPROVED"
            ? { approvedById: input.actorId, approvedAt: new Date() }
            : {}),
        },
        include: stocktakeDetailInclude,
      });
    },
    { isolationLevel: "Serializable", timeout: 30000 },
  );
}
