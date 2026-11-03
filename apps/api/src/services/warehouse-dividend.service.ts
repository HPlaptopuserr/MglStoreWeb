import { serializeDividendDecision } from "./warehouse-dividend-decision.service";
import { prisma, Prisma } from "@mgl/database";
import {
  currentWarehouseMonth,
  type WarehouseMonthlyDividend,
} from "@mgl/types";
import type { WarehouseActor } from "./warehouse-access.service";
import { assertWarehouseViewerManagement } from "./warehouse-viewer-access.service";
import { WarehouseViewerError } from "./warehouse-viewer.policy";
import { parseDividendInput } from "./warehouse-dividend.policy";

export async function readMonthlyDividend(
  tx: Prisma.TransactionClient,
  warehouseId: string,
  userId: string,
  isOperator: boolean,
): Promise<WarehouseMonthlyDividend> {
  const month = currentWarehouseMonth();
  if (!isOperator) {
    const own = await tx.warehouseInvestorDividend.findUnique({
      where: { warehouseId_userId_month: { warehouseId, userId, month } },
      include: { decision: true },
    });
    return {
      month,
      id: own?.id,
      version: own?.version ?? 0,
      amount: own?.amount.toFixed(2) ?? "0.00",
      updatedAt: own?.updatedAt.toISOString() ?? null,
      decision: own?.decision ? serializeDividendDecision(own.decision) : null,
    };
  }
  const total = await tx.warehouseInvestorDividend.aggregate({
    where: { warehouseId, month, ...(!isOperator ? { userId } : {}) },
    _sum: { amount: true },
    _max: { updatedAt: true },
  });
  return {
    month,
    amount: total._sum.amount?.toFixed(2) ?? "0.00",
    updatedAt: total._max.updatedAt?.toISOString() ?? null,
  };
}

export async function recordMonthlyDividend(
  actor: WarehouseActor & { userId: string },
  warehouseId: string,
  userId: string,
  body: unknown,
) {
  await assertWarehouseViewerManagement(actor, warehouseId);
  const input = parseDividendInput(body);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`warehouse-dividend:${warehouseId}:${userId}:${input.month}`}, 0))`;
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
    const key = {
      warehouseId_userId_month: { warehouseId, userId, month: input.month },
    };
    const current = await tx.warehouseInvestorDividend.findUnique({
      where: key,
      include: { decision: true },
    });
    if (current?.decision?.confirmedAt)
      throw new WarehouseViewerError(
        "Хөрөнгө оруулагчийн баталгаажсан ногдол ашгийг өөрчлөх боломжгүй.",
        409,
      );
    if ((current?.version ?? 0) !== input.version)
      throw new WarehouseViewerError(
        "Ногдол ашгийг өөр оператор шинэчилсэн байна. Жагсаалтыг дахин ачаалаад шалгана уу.",
        409,
      );
    const amount = new Prisma.Decimal(input.amount);
    if (current?.amount.equals(amount)) return current;
    const result = current
      ? await tx.warehouseInvestorDividend.update({
          where: { id: current.id },
          data: {
            amount,
            version: { increment: 1 },
            updatedById: actor.userId,
          },
        })
      : await tx.warehouseInvestorDividend.create({
          data: {
            warehouseId,
            userId,
            month: input.month,
            amount,
            updatedById: actor.userId,
          },
        });
    await tx.auditLog.create({
      data: {
        userId: actor.userId,
        action: "WAREHOUSE_DIVIDEND_UPDATED",
        meta: {
          warehouseId,
          targetUserId: userId,
          month: input.month,
          previousAmount: current?.amount.toFixed(2) ?? null,
          amount: amount.toFixed(2),
          version: result.version,
          currency: "MNT",
        },
      },
    });
    return result;
  });
}
