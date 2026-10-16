import { prisma } from "@mgl/database";

/** Cafe daily receipts are a separate ledger; never add them to warehouse stock totals. */
export async function readCafeProductHistory(
  productId: string,
  organizationId: string,
  cursor?: string,
) {
  if (
    cursor &&
    !(await prisma.cafeDailyStockReceipt.findFirst({
      where: { id: cursor, productId, organizationId },
      select: { id: true },
    }))
  )
    return null;
  const where = { productId, organizationId };
  const [rows, groups] = await Promise.all([
    prisma.cafeDailyStockReceipt.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 31,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        receivedBy: { select: { profile: { select: { fullName: true } } } },
        branch: { select: { name: true } },
      },
    }),
    prisma.cafeDailyStockReceipt.groupBy({
      by: ["batchId"],
      where,
      _min: { createdAt: true },
      _sum: { quantity: true },
    }),
  ]);
  const dates = groups
    .flatMap((g) => (g._min.createdAt ? [g._min.createdAt.getTime()] : []))
    .sort((a, b) => a - b);
  return {
    summary: {
      arrivalCount: dates.length,
      averageDays:
        dates.length > 1
          ? (dates[dates.length - 1] - dates[0]) / 86400000 / (dates.length - 1)
          : null,
      totalReceived: groups.reduce(
        (sum, g) => sum + Number(g._sum.quantity ?? 0),
        0,
      ),
    },
    entries: rows
      .slice(0, 30)
      .map((row) => ({
        id: row.id,
        date: row.createdAt,
        quantity: Number(row.quantity),
        reason: "RESTOCK",
        note: row.note,
        userName: row.receivedBy?.profile?.fullName ?? null,
        warehouse: row.branch.name,
        source: null,
        document: row.batchId,
        referenceType: "CAFE_DAILY_RECEIPT",
        cancelled: !!row.voidedAt,
      })),
    nextCursor: rows.length > 30 ? rows[29].id : null,
  };
}
