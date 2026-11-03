import { readMonthlyDividend } from "./warehouse-dividend.service";
import { prisma, Prisma } from "@mgl/database";
import type { WarehouseInvestmentSummary } from "@mgl/types";
import type { WarehouseActor } from "./warehouse-access.service";
import { assertWarehouseViewerManagement } from "./warehouse-viewer-access.service";
import { parseInvestmentInput } from "./warehouse-investment.policy";
import { WarehouseViewerError } from "./warehouse-viewer.policy";

export async function readWarehouseInvestmentSummary(
  tx: Prisma.TransactionClient,
  warehouseId: string,
  userId: string,
  isOperator: boolean,
): Promise<WarehouseInvestmentSummary> {
  const monthlyDividend = await readMonthlyDividend(
    tx,
    warehouseId,
    userId,
    isOperator,
  );
  if (isOperator) {
    const total = await tx.warehouseInvestment.aggregate({
      where: { warehouseId },
      _sum: { amount: true },
      _max: { updatedAt: true },
    });
    return {
      amount: total._sum.amount?.toFixed(2) ?? "0.00",
      currency: "MNT",
      monthlyDividend,
      scope: "WAREHOUSE",
      updatedAt: total._max.updatedAt?.toISOString() ?? null,
    };
  }
  const ownInvestment = await tx.warehouseInvestment.findUnique({
    where: { warehouseId_userId: { warehouseId, userId } },
    select: { amount: true, updatedAt: true },
  });
  return {
    amount: ownInvestment?.amount.toFixed(2) ?? "0.00",
    currency: "MNT",
    monthlyDividend,
    scope: "PERSONAL",
    updatedAt: ownInvestment?.updatedAt.toISOString() ?? null,
  };
}

export async function recordWarehouseInvestment(
  actor: WarehouseActor & { userId: string },
  warehouseId: string,
  userId: string,
  body: unknown,
) {
  await assertWarehouseViewerManagement(actor, warehouseId);
  const input = parseInvestmentInput(body);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`warehouse-investment:${warehouseId}:${userId}`}, 0))`;
    const viewer = await tx.warehouseViewer.findFirst({
      where: {
        warehouseId,
        userId,
        warehouse: { type: "CENTRAL", isActive: true, deletedAt: null },
        user: { isActive: true, deletedAt: null },
      },
      select: { id: true },
    });
    if (!viewer)
      throw new WarehouseViewerError(
        "Энэ агуулахын хөрөнгө оруулагч олдсонгүй.",
        404,
      );
    const key = { warehouseId_userId: { warehouseId, userId } };
    const current = await tx.warehouseInvestment.findUnique({ where: key });
    if ((current?.version ?? 0) !== input.version)
      throw new WarehouseViewerError(
        "Өөр оператор энэ дүнг шинэчилсэн байна. Жагсаалтыг дахин ачаалаад шалгана уу.",
        409,
      );
    const enteredAmount = new Prisma.Decimal(input.amount);
    const amount =
      input.mode === "TOP_UP"
        ? (current?.amount ?? new Prisma.Decimal(0)).plus(enteredAmount)
        : enteredAmount;
    if (amount.greaterThan("999999999999.99"))
      throw new WarehouseViewerError(
        "Нийт хөрөнгө оруулалт зөвшөөрөгдсөн дээд дүнгээс хэтэрлээ.",
      );
    if (current?.amount.equals(amount)) return current;
    const record = current
      ? await tx.warehouseInvestment.update({
          where: { id: current.id },
          data: {
            amount,
            version: { increment: 1 },
            updatedById: actor.userId,
          },
        })
      : await tx.warehouseInvestment.create({
          data: { warehouseId, userId, amount, updatedById: actor.userId },
        });
    await tx.auditLog.create({
      data: {
        userId: actor.userId,
        action: "WAREHOUSE_INVESTMENT_UPDATED",
        meta: {
          warehouseId,
          targetUserId: userId,
          mode: input.mode,
          enteredAmount: enteredAmount.toFixed(2),
          previousAmount: current?.amount.toFixed(2) ?? "0.00",
          amount: amount.toFixed(2),
          version: record.version,
          currency: "MNT",
        },
      },
    });
    return record;
  });
}
