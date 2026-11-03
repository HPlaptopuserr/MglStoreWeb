import { prisma, Prisma } from "@mgl/database";
import type { WarehouseActor } from "./warehouse-access.service";
import {
  assertWarehouseReportAccess,
  assertWarehouseViewerManagement,
} from "./warehouse-viewer-access.service";
import { WarehouseViewerError } from "./warehouse-viewer.policy";
import { parseInvestmentTopUp } from "./warehouse-investment-topup.policy";
import { paymentAccountRecords } from "./warehouse-payment-account.service";
import {
  CONTRACT_PAYMENT_ACCOUNTS_SETTING_KEY,
  readMinuPaymentAccounts,
} from "./upgrade-minu.service";
import { createSystemQrInvoice, checkSystemQrPayment } from "./systemqr";

type Actor = WarehouseActor & { userId: string };
type TopUp = Prisma.WarehouseInvestmentTopUpGetPayload<{
  include: {
    user: { select: { email: true; profile: { select: { fullName: true } } } };
  };
}>;
const includeOwner = {
  user: { select: { email: true, profile: { select: { fullName: true } } } },
} as const;

export function serializeTopUp(row: TopUp) {
  return {
    id: row.id,
    amount: row.amount.toFixed(2),
    method: row.method,
    status: row.status,
    reference: `INV-${row.id}`,
    bankName: row.bankName,
    accountNumber: row.accountNumber,
    accountHolder: row.accountHolder,
    qrText: row.qrText,
    createdAt: row.createdAt.toISOString(),
    paidAt: row.paidAt?.toISOString() ?? null,
    investorName: row.user.profile?.fullName || row.user.email,
  };
}

async function assertInvestor(actor: Actor, warehouseId: string) {
  await assertWarehouseReportAccess(actor, warehouseId);
  if (
    !(await prisma.warehouseViewer.findUnique({
      where: { warehouseId_userId: { warehouseId, userId: actor.userId } },
    }))
  )
    throw new WarehouseViewerError(
      "Зөвхөн энэ дэлгүүрт бүртгэлтэй хөрөнгө оруулагч өөрийн дансыг цэнэглэнэ.",
      403,
    );
}

export async function listInvestmentTopUps(actor: Actor, warehouseId: string) {
  const { isOperator } = await assertWarehouseReportAccess(actor, warehouseId);
  const rows = await prisma.warehouseInvestmentTopUp.findMany({
    where: {
      warehouseId,
      ...(isOperator
        ? { status: "PENDING", method: "BANK_TRANSFER" }
        : { userId: actor.userId }),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: includeOwner,
  });
  return rows.map(serializeTopUp);
}

export async function createInvestmentTopUp(
  actor: Actor,
  warehouseId: string,
  body: unknown,
  createInvoice = createSystemQrInvoice,
) {
  await assertInvestor(actor, warehouseId);
  const input = parseInvestmentTopUp(body);
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`investment-topup-create:${warehouseId}:${actor.userId}`}, 0))`;
      const existing = await tx.warehouseInvestmentTopUp.findUnique({
        where: { requestId: input.requestId },
        include: includeOwner,
      });
      if (existing) {
        if (
          existing.userId !== actor.userId ||
          existing.warehouseId !== warehouseId ||
          existing.method !== input.method ||
          !existing.amount.equals(input.amount)
        )
          throw new WarehouseViewerError(
            "Энэ хүсэлт өөр цэнэглэлтэд ашиглагдсан байна.",
            409,
          );
        return serializeTopUp(existing);
      }
      // Keep a single unfinished payment so a network retry cannot create duplicate deposits.
      const pending = await tx.warehouseInvestmentTopUp.findFirst({
        where: { warehouseId, userId: actor.userId, status: "PENDING" },
        include: includeOwner,
      });
      if (pending)
        throw new WarehouseViewerError(
          "Хүлээгдэж буй цэнэглэлт байна. Эхлээд түүний төлбөрийг шалгана уу.",
          409,
        );
      const warehouse = await tx.warehouse.findUnique({
        where: { id: warehouseId },
        select: { paymentAccountId: true },
      });
      const setting = await tx.siteSetting.findUnique({
        where: { key: CONTRACT_PAYMENT_ACCOUNTS_SETTING_KEY },
      });
      const account = paymentAccountRecords(setting?.value).find(
        (item) => item.id === warehouse?.paymentAccountId,
      );
      const auth = readMinuPaymentAccounts(setting?.value).find(
        (item) => item.id === warehouse?.paymentAccountId,
      );
      if (
        !account ||
        !auth ||
        (input.method === "QR" && (!auth.username || !auth.password))
      )
        throw new WarehouseViewerError(
          "Дэлгүүрийн төлбөр хүлээн авах данс холбогдоогүй байна. Оператортой холбогдоно уу.",
          503,
        );
      const text = (key: string) =>
        typeof account[key] === "string" ? account[key].trim() : "";
      if (!text("accountNumber"))
        throw new WarehouseViewerError(
          "Хүлээн авах дансны дугаар тохируулаагүй байна.",
          503,
        );
      let row = await tx.warehouseInvestmentTopUp.create({
        data: {
          warehouseId,
          userId: actor.userId,
          ...input,
          accountId: auth.id,
          merchantCode: auth.merchantCode,
          bankName: text("bankName") || text("bankCode"),
          accountNumber: text("accountNumber"),
          accountHolder: text("corporateName") || text("merchantName"),
        },
        include: includeOwner,
      });
      if (input.method === "QR") {
        const invoice = await createInvoice(
          {
            merchantCode: auth.merchantCode,
            amount: Number(input.amount),
            referenceNumber: `INV-${row.id}`,
          },
          auth.username,
          auth.password,
        );
        row = await tx.warehouseInvestmentTopUp.update({
          where: { id: row.id },
          data: {
            invoiceId: String(invoice.invoiceId),
            qrText: String(invoice.qrText),
          },
          include: includeOwner,
        });
      }
      return serializeTopUp(row);
    },
    { timeout: 45000 },
  );
}

export async function settleInvestmentTopUp(
  actor: Actor,
  warehouseId: string,
  topUpId: string,
  confirmBank: boolean,
  checkPayment = checkSystemQrPayment,
) {
  if (confirmBank) await assertWarehouseViewerManagement(actor, warehouseId);
  else await assertInvestor(actor, warehouseId);
  const row = await prisma.warehouseInvestmentTopUp.findFirst({
    where: {
      id: topUpId,
      warehouseId,
      ...(!confirmBank ? { userId: actor.userId } : {}),
    },
    include: includeOwner,
  });
  if (!row) throw new WarehouseViewerError("Цэнэглэлт олдсонгүй.", 404);
  if (row.status === "PAID") return serializeTopUp(row);
  if (confirmBank && row.method !== "BANK_TRANSFER")
    throw new WarehouseViewerError(
      "QR төлбөрийг банкны гүйлгээ мэт батлах боломжгүй.",
    );
  if (!confirmBank && row.method === "BANK_TRANSFER")
    return serializeTopUp(row);
  if (!confirmBank) {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: CONTRACT_PAYMENT_ACCOUNTS_SETTING_KEY },
    });
    const auth = readMinuPaymentAccounts(setting?.value).find(
      (item) =>
        item.id === row.accountId && item.merchantCode === row.merchantCode,
    );
    if (!auth || !row.invoiceId)
      throw new WarehouseViewerError(
        "Анхны QR дансны тохиргоо олдсонгүй. Оператортой холбогдоно уу.",
        503,
      );
    const result = await checkPayment(
      { merchantCode: row.merchantCode, invoiceNumber: row.invoiceId },
      auth.username,
      auth.password,
    );
    if (result.paid !== true) return serializeTopUp(row);
  }
  return prisma.$transaction(async (tx) => {
    // Share the principal lock with operator edits and dividend reinvestment.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`warehouse-investment:${warehouseId}:${row.userId}`}, 0))`;
    const claimed = await tx.warehouseInvestmentTopUp.updateMany({
      where: { id: row.id, status: "PENDING" },
      data: {
        status: "PAID",
        paidAt: new Date(),
        confirmedById: confirmBank ? actor.userId : null,
      },
    });
    if (claimed.count) {
      const key = { warehouseId_userId: { warehouseId, userId: row.userId } };
      const current = await tx.warehouseInvestment.findUnique({ where: key });
      const amount = (current?.amount ?? new Prisma.Decimal(0)).plus(
        row.amount,
      );
      if (amount.greaterThan("999999999999.99"))
        throw new WarehouseViewerError(
          "Нийт хөрөнгө оруулалтын дээд хязгаар хэтэрсэн. Оператортой холбогдоно уу.",
        );
      await tx.warehouseInvestment.upsert({
        where: key,
        create: {
          warehouseId,
          userId: row.userId,
          amount,
          updatedById: actor.userId,
        },
        update: {
          amount,
          version: { increment: 1 },
          updatedById: actor.userId,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.userId,
          action: "WAREHOUSE_INVESTMENT_UPDATED",
          meta: {
            mode: "TOP_UP",
            source: "INVESTOR_PAYMENT",
            warehouseId,
            targetUserId: row.userId,
            topUpId: row.id,
            method: row.method,
            amount: row.amount.toFixed(2),
          },
        },
      });
    }
    const updated = await tx.warehouseInvestmentTopUp.findUniqueOrThrow({
      where: { id: row.id },
      include: includeOwner,
    });
    return serializeTopUp(updated);
  });
}
