import { randomUUID } from "node:crypto";
import { prisma, Prisma } from "@mgl/database";
import {
  currentWarehouseMonth,
  type WarehouseDividendVerification,
  type WarehouseDividendDecisionSummary,
} from "@mgl/types";
import type { WarehouseActor } from "./warehouse-access.service";
import { assertWarehouseReportAccess } from "./warehouse-viewer-access.service";
import { WarehouseViewerError } from "./warehouse-viewer.policy";
import { normalizePhoneNumber } from "../utils/phone-number";
import { parseDividendChoice } from "./warehouse-dividend-decision.policy";
import {
  createVerifyMnSession,
  getVerifyMnSessionStatus,
  type VerifyMnSessionResponse,
  type VerifyMnStatusResponse,
} from "./verify-mn.service";

type Actor = WarehouseActor & { userId: string };
export interface DividendVerificationProvider {
  createSession: (phone: string) => Promise<VerifyMnSessionResponse>;
  getStatus: (id: string) => Promise<VerifyMnStatusResponse>;
}
const verifyMn: DividendVerificationProvider = {
  createSession: (phone) =>
    createVerifyMnSession(phone, {
      allowDevelopmentFallback: false,
      requireCallback: false,
    }),
  getStatus: (id) =>
    getVerifyMnSessionStatus(id, { allowDevelopmentFallback: false }),
};
export function serializeDividendDecision(decision: {
  choice: "BANK_TRANSFER" | "REINVEST";
  confirmedAt: Date | null;
  bankName: string | null;
  bankAccount: string | null;
  bankAccountName: string | null;
}): WarehouseDividendDecisionSummary | null {
  return decision.confirmedAt
    ? {
        choice: decision.choice,
        confirmedAt: decision.confirmedAt.toISOString(),
        bankName: decision.bankName,
        bankAccount: decision.bankAccount,
        bankAccountName: decision.bankAccountName,
      }
    : null;
}
function confirmedResult(
  decision: Parameters<typeof serializeDividendDecision>[0],
) {
  const result = serializeDividendDecision(decision);
  if (!result)
    throw new WarehouseViewerError("Баталгаажуулалт дутуу байна.", 409);
  return { status: "CONFIRMED" as const, decision: result };
}
async function assertCurrentInvestor(
  tx: Prisma.TransactionClient,
  warehouseId: string,
  userId: string,
  phone?: string,
) {
  const viewer = await tx.warehouseViewer.findFirst({
    where: {
      warehouseId,
      userId,
      warehouse: { isActive: true, deletedAt: null, type: "CENTRAL" },
      user: { isActive: true, deletedAt: null },
    },
    select: {
      user: { select: { profile: { select: { phoneNumber: true } } } },
    },
  });
  const currentPhone = normalizePhoneNumber(viewer?.user.profile?.phoneNumber);
  if (!viewer || !currentPhone || !/^\d{8}$/.test(currentPhone))
    throw new WarehouseViewerError(
      "Бүртгэлтэй утас болон дэлгүүр харах эрхээ шалгана уу.",
      403,
    );
  if (phone && phone !== currentPhone)
    throw new WarehouseViewerError(
      "Утасны дугаар өөрчлөгдсөн байна. Баталгаажуулалтаа дахин эхлүүлнэ үү.",
      409,
    );
  return currentPhone;
}
const lockDividend = (
  tx: Prisma.TransactionClient,
  warehouseId: string,
  userId: string,
  month: string,
) =>
  tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`warehouse-dividend:${warehouseId}:${userId}:${month}`}, 0))`;

export function createDividendDecisionService(
  provider: DividendVerificationProvider = verifyMn,
) {
  async function start(
    actor: Actor,
    warehouseId: string,
    dividendId: string,
    body: unknown,
  ): Promise<WarehouseDividendVerification> {
    await assertWarehouseReportAccess(actor, warehouseId);
    const input = parseDividendChoice(body);
    const phone = await assertCurrentInvestor(
      prisma,
      warehouseId,
      actor.userId,
    );
    const dividend = await prisma.warehouseInvestorDividend.findFirst({
      where: {
        id: dividendId,
        warehouseId,
        userId: actor.userId,
        month: currentWarehouseMonth(),
      },
      include: { decision: true },
    });
    if (!dividend || !dividend.amount.greaterThan(0))
      throw new WarehouseViewerError(
        "Баталгаажуулах ногдол ашиг бүртгэгдээгүй байна.",
        404,
      );
    if (dividend.version !== input.version || dividend.decision?.confirmedAt)
      throw new WarehouseViewerError(
        "Дүн өөрчлөгдсөн эсвэл сонголт баталгаажсан байна. Тайлангаа шинэчилнэ үү.",
        409,
      );
    if (
      dividend.decision &&
      Date.now() - dividend.decision.updatedAt.getTime() < 30000
    )
      throw new WarehouseViewerError(
        "Шинэ баталгаажуулалт эхлүүлэхээс өмнө 30 секунд хүлээнэ үү.",
        429,
      );
    let session: VerifyMnSessionResponse;
    try {
      session = await provider.createSession(phone);
    } catch {
      throw new WarehouseViewerError(
        "Verify.mn баталгаажуулалт эхлүүлэх боломжгүй байна. Түр хүлээгээд дахин оролдоно уу.",
        503,
      );
    }
    if (
      normalizePhoneNumber(session.phone) !== phone ||
      !Number.isFinite(Date.parse(session.expiresAt)) ||
      Date.parse(session.expiresAt) <= Date.now()
    )
      throw new WarehouseViewerError(
        "Verify.mn баталгаажуулах мэдээлэл таарахгүй байна.",
        502,
      );
    const decision = await prisma.$transaction(async (tx) => {
      await lockDividend(tx, warehouseId, actor.userId, dividend.month);
      await assertCurrentInvestor(tx, warehouseId, actor.userId, phone);
      const current = await tx.warehouseInvestorDividend.findUniqueOrThrow({
        where: { id: dividendId },
        include: { decision: true },
      });
      if (
        current.month !== currentWarehouseMonth() ||
        current.version !== dividend.version ||
        current.decision?.confirmedAt ||
        current.decision?.providerSessionId !==
          dividend.decision?.providerSessionId
      )
        throw new WarehouseViewerError(
          "Ногдол ашгийн мэдээлэл өөрчлөгдлөө. Дахин эхлүүлнэ үү.",
          409,
        );
      const fields = {
        choice: input.choice,
        bankName: input.bankName,
        bankAccount: input.bankAccount,
        bankAccountName: input.bankAccountName,
        dividendVersion: input.version,
        amount: current.amount,
        phone,
        providerSessionId: session.sessionId,
        expiresAt: new Date(
          Math.min(Date.parse(session.expiresAt), Date.now() + 300000),
        ),
      };
      return tx.warehouseDividendDecision.upsert({
        where: { dividendId },
        create: { ...fields, dividendId },
        update: { ...fields, id: randomUUID() },
      });
    });
    return {
      id: decision.id,
      shortcode: session.shortcode,
      text: session.text,
      smsUri: session.smsUri,
      displayInstruction: session.displayInstruction,
      expiresAt: decision.expiresAt.toISOString(),
    };
  }
  async function confirm(
    actor: Actor,
    warehouseId: string,
    decisionId: string,
  ) {
    await assertWarehouseReportAccess(actor, warehouseId);
    const decision = await prisma.warehouseDividendDecision.findFirst({
      where: {
        id: decisionId,
        dividend: { warehouseId, userId: actor.userId },
      },
      include: { dividend: true },
    });
    if (!decision)
      throw new WarehouseViewerError("Баталгаажуулалт олдсонгүй.", 404);
    if (decision.confirmedAt) return confirmedResult(decision);
    if (decision.expiresAt.getTime() <= Date.now())
      throw new WarehouseViewerError(
        "Баталгаажуулах хугацаа дууссан байна. Дахин эхлүүлнэ үү.",
        410,
      );
    let status: VerifyMnStatusResponse;
    try {
      status = await provider.getStatus(decision.providerSessionId);
    } catch {
      throw new WarehouseViewerError(
        "Verify.mn төлөвийг шалгаж чадсангүй.",
        503,
      );
    }
    if (
      status.sessionId !== decision.providerSessionId ||
      (status.phone && normalizePhoneNumber(status.phone) !== decision.phone)
    )
      throw new WarehouseViewerError(
        "Баталгаажуулах мэдээлэл таарахгүй байна.",
        403,
      );
    if (status.sessionStatus === "PENDING")
      return { status: "PENDING" as const };
    if (
      status.sessionStatus !== "VERIFIED" ||
      !status.verifiedAt ||
      !Number.isFinite(Date.parse(status.verifiedAt)) ||
      Date.parse(status.verifiedAt) > decision.expiresAt.getTime()
    )
      throw new WarehouseViewerError(
        status.sessionStatus === "EXPIRED"
          ? "Баталгаажуулах хугацаа дууссан байна."
          : "SMS баталгаажуулалт хараахан ирээгүй байна.",
        status.sessionStatus === "EXPIRED" ? 410 : 409,
      );
    return prisma.$transaction(async (tx) => {
      await lockDividend(
        tx,
        warehouseId,
        actor.userId,
        decision.dividend.month,
      );
      const current = await tx.warehouseDividendDecision.findUnique({
        where: { id: decisionId },
        include: { dividend: true },
      });
      if (!current)
        throw new WarehouseViewerError(
          "Баталгаажуулалт шинэчлэгдсэн байна.",
          409,
        );
      if (current.confirmedAt) return confirmedResult(current);
      await assertCurrentInvestor(tx, warehouseId, actor.userId, current.phone);
      if (
        current.expiresAt.getTime() <= Date.now() ||
        current.dividend.month !== currentWarehouseMonth() ||
        current.dividendVersion !== current.dividend.version ||
        !current.amount.equals(current.dividend.amount)
      )
        throw new WarehouseViewerError(
          "Хугацаа эсвэл ногдол ашгийн дүн өөрчлөгдсөн байна. Дахин эхлүүлнэ үү.",
          409,
        );
      let principalBefore: string | null = null;
      let principalAfter: string | null = null;
      if (current.choice === "REINVEST") {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`warehouse-investment:${warehouseId}:${actor.userId}`}, 0))`;
        const key = {
          warehouseId_userId: { warehouseId, userId: actor.userId },
        };
        const principal = await tx.warehouseInvestment.findUnique({
          where: key,
        });
        const amount = (principal?.amount ?? new Prisma.Decimal(0)).plus(
          current.amount,
        );
        if (amount.greaterThan("999999999999.99"))
          throw new WarehouseViewerError(
            "Нийт хөрөнгө оруулалт зөвшөөрөгдсөн дээд дүнгээс хэтэрлээ.",
          );
        principalBefore = principal?.amount.toFixed(2) ?? "0.00";
        principalAfter = amount.toFixed(2);
        await tx.warehouseInvestment.upsert({
          where: key,
          create: {
            warehouseId,
            userId: actor.userId,
            amount,
            updatedById: actor.userId,
          },
          update: {
            amount,
            version: { increment: 1 },
            updatedById: actor.userId,
          },
        });
      }
      const saved = await tx.warehouseDividendDecision.update({
        where: { id: current.id },
        data: { confirmedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.userId,
          action: "WAREHOUSE_DIVIDEND_CONFIRMED",
          meta: {
            warehouseId,
            dividendId: current.dividendId,
            month: current.dividend.month,
            amount: current.amount.toFixed(2),
            choice: current.choice,
            decisionId: current.id,
            principalBefore,
            principalAfter,
          },
        },
      });
      return confirmedResult(saved);
    });
  }
  return { start, confirm };
}
export const dividendDecisionService = createDividendDecisionService();
