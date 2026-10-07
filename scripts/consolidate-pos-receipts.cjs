/* Explicit manifest only. Dry-run by default; preserves lot IDs and all stock.
 * manifest: { organizationId, registerId, supplierName, receiptIds, targetId, actorId, reason }
 */
const fs = require("node:fs");
const crypto = require("node:crypto");
const { PrismaClient, Prisma } = require("@prisma/client");
const hash = (value) =>
  crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
async function consolidate(db, manifest, apply = false, backupPath) {
  const {
    organizationId,
    registerId,
    supplierName,
    receiptIds,
    targetId,
    actorId,
    reason,
  } = manifest;
  if (
    !Array.isArray(receiptIds) ||
    receiptIds.length < 2 ||
    new Set(receiptIds).size !== receiptIds.length ||
    !receiptIds.includes(targetId) ||
    !reason
  )
    throw Error("Invalid manifest");
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${organizationId}))`;
      const heads = await tx.$queryRaw(
        Prisma.sql`SELECT "id","mergedIntoId" FROM "PosGoodsReceipt" WHERE "id" IN (${Prisma.join([...receiptIds].sort())}) ORDER BY "id" FOR UPDATE`,
      );
      if (heads.length !== receiptIds.length) throw Error("Missing source");
      const sources = receiptIds.filter((id) => id !== targetId);
      if (
        heads.every((h) =>
          h.id === targetId ? !h.mergedIntoId : h.mergedIntoId === targetId,
        )
      ) {
        const itemCounts = await tx.posGoodsReceiptItem.groupBy({
          by: ["receiptId"],
          where: { receiptId: { in: receiptIds } },
          _count: true,
        });
        if (itemCounts.length === 1 && itemCounts[0].receiptId === targetId)
          return { alreadyApplied: true, targetId };
      }
      if (heads.some((h) => h.mergedIntoId))
        throw Error("Already merged elsewhere");
      const receipts = await tx.posGoodsReceipt.findMany({
        where: { id: { in: receiptIds } },
        include: { items: true },
        orderBy: { id: "asc" },
      });
      if (
        receipts.some(
          (r) =>
            r.organizationId !== organizationId ||
            r.registerId !== registerId ||
            r.supplierName.trim().toLowerCase() !==
              supplierName.toLowerCase() ||
            r.items.length !== 1,
        )
      )
        throw Error("Source scope changed");
      if (new Set(receipts.map((r) => r.branchId)).size !== 1)
        throw Error("Different branches");
      const actorName =
        actorId === "system:receipt-consolidation"
          ? "Систем · нэг удаагийн нэгтгэл"
          : await tx.user
              .findUniqueOrThrow({
                where: { id: actorId },
                select: {
                  email: true,
                  profile: { select: { fullName: true } },
                },
              })
              .then((user) => user.profile?.fullName || user.email);
      const productIds = [
        ...new Set(receipts.flatMap((r) => r.items.map((i) => i.productId))),
      ].sort();
      await tx.$queryRaw(
        Prisma.sql`SELECT "id" FROM "Product" WHERE "id" IN (${Prisma.join(productIds)}) ORDER BY "id" FOR UPDATE`,
      );
      await tx.$queryRaw(
        Prisma.sql`SELECT "id" FROM "PosGoodsReceiptItem" WHERE "receiptId" IN (${Prisma.join(receiptIds)}) ORDER BY "id" FOR UPDATE`,
      );
      const snapshot = async () => ({
        products: await tx.product.findMany({
          where: { id: { in: productIds } },
          orderBy: { id: "asc" },
        }),
        inventories: await tx.warehouseInventory.findMany({
          where: { productId: { in: productIds } },
          orderBy: { id: "asc" },
        }),
        lots: await tx.posGoodsReceiptItem.findMany({
          where: { receiptId: { in: receiptIds } },
          orderBy: { id: "asc" },
        }),
        allocations: await tx.posGoodsReceiptAllocation.findMany({
          where: { receiptItem: { receiptId: { in: receiptIds } } },
          orderBy: { id: "asc" },
        }),
      });
      const before = await snapshot();
      const summary = {
        targetId,
        receipts: receipts.length,
        products: productIds.length,
        quantity: before.lots.reduce((n, r) => n + r.quantity, 0),
        remaining: before.lots.reduce((n, r) => n + r.remainingQuantity, 0),
        allocations: before.allocations.length,
        apply,
      };
      if (!apply) return summary;
      if (!backupPath) throw Error("Backup path required");
      fs.writeFileSync(
        backupPath,
        JSON.stringify({ manifest, receipts, before }, null, 2),
        { flag: "wx", mode: 0o600 },
      );
      const revisions = await tx.$queryRaw(
        Prisma.sql`SELECT "id" FROM "PosGoodsReceiptRevision" WHERE "receiptId" IN (${Prisma.join(receiptIds)})`,
      );
      if (revisions.length)
        throw Error("Review existing corrections before consolidating");
      await tx.$executeRaw(
        Prisma.sql`UPDATE "PosGoodsReceiptItem" SET "receiptId"=${targetId} WHERE "receiptId" IN (${Prisma.join(sources)})`,
      );
      await tx.$executeRaw(
        Prisma.sql`UPDATE "PosGoodsReceipt" SET "mergedIntoId"=${targetId}, "version"="version"+1 WHERE "id" IN (${Prisma.join(sources)})`,
      );
      await tx.$executeRaw`UPDATE "PosGoodsReceipt" SET "version"="version"+1 WHERE "id"=${targetId}`;
      const changes = [
        {
          field: "merge",
          before: JSON.stringify(
            receipts.map((r) => ({
              id: r.id,
              no: r.receiptNo,
              receivedAt: r.receivedAt,
              receivedById: r.receivedById,
              itemIds: r.items.map((i) => i.id),
            })),
          ),
          after: receipts.find((r) => r.id === targetId).receiptNo,
        },
      ];
      await tx.$executeRaw`INSERT INTO "PosGoodsReceiptRevision" ("id","receiptId","actorId","actorName","kind","reason","changes") VALUES (${crypto.randomUUID()},${targetId},${actorId},${actorName},'MERGE',${reason},${JSON.stringify(changes)}::jsonb)`;
      const after = await snapshot();
      const stable = (x) => ({
        ...x,
        lots: x.lots.map(({ receiptId, ...lot }) => lot),
      });
      if (hash(stable(before)) !== hash(stable(after)))
        throw Error("Stock or lot state changed; rollback");
      return { ...summary, preserved: true };
    },
    { timeout: 60000 },
  );
}
module.exports = { consolidate };
if (require.main === module) {
  const manifestPath = process.argv[2];
  if (!manifestPath) throw Error("Manifest file required");
  const db = new PrismaClient();
  consolidate(
    db,
    JSON.parse(fs.readFileSync(manifestPath, "utf8")),
    process.argv.includes("--apply"),
    process.argv.find((a) => a.startsWith("--backup="))?.slice(9),
  )
    .then((r) => console.log(JSON.stringify(r)))
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
}
