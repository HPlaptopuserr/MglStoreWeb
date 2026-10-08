import { prisma } from "@mgl/database";
import { assertStocktakeScope } from "./stocktake-scope";
import { StocktakeError } from "./stocktake.policy";
import { stocktakeDetailInclude } from "./stocktake-query";

/** Resolve against the live organization catalog before offering registration. */
export async function resolveStocktakeProduct(input: {
  organizationId: string;
  stocktakeId: string;
  version: number;
  query: string;
}) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Stocktake" WHERE "id" = ${input.stocktakeId} AND "organizationId" = ${input.organizationId} FOR UPDATE`;
      const session = await tx.stocktake.findFirst({
        where: { id: input.stocktakeId, organizationId: input.organizationId },
      });
      if (!session) throw new StocktakeError("Тооллого олдсонгүй", 404);
      await assertStocktakeScope(tx, input.organizationId, session.warehouseId);
      if (session.status !== "DRAFT" || session.version !== input.version)
        throw new StocktakeError(
          "Тооллого өөрчлөгдсөн байна. Дахин ачаална уу.",
          409,
        );
      const barcodeMatches = await tx.product.findMany({
        where: {
          organizationId: input.organizationId,
          deletedAt: null,
          isActive: true,
          OR: [
            { barcode: input.query },
            { barcodeAliases: { has: input.query } },
          ],
        },
        include: {
          warehouseInventories: {
            include: { warehouse: { select: { name: true } } },
          },
        },
        take: 2,
      });
      const matches = barcodeMatches.length
        ? barcodeMatches
        : await tx.product.findMany({
            where: {
              organizationId: input.organizationId,
              deletedAt: null,
              isActive: true,
              name: { equals: input.query, mode: "insensitive" },
            },
            include: {
              warehouseInventories: {
                include: { warehouse: { select: { name: true } } },
              },
            },
            take: 2,
          });
      if (!matches.length) return { session: null, line: null };
      if (matches.length > 1)
        throw new StocktakeError(
          "Энэ код эсвэл нэр олон бараанд бүртгэлтэй. Барааны бүртгэлээс зөв барааны кодыг шалгана уу.",
          409,
        );
      const product = matches[0]!;
      if (product.isRestaurantMenuItem || product.supplyType !== "IN_STOCK")
        throw new StocktakeError(
          `${product.name}: бүртгэлтэй боловч биет үлдэгдлийн тооллогод хамрагдахгүй бараа. Дахин бүртгэх шаардлагагүй.`,
          409,
        );
      const inventory = product.warehouseInventories.find(
        (row) => row.warehouseId === session.warehouseId,
      );
      if (
        session.warehouseId
          ? !inventory
          : product.warehouseInventories.length > 0
      ) {
        const location =
          product.warehouseInventories
            .map((row) => row.warehouse.name)
            .join(", ") || "Агуулахад холбоогүй дэлгүүрийн бараа";
        throw new StocktakeError(
          `${product.name}: бүртгэлтэй, гэхдээ энэ тооллогын агуулахад хамаарахгүй. Бүртгэлтэй сан: ${location}. Тухайн сангийн тооллогыг сонгоно уу; шинэ бараа болгож дахин бүртгэхгүй.`,
          409,
        );
      }
      const existing = await tx.stocktakeLine.findUnique({
        where: {
          stocktakeId_productId: {
            stocktakeId: session.id,
            productId: product.id,
          },
        },
      });
      // Preserve existing quantities/notes and snapshot timestamps. A changed baseline still requires review.
      const metadata = {
        name: product.name,
        barcode: product.barcode,
        barcodeAliases: product.barcodeAliases,
      };
      const line = existing
        ? await tx.stocktakeLine.update({
            where: { id: existing.id },
            data: metadata,
          })
        : await tx.stocktakeLine.create({
            data: {
              ...metadata,
              stocktakeId: session.id,
              productId: product.id,
              unit: product.unit,
              expected: inventory?.quantity ?? product.stock,
              stockUpdatedAt: inventory?.updatedAt ?? product.updatedAt,
            },
          });
      const updated = await tx.stocktake.update({
        where: { id: session.id },
        data: { version: { increment: 1 } },
        include: stocktakeDetailInclude,
      });
      return { session: updated, line };
    },
    { isolationLevel: "Serializable", timeout: 30000 },
  );
}
