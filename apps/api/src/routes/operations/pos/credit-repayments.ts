import crypto from "node:crypto";
import type { Request, Response } from "express";
import {
  prisma,
  PaymentMethod,
  PosCreditStatus,
  CashDrawerEventType,
  type Prisma,
} from "@mgl/database";
import {
  requirePosUser,
  normalizePaymentMethod,
  toApiError,
  roundMoney,
  type ApiError,
} from "./_shared";
import { hasOrgMembership } from "../../../services/permission.service";
import { lockOrganizationInventory } from "../../../services/vendor-inventory-warehouse.service";
import {
  recordCashDrawerMovement,
  parseCashDrawerMovement,
} from "./cash-drawer-movement";
import { calculatePosCreditPayable } from "./credit-interest";
import { mapCreditSaleResponse } from "./credit-response";
import {
  allocateCreditRepayment,
  creditRepaymentCents,
  sameCreditRepaymentAmount,
} from "./credit-repayment-amount";
import {
  fiscalAmountError,
  fiscalIdentityConflict,
} from "./fiscal-amount-validation";

const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";
const event = "POS_CREDIT_REPAYMENT";
const hasRetailPaymentEvidence = (value: unknown) =>
  object(value) &&
  ["checkout", "saleIdentity", "deferredCheckout"].some(
    (key) => value[key] !== undefined && value[key] !== null,
  );

export function creditRepaymentHandler(bulk: boolean) {
  return async (req: Request, res: Response) => {
    try {
      const actor = await requirePosUser(req, res);
      if (!actor) return;
      const body: unknown = req.body;
      if (!object(body))
        throw toApiError(400, "Төлөлтийн мэдээлэл буруу байна");
      const ids =
        bulk && Array.isArray(body.creditSaleIds)
          ? [...new Set(body.creditSaleIds.map(text).filter(Boolean))]
          : [text(req.params.id)];
      if (
        !ids.length ||
        ids.some((id) => !id || id.length > 200) ||
        ids.length > 500 ||
        (bulk && ids.length < 2)
      )
        throw toApiError(400, "Зээлийн дугаар буруу байна");
      const scope = await prisma.posCreditSale.findMany({
        where: { id: { in: ids } },
        select: { organizationId: true },
      });
      if (scope.length !== ids.length)
        throw toApiError(404, "Зээлийн бүртгэл олдсонгүй");
      const organizationId = scope[0]!.organizationId;
      if (scope.some((row) => row.organizationId !== organizationId))
        throw toApiError(400, "Зээлүүд нэг байгууллагынх байх ёстой");
      if (
        actor.role !== "ADMIN" &&
        !(await hasOrgMembership(actor.id, organizationId))
      )
        throw toApiError(403, "Зээлийн төлөлт бүртгэх эрхгүй");
      const paymentMethod = normalizePaymentMethod(
        text(body.paymentMethod) || "CASH",
      );
      if (!paymentMethod || paymentMethod === PaymentMethod.CREDIT)
        throw toApiError(400, "Төлбөрийн хэлбэр буруу байна");
      const suppliedRequestId = text(body.requestId);
      if (suppliedRequestId.length > 200)
        throw toApiError(400, "Төлөлтийн дугаар буруу байна");
      const requestId = suppliedRequestId || crypto.randomUUID();
      const shiftId = text(body.shiftId);
      const invoiceId = text(body.qpayInvoiceId);
      const attemptId = text(
        body.cardAttemptId ?? body.attemptId ?? body.transactionId,
      );
      const request = JSON.stringify({
        ids: [...ids].sort(),
        amount: body.amount ?? null,
        paymentMethod,
        shiftId,
        invoiceId,
        attemptId,
      });
      const result = await prisma.$transaction(
        async (tx) => {
          await lockOrganizationInventory(tx, organizationId);
          const previous = await tx.auditLog.findFirst({
            where: {
              action: "POS_REGISTER_UPDATED",
              AND: [
                { meta: { path: ["event"], equals: event } },
                { meta: { path: ["organizationId"], equals: organizationId } },
                { meta: { path: ["requestId"], equals: requestId } },
              ],
            },
          });
          const metadata = previous?.meta;
          if (
            metadata &&
            typeof metadata === "object" &&
            !Array.isArray(metadata)
          ) {
            if (metadata.request !== request)
              throw toApiError(
                409,
                "Төлөлтийн дугаар өөр хүсэлтэд ашиглагдсан байна",
              );
            return object(metadata.response)
              ? {
                  ...metadata.response,
                  ...(metadata.ebarimt ? { ebarimt: metadata.ebarimt } : {}),
                }
              : metadata.response;
          }
          const credits = await tx.posCreditSale.findMany({
            where: { id: { in: ids }, organizationId },
            include: { sale: { select: { createdAt: true } } },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          });
          if (
            credits.length !== ids.length ||
            credits.some(
              (credit) =>
                credit.status !== PosCreditStatus.OPEN &&
                credit.status !== PosCreditStatus.OVERDUE,
            )
          )
            throw toApiError(
              409,
              "Зээлийн төлөв өөрчлөгдсөн. Жагсаалтаа шинэчилнэ үү.",
            );
          const now = new Date();
          const payables = credits.map((credit) =>
            calculatePosCreditPayable(
              { ...credit, createdAt: credit.sale.createdAt },
              now,
            ),
          );
          const due = roundMoney(
            payables.reduce((sum, payable) => sum + payable.remainingDue, 0),
          );
          const amountCents = creditRepaymentCents(body.amount ?? due);
          if (amountCents === null)
            throw toApiError(
              400,
              "Төлөх дүнг хамгийн ихдээ хоёр бутархай оронтой тоогоор оруулна уу",
            );
          const amount = amountCents / 100;
          let allocations: number[];
          try {
            allocations = allocateCreditRepayment(
              payables.map((payable) => payable.remainingDue),
              amount,
            );
          } catch (error: unknown) {
            throw toApiError(
              400,
              error instanceof Error ? error.message : "Төлөх дүн буруу байна",
            );
          }
          if (!suppliedRequestId && !sameCreditRepaymentAmount(amount, due))
            throw toApiError(
              400,
              "Хэсэгчилсэн төлөлтөд requestId шаардлагатай",
            );
          const note = text(body.note) || `Credit repayment ${requestId}`;
          if (paymentMethod === PaymentMethod.QPAY) {
            if (!invoiceId) throw toApiError(400, "QR invoiceId шаардлагатай");
            const invoice = await tx.qPayInvoice.findUnique({
              where: { id: invoiceId },
            });
            if (
              !invoice ||
              invoice.organizationId !== organizationId ||
              invoice.status !== "PAID" ||
              !sameCreditRepaymentAmount(Number(invoice.amount), amount)
            )
              throw toApiError(
                409,
                "QR төлбөрийн байгууллага, дүн эсвэл баталгаажилт зөрүүтэй байна",
              );
            if (hasRetailPaymentEvidence(invoice.webhookPayload))
              throw toApiError(
                409,
                "Борлуулалтын сагстай холбоотой QR төлбөрийг зээлд ашиглах боломжгүй",
              );
            const consumed = await tx.qPayInvoice.updateMany({
              where: {
                id: invoiceId,
                status: "PAID",
                consumedAt: null,
                saleReference: null,
              },
              data: { consumedAt: now, saleReference: `CREDIT-${requestId}` },
            });
            if (consumed.count !== 1)
              throw toApiError(409, "QR төлбөр аль хэдийн ашиглагдсан байна");
          } else if (paymentMethod === PaymentMethod.CARD) {
            if (!attemptId)
              throw toApiError(400, "Картын attemptId шаардлагатай");
            const attempt = await tx.cardPaymentAttempt.findUnique({
              where: { id: attemptId },
            });
            if (
              !attempt ||
              attempt.organizationId !== organizationId ||
              attempt.status !== "APPROVED" ||
              !sameCreditRepaymentAmount(Number(attempt.amount), amount)
            )
              throw toApiError(
                409,
                "Картын төлбөрийн байгууллага, дүн эсвэл баталгаажилт зөрүүтэй байна",
              );
            if (hasRetailPaymentEvidence(attempt.providerPayload))
              throw toApiError(
                409,
                "Борлуулалтын сагстай холбоотой картын төлбөрийг зээлд ашиглах боломжгүй",
              );
            const consumed = await tx.cardPaymentAttempt.updateMany({
              where: {
                id: attemptId,
                status: "APPROVED",
                consumedAt: null,
                saleReference: null,
              },
              data: { consumedAt: now, saleReference: `CREDIT-${requestId}` },
            });
            if (consumed.count !== 1)
              throw toApiError(
                409,
                "Картын төлбөр аль хэдийн ашиглагдсан байна",
              );
          } else if (paymentMethod === PaymentMethod.CASH) {
            if (!shiftId)
              throw toApiError(
                400,
                "Бэлэн төлөлтөд нээлттэй ээлж шаардлагатай",
              );
            await recordCashDrawerMovement(
              tx,
              actor,
              parseCashDrawerMovement({
                shiftId,
                type: CashDrawerEventType.PAID_IN,
                amount,
                note,
              }),
              organizationId,
            );
          }
          const updated = [];
          for (const [index, credit] of credits.entries()) {
            const allocation = allocations[index]!;
            if (!allocation) {
              updated.push(credit);
              continue;
            }
            const payable = payables[index]!;
            const settled = sameCreditRepaymentAmount(
              allocation,
              payable.remainingDue,
            );
            updated.push(
              await tx.posCreditSale.update({
                where: { id: credit.id },
                data: {
                  paidAmount: roundMoney(
                    Number(credit.paidAmount || 0) + allocation,
                  ),
                  status: settled ? PosCreditStatus.PAID : credit.status,
                  paidAt: settled ? now : null,
                  paymentMethod,
                  paymentNote: note,
                  totalInterest: payable.totalInterest,
                  totalDue: payable.totalDue,
                },
                include: { sale: { select: { createdAt: true } } },
              }),
            );
          }
          const repaymentId = crypto.randomUUID();
          const mapped = updated.map((credit) =>
            mapCreditSaleResponse({
              ...credit,
              createdAt: credit.sale.createdAt,
            }),
          );
          const allocationsResponse = credits.map((credit, index) => ({
            creditSaleId: credit.id,
            amount: allocations[index]!,
          }));
          const response = {
            allocations: allocationsResponse,
            ...(bulk ? { credits: mapped } : { credit: mapped[0] }),
            repaymentId,
            paidAmount: amount,
            remainingDue: roundMoney(due - amount),
          };
          await tx.auditLog.create({
            data: {
              id: repaymentId,
              userId: actor.id,
              action: "POS_REGISTER_UPDATED",
              meta: {
                event,
                organizationId,
                requestId,
                request,
                shiftId,
                paymentMethod,
                invoiceId,
                attemptId,
                paidAmount: amount,
                allocations: allocationsResponse,
                response: JSON.parse(
                  JSON.stringify(response),
                ) as Prisma.InputJsonObject,
              },
            },
          });
          return response;
        },
        { timeout: 30_000 },
      );
      return res.json(result);
    } catch (error: unknown) {
      const known = error as ApiError;
      if (known?.status && known.message)
        return res.status(known.status).json({ message: known.message });
      console.error("credit repayment failed", error);
      return res.status(503).json({
        message:
          "Зээлийн төлөлт бүртгэж чадсангүй. Дахин төлүүлэхгүйгээр төлөвийг шалгана уу.",
      });
    }
  };
}

export async function attachCreditPaymentEbarimt(req: Request, res: Response) {
  const actor = await requirePosUser(req, res);
  if (!actor) return;
  try {
    const id = text(req.params.id);
    const body: unknown = req.body;
    if (!object(body)) throw toApiError(400, "Баримтын мэдээлэл буруу байна");
    const entry = await prisma.auditLog.findUnique({ where: { id } });
    const meta = entry?.meta;
    if (
      !meta ||
      typeof meta !== "object" ||
      Array.isArray(meta) ||
      meta.event !== event ||
      typeof meta.organizationId !== "string"
    )
      return res.sendStatus(404);
    if (
      actor.role !== "ADMIN" &&
      !(await hasOrgMembership(actor.id, meta.organizationId))
    )
      return res.sendStatus(403);
    const amountError = fiscalAmountError(
      body.payload,
      Number(meta.paidAmount),
    );
    if (amountError) throw toApiError(400, amountError);
    const ebarimt = await prisma.$transaction(async (tx) => {
      await lockOrganizationInventory(tx, meta.organizationId as string);
      const current = await tx.auditLog.findUniqueOrThrow({ where: { id } });
      const metadata = current.meta as Prisma.JsonObject;
      const existing = object(metadata.ebarimt) ? metadata.ebarimt : {};
      if (
        fiscalIdentityConflict(body, {
          ebarimtBillId: text(existing.billId) || null,
          ebarimtReceiptId: text(existing.receiptId) || null,
        })
      )
        throw toApiError(409, "Өөр eBarimt аль хэдийн хадгалагдсан байна");
      if (existing.status === "SUCCESS") return existing;
      await tx.auditLog.update({
        where: { id },
        data: {
          meta: {
            ...metadata,
            ebarimt: JSON.parse(JSON.stringify(body)) as Prisma.InputJsonObject,
          },
        },
      });
      return body;
    });
    return res.json({ ebarimt });
  } catch (error: unknown) {
    const known = error as ApiError;
    return res.status(known?.status || 503).json({
      message: known?.status
        ? known.message
        : "Төлөлтийн баримтыг хадгалж чадсангүй",
    });
  }
}

export type CreditRepaymentHistoryItem = {
  id: string;
  createdAt: string;
  requestId: string | null;
  paidAmount: number;
  paymentMethod: string;
  shiftId: string | null;
  invoiceId: string | null;
  attemptId: string | null;
  allocations: Array<{ creditSaleId: string; amount: number }>;
  borrowerNames: string[];
  remainingDue: number | null;
  response: Prisma.JsonObject | null;
  ebarimt: Prisma.JsonValue | null;
};

const repaymentHistoryWhere = (
  organizationId: string,
): Prisma.AuditLogWhereInput => ({
  action: "POS_REGISTER_UPDATED",
  AND: [
    { meta: { path: ["event"], equals: event } },
    { meta: { path: ["organizationId"], equals: organizationId } },
  ],
});

function mapRepaymentHistory(entry: {
  id: string;
  createdAt: Date;
  meta: Prisma.JsonValue;
}): CreditRepaymentHistoryItem | null {
  const meta = entry.meta;
  if (
    !meta ||
    typeof meta !== "object" ||
    Array.isArray(meta) ||
    meta.event !== event
  )
    return null;
  const amountCents = creditRepaymentCents(meta.paidAmount);
  if (
    amountCents === null ||
    amountCents <= 0 ||
    typeof meta.paymentMethod !== "string"
  )
    return null;
  const response = object(meta.response)
    ? (meta.response as Prisma.JsonObject)
    : null;
  const credits = Array.isArray(response?.credits)
    ? response.credits
    : object(response?.credit)
      ? [response.credit]
      : [];
  const borrowerNames = [
    ...new Set(
      credits.flatMap((credit) =>
        object(credit) &&
        typeof credit.borrowerName === "string" &&
        credit.borrowerName.trim()
          ? [credit.borrowerName]
          : [],
      ),
    ),
  ];
  const remainingCents = creditRepaymentCents(response?.remainingDue);
  const allocations = Array.isArray(meta.allocations)
    ? meta.allocations.flatMap((allocation) => {
        if (!object(allocation) || typeof allocation.creditSaleId !== "string")
          return [];
        const cents = creditRepaymentCents(allocation.amount);
        return cents === null
          ? []
          : [{ creditSaleId: allocation.creditSaleId, amount: cents / 100 }];
      })
    : [];
  return {
    id: entry.id,
    createdAt: entry.createdAt.toISOString(),
    requestId: text(meta.requestId) || null,
    paidAmount: amountCents / 100,
    paymentMethod: meta.paymentMethod,
    shiftId: text(meta.shiftId) || null,
    invoiceId: text(meta.invoiceId) || null,
    attemptId: text(meta.attemptId) || null,
    allocations,
    borrowerNames,
    remainingDue: remainingCents === null ? null : remainingCents / 100,
    response,
    ebarimt: meta.ebarimt ?? null,
  };
}

/** History and reprints read the saved ledger; they never initiate a bank or fiscal operation. */
export async function listCreditRepayments(req: Request, res: Response) {
  const actor = await requirePosUser(req, res);
  if (!actor) return;
  try {
    const organizationId =
      text(req.query.organizationId) || actor.organizationId;
    if (!organizationId)
      throw toApiError(400, "Байгууллагын дугаар шаардлагатай");
    if (
      actor.role !== "ADMIN" &&
      !(await hasOrgMembership(actor.id, organizationId))
    )
      return res.sendStatus(403);
    const rawLimit =
      req.query.limit === undefined ? 50 : Number(req.query.limit);
    if (!Number.isSafeInteger(rawLimit) || rawLimit < 1 || rawLimit > 100)
      throw toApiError(400, "Хуудасны хэмжээ 1–100 байна");
    const cursor = text(req.query.cursor);
    if (cursor.length > 200)
      throw toApiError(400, "Хуудасны дугаар буруу байна");
    const where = repaymentHistoryWhere(organizationId);
    if (
      cursor &&
      !(await prisma.auditLog.findFirst({
        where: { ...where, id: cursor },
        select: { id: true },
      }))
    ) {
      throw toApiError(400, "Төлөлтийн хуудасны дугаар буруу байна");
    }
    const entries = await prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: rawLimit + 1,
      select: { id: true, createdAt: true, meta: true },
    });
    res.setHeader("Cache-Control", "no-store");
    return res.json({
      payments: entries.slice(0, rawLimit).flatMap((entry) => {
        const payment = mapRepaymentHistory(entry);
        return payment ? [payment] : [];
      }),
      nextCursor: entries.length > rawLimit ? entries[rawLimit - 1]!.id : null,
    });
  } catch (error: unknown) {
    const known = error as ApiError;
    return res.status(known?.status || 503).json({
      message: known?.status
        ? known.message
        : "Зээлийн төлөлтийн түүхийг татаж чадсангүй",
    });
  }
}

export async function getCreditRepayment(req: Request, res: Response) {
  const actor = await requirePosUser(req, res);
  if (!actor) return;
  try {
    const organizationId =
      text(req.query.organizationId) || actor.organizationId;
    const id = text(req.params.id);
    if (!organizationId || !id || id.length > 200)
      throw toApiError(400, "Байгууллага болон төлөлтийн дугаар шаардлагатай");
    if (
      actor.role !== "ADMIN" &&
      !(await hasOrgMembership(actor.id, organizationId))
    )
      return res.sendStatus(403);
    const entry = await prisma.auditLog.findFirst({
      where: { ...repaymentHistoryWhere(organizationId), id },
      select: { id: true, createdAt: true, meta: true },
    });
    const payment = entry ? mapRepaymentHistory(entry) : null;
    if (!payment) return res.sendStatus(404);
    res.setHeader("Cache-Control", "no-store");
    return res.json({ payment });
  } catch (error: unknown) {
    const known = error as ApiError;
    return res.status(known?.status || 503).json({
      message: known?.status
        ? known.message
        : "Зээлийн төлөлтийн баримтыг татаж чадсангүй",
    });
  }
}
