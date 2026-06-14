import { Router, type Router as ExpressRouter } from "express";
import { prisma, AuditAction, InventoryReason, MPointLedgerType, PaymentMethod, PosPaymentStatus, PosQPayStatus, PosActivationStatus, ShiftStatus } from "@mgl/database";
import type { Prisma } from "@mgl/database";
import { adjustStock, resolveOrgWarehouse } from "../../../services/inventory.service";
import { hasOrgMembership } from "../../../services/permission.service";
import { checkQPayPayment, createQPayInvoice } from "../../../services/qpay";
import { buildQPayMerchantContextFromPosRegister } from "../../../services/qpay.merchant-context";
import { getVendorMerchantConfig } from "../../../services/vendor-merchant.service";
import {
  requirePosUser, requireAdminUser, normalizePaymentMethod, normalizeRegisterName,
  roundMoney, moneyMatches, signPayload, timingSafeEqualHex, getHeaderValue,
  parseBridgeResultStatus, parseQPaySuccess, parseOptionalDate,
  makePushEcrReferral, pushEcrHeaders, pushEcrBaseUrl,
  allowPosSimulation, isProdLikeEnv, bridgeSharedSecret,
  pushEcrDefaultTerminalId, MONEY_EPSILON,
  type AuthUser, type ApiError, type SaleLineInput, type SalePaymentLineInput,
  type CreateSaleBody, type PushEcrPurchaseResponse, toApiError, parseAuthClaims, runtimeEnv,
} from "./_shared";

const router: ExpressRouter = Router();

const POS_MPOINT_BASE_RATE = 0.02;
const POS_MPOINT_MEMBER_RATE = Number(process.env.POS_MPOINT_MEMBER_RATE || 0.03);

const normalizeLoyaltyPhone = (value: unknown) => String(value || "").replace(/\D/g, "");

const isMembershipActive = (user: { isPrime: boolean; membershipExpiresAt?: Date | null }) =>
  Boolean(user.isPrime && (!user.membershipExpiresAt || user.membershipExpiresAt.getTime() > Date.now()));

const getPosMPointRate = (user: { isPrime: boolean; membershipExpiresAt?: Date | null } | null) =>
  user && isMembershipActive(user) ? Math.max(POS_MPOINT_BASE_RATE, POS_MPOINT_MEMBER_RATE) : POS_MPOINT_BASE_RATE;

const resolveLoyaltyUser = async (
  tx: Prisma.TransactionClient,
  phone: string,
) =>
  tx.user.findFirst({
    where: {
      isActive: true,
      deletedAt: null,
      OR: [
        { membershipDiscountPhone: phone },
        { profile: { phoneNumber: phone } },
      ],
    },
    select: {
      id: true,
      isPrime: true,
      membershipExpiresAt: true,
      profile: { select: { fullName: true, phoneNumber: true } },
    },
  });

const getPointBalance = async (
  tx: Pick<Prisma.TransactionClient, "mPointLedger">,
  userId: string,
) => {
  const balance = await tx.mPointLedger.aggregate({
    where: { userId },
    _sum: { amount: true },
  });
  return Number(balance._sum.amount || 0);
};

type PosSaleEbarimtFields = {
  ebarimtStatus: string | null;
  ebarimtBillId: string | null;
  ebarimtReceiptId: string | null;
  ebarimtQrData: string | null;
  ebarimtLottery: string | null;
  ebarimtDate: Date | null;
  ebarimtError: string | null;
  ebarimtSyncedAt: Date | null;
};

const mapEbarimtReceipt = (sale: PosSaleEbarimtFields) =>
  sale.ebarimtStatus ||
  sale.ebarimtBillId ||
  sale.ebarimtReceiptId ||
  sale.ebarimtQrData ||
  sale.ebarimtLottery ||
  sale.ebarimtError
    ? {
        status: sale.ebarimtStatus,
        billId: sale.ebarimtBillId,
        receiptId: sale.ebarimtReceiptId,
        qrData: sale.ebarimtQrData,
        lottery: sale.ebarimtLottery,
        date: sale.ebarimtDate?.toISOString() ?? null,
        error: sale.ebarimtError,
        syncedAt: sale.ebarimtSyncedAt?.toISOString() ?? null,
      }
    : null;

const parseEbarimtDate = (value: unknown): Date | null => {
  if (!value) return null;
  const normalized = String(value).trim().replace(" ", "T");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

router.get("/pos/loyalty/lookup", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const phone = normalizeLoyaltyPhone(req.query.phone);
    if (phone.length < 6) {
      return res.status(400).json({ message: "Утасны дугаар буруу байна" });
    }

    const user = await prisma.user.findFirst({
      where: {
        isActive: true,
        deletedAt: null,
        OR: [
          { membershipDiscountPhone: phone },
          { profile: { phoneNumber: phone } },
        ],
      },
      select: {
        id: true,
        isPrime: true,
        membershipExpiresAt: true,
        profile: { select: { fullName: true, phoneNumber: true } },
      },
    });
    if (!user) {
      return res.json({
        found: false,
        phone,
        balance: 0,
        earnRate: POS_MPOINT_BASE_RATE,
        membershipBadge: "NONE",
      });
    }

    return res.json({
      found: true,
      phone,
      customerName: user.profile?.fullName || null,
      balance: await getPointBalance(prisma, user.id),
      earnRate: getPosMPointRate(user),
      membershipBadge: isMembershipActive(user) ? "MEMBER" : "STANDARD",
    });
  } catch (error) {
    console.error("GET /pos/loyalty/lookup error", error);
    return res.status(500).json({ message: "M Point мэдээлэл авахад алдаа гарлаа" });
  }
});

router.post("/pos/sales", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const body = req.body as CreateSaleBody;
    const lines = Array.isArray(body.lines) ? body.lines : [];
    const registerId = String(body.registerId || "").trim() || null;
    const organizationId = String(body.organizationId || "").trim() || null;
    const clientSaleId = String(body.clientSaleId || "").trim();

    let idempotencyOrganizationId: string | null = null;
    if (registerId) {
      const registerForScope = await prisma.posRegister.findUnique({
        where: { id: registerId },
        select: { id: true, organizationId: true },
      });
      if (!registerForScope) {
        return res.status(404).json({ message: "POS register олдсонгүй" });
      }
      idempotencyOrganizationId = registerForScope.organizationId;
    } else {
      idempotencyOrganizationId = actor.role === "ADMIN" ? organizationId : actor.organizationId;
    }

    if (!idempotencyOrganizationId) {
      return res.status(400).json({ message: "idempotency organization тодорхойгүй байна" });
    }

    if (!clientSaleId) {
      return res.status(400).json({ message: "clientSaleId шаардлагатай" });
    }

    const existingSale = await prisma.posSaleIdempotency.findFirst({
      where: {
        organizationId: idempotencyOrganizationId,
        clientSaleId,
      },
      select: { response: true },
    });
    if (existingSale?.response) {
      const existingResponse = existingSale.response as Record<string, unknown>;
      if (existingResponse.pending === true) {
        return res.status(409).json({ message: "Sale request одоо боловсруулагдаж байна" });
      }
      return res.status(200).json(existingSale.response as object);
    }

    if (!body.branchId) {
      return res.status(400).json({ message: "branchId шаардлагатай" });
    }

    if (lines.length === 0) {
      return res.status(400).json({ message: "Зарах барааны мөрүүд хоосон байна" });
    }

    const normalizedPayments = Array.isArray(body.paymentBreakdown)
      ? body.paymentBreakdown.map((item) => ({
          method: normalizePaymentMethod(item.method),
          amount: Number(item.amount || 0),
          attemptId: item.attemptId,
          transactionId: item.transactionId,
          invoiceId: item.invoiceId,
        }))
      : [];

    for (const item of normalizedPayments) {
      if (
        !item.method ||
        ![PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.QPAY].some(
          (allowedMethod) => allowedMethod === item.method,
        )
      ) {
        return res.status(400).json({ message: "paymentBreakdown.method буруу байна" });
      }
      if (!Number.isFinite(item.amount) || item.amount <= 0) {
        return res.status(400).json({ message: "paymentBreakdown.amount 0-оос их тоо байх ёстой" });
      }
    }

    const qtyByProduct = new Map<string, number>();
    for (const line of lines) {
      if (!line.productId || !Number.isFinite(line.qty) || line.qty <= 0) {
        return res.status(400).json({ message: "Мөрийн өгөгдөл буруу байна" });
      }
      qtyByProduct.set(line.productId, (qtyByProduct.get(line.productId) || 0) + line.qty);
    }

    const productIds = Array.from(qtyByProduct.keys());
    const receiptNo = `POS-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString().slice(-6)}`;

    const preLineTotals = lines.map((line) => {
      const qty = Number(line.qty || 0);
      const unitPrice = Number(line.unitPrice || 0);
      const discount = Number(line.discountAmount || 0) * qty;
      const taxable = Math.max(0, unitPrice * qty - discount);
      const taxAmount = taxable * (Number(line.taxRate || 0) / 100);
      return { subTotal: unitPrice * qty, taxAmount, discountTotal: discount };
    });
    const preSubTotal = preLineTotals.reduce((sum, line) => sum + line.subTotal, 0);
    const preTaxTotal = preLineTotals.reduce((sum, line) => sum + line.taxAmount, 0);
    const preDiscountTotal = preLineTotals.reduce((sum, line) => sum + line.discountTotal, 0);
    const expectedGrandTotal = roundMoney(preSubTotal + preTaxTotal - preDiscountTotal);
    const paymentTotal = roundMoney(normalizedPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0));
    const loyaltyMode = String(body.loyalty?.mode || "NONE").toUpperCase();
    const loyaltyPhone = normalizeLoyaltyPhone(body.loyalty?.phone);
    const requestedRedeemPoints =
      loyaltyMode === "REDEEM"
        ? Math.max(0, Math.floor(Number(body.loyalty?.redeemPoints || 0)))
        : 0;
    const expectedPayableTotal = roundMoney(Math.max(0, expectedGrandTotal - requestedRedeemPoints));

    if (!["NONE", "EARN", "REDEEM"].includes(loyaltyMode)) {
      return res.status(400).json({ message: "M Point сонголт буруу байна" });
    }

    if (loyaltyMode !== "NONE" && loyaltyPhone.length < 6) {
      return res.status(400).json({ message: "M Point-д хэрэглэгчийн утас шаардлагатай" });
    }

    if (loyaltyMode === "REDEEM" && requestedRedeemPoints <= 0) {
      return res.status(400).json({ message: "Хасуулах M Point 0-оос их байх ёстой" });
    }

    if (!moneyMatches(paymentTotal, expectedPayableTotal)) {
      return res.status(400).json({
        message: `Payment total (${paymentTotal}) нь төлөх дүн (${expectedPayableTotal})-тай таарахгүй байна`,
      });
    }

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let register:
        | {
            id: string;
            branchId: string;
            organizationId: string;
            activationStatus: PosActivationStatus;
            isActive: boolean;
          }
        | null = null;

      if (registerId) {
        register = await tx.posRegister.findUnique({
          where: { id: registerId },
          select: {
            id: true,
            branchId: true,
            organizationId: true,
            activationStatus: true,
            isActive: true,
          },
        });
        if (!register) throw toApiError(404, "POS register олдсонгүй");
        if (!register.isActive || register.activationStatus !== PosActivationStatus.APPROVED) {
          throw toApiError(403, "POS register идэвхгүй эсвэл батлагдаагүй байна");
        }
        if (register.branchId !== body.branchId) {
          throw toApiError(400, "Sale branchId нь register branch-тай зөрүүтэй байна");
        }
        if (organizationId && register.organizationId !== organizationId) {
          throw toApiError(400, "Sale organizationId нь register organization-тай зөрүүтэй байна");
        }
      }

      const effectiveOrganizationId = register?.organizationId || organizationId || actor.organizationId || null;

      if (!effectiveOrganizationId) {
        throw toApiError(400, "Sale organizationId тодорхойгүй байна");
      }

      if (actor.role !== "ADMIN") {
        const saleMembership = await tx.organizationMember.findFirst({
          where: { userId: actor.id, organizationId: effectiveOrganizationId, isActive: true },
          select: { id: true },
        });
        if (!saleMembership) {
          throw toApiError(403, "Өөр байгууллагын sale хийх боломжгүй");
        }
      }

      await tx.posSaleIdempotency.create({
        data: {
          clientSaleId,
          receiptNo,
          organizationId: effectiveOrganizationId,
          registerId,
          response: { pending: true },
        },
      });

      const products = await tx.product.findMany({
        where: {
          id: { in: productIds },
          deletedAt: null,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          stock: true,
          organizationId: true,
        },
      });

      if (products.length !== productIds.length) {
        throw toApiError(404, "Зарим бараа олдсонгүй");
      }

      if (register?.organizationId) {
        for (const product of products) {
          if (product.organizationId !== register.organizationId) {
            throw toApiError(400, `"${product.name}" бараа энэ POS register-ийн байгууллагад хамаарахгүй байна`);
          }
        }
      }

      const cardLines = normalizedPayments.filter((item) => item.method === PaymentMethod.CARD);
      const qpayLines = normalizedPayments.filter((item) => item.method === PaymentMethod.QPAY);

      const cardAttemptMap = new Map<string, { traceno: string | null; terminalId: string }>();
      for (const cardLine of cardLines) {
        const attemptId = String(cardLine.attemptId || cardLine.transactionId || "").trim();
        if (!attemptId) {
          throw toApiError(400, "CARD payment line дээр attemptId шаардлагатай");
        }

        const attempt = await tx.cardPaymentAttempt.findUnique({ where: { id: attemptId } });
        if (!attempt) throw toApiError(404, `Card attempt олдсонгүй: ${attemptId}`);
        cardAttemptMap.set(attemptId, { traceno: attempt.traceno, terminalId: attempt.terminalId });
        if (attempt.status !== PosPaymentStatus.APPROVED) {
          throw toApiError(409, `Card attempt ${attemptId} approved биш байна`);
        }
        if (attempt.saleReference || attempt.consumedAt) {
          throw toApiError(409, `Card attempt ${attemptId} аль хэдийн ашиглагдсан байна`);
        }
        if (!moneyMatches(Number(attempt.amount), cardLine.amount)) {
          throw toApiError(400, `Card attempt ${attemptId} amount зөрүүтэй байна`);
        }
        if (registerId && attempt.registerId && attempt.registerId !== registerId) {
          throw toApiError(400, `Card attempt ${attemptId} register зөрүүтэй байна`);
        }
        if (!attempt.organizationId || attempt.organizationId !== effectiveOrganizationId) {
          throw toApiError(400, `Card attempt ${attemptId} organization зөрүүтэй байна`);
        }
      }

      for (const qpayLine of qpayLines) {
        const invoiceId = String(qpayLine.invoiceId || "").trim();
        if (!invoiceId) {
          throw toApiError(400, "QPAY payment line дээр invoiceId шаардлагатай");
        }

        const invoice = await tx.qPayInvoice.findUnique({ where: { id: invoiceId } });
        if (!invoice) throw toApiError(404, `QPay invoice олдсонгүй: ${invoiceId}`);
        if (invoice.status !== PosQPayStatus.PAID) {
          throw toApiError(409, `QPay invoice ${invoiceId} paid биш байна`);
        }
        if (invoice.saleReference || invoice.consumedAt) {
          throw toApiError(409, `QPay invoice ${invoiceId} аль хэдийн ашиглагдсан байна`);
        }
        if (!moneyMatches(Number(invoice.amount), qpayLine.amount)) {
          throw toApiError(400, `QPay invoice ${invoiceId} amount зөрүүтэй байна`);
        }
        if (registerId && invoice.registerId && invoice.registerId !== registerId) {
          throw toApiError(400, `QPay invoice ${invoiceId} register зөрүүтэй байна`);
        }
        if (!invoice.organizationId || invoice.organizationId !== effectiveOrganizationId) {
          throw toApiError(400, `QPay invoice ${invoiceId} organization зөрүүтэй байна`);
        }
      }

      for (const product of products) {
        const requestedQty = qtyByProduct.get(product.id) || 0;
        if (product.stock < requestedQty) {
          throw toApiError(
            409,
            `"${product.name}" барааны нөөц хүрэлцэхгүй (үлдэгдэл: ${product.stock})`,
          );
        }
      }

      for (const [productId, qty] of qtyByProduct) {
        const warehouseId = await resolveOrgWarehouse(tx, effectiveOrganizationId, productId);

        await adjustStock(tx, {
          productId,
          warehouseId: warehouseId ?? undefined,
          change: -qty,
          reason: InventoryReason.ORDER,
          note: body.note || "POS sale",
          createdById: actor?.id || null,
          referenceId: receiptNo,
          referenceType: "POS_SALE",
        });
      }

      for (const cardLine of cardLines) {
        const attemptId = String(cardLine.attemptId || cardLine.transactionId || "").trim();
        await tx.cardPaymentAttempt.update({
          where: { id: attemptId },
          data: {
            saleReference: receiptNo,
            consumedAt: new Date(),
          },
        });
      }

      for (const qpayLine of qpayLines) {
        const invoiceId = String(qpayLine.invoiceId || "").trim();
        await tx.qPayInvoice.update({
          where: { id: invoiceId },
          data: {
            saleReference: receiptNo,
            consumedAt: new Date(),
          },
        });
      }

      const lineDetails = lines.map((line) => {
        const product = products.find((item: (typeof products)[number]) => item.id === line.productId);
        const discount = Number(line.discountAmount || 0);
        const unitPrice = Number(line.unitPrice || 0);
        const qty = Number(line.qty || 0);
        const taxRate = Number(line.taxRate || 0);
        const subTotal = unitPrice * qty;
        const discountTotal = discount * qty;
        const taxable = Math.max(0, subTotal - discountTotal);
        const taxAmount = taxable * (taxRate / 100);
        const lineTotal = taxable + taxAmount;

        return {
          productId: line.productId,
          productName: product?.name || line.productId,
          productSku: null as string | null,
          qty,
          unitPrice,
          taxAmount,
          discount: discountTotal,
          lineTotal,
        };
      });

      const subTotal = lineDetails.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);
      const taxTotal = lineDetails.reduce((sum, line) => sum + line.taxAmount, 0);
      const discountTotal = lines.reduce(
        (sum, line) => sum + Number(line.discountAmount || 0) * Number(line.qty || 0),
        0,
      );
      const grandTotal = subTotal + taxTotal - discountTotal;

      const paymentMethodSummary = (() => {
        const methods = Array.from(new Set(normalizedPayments.map((item) => item.method)));
        return methods.length === 1 ? methods[0] : "MIXED";
      })();

      // Resolve shiftId: use provided if valid, otherwise find/create for this cashier
      let resolvedShiftId: string = body.shiftId || "";

      // Check if provided shiftId actually exists
      if (resolvedShiftId) {
        const shiftExists = await tx.posShift.findUnique({
          where: { id: resolvedShiftId },
          select: { id: true, status: true },
        });
        if (!shiftExists) {
          resolvedShiftId = ""; // invalid, will auto-resolve below
        }
      }

      // Auto-find or auto-create shift if not resolved yet
      if (!resolvedShiftId) {
        const branchId = body.branchId!;
        const orgId = effectiveOrganizationId;

        // Find existing open shift for this cashier
        const existingShift = await tx.posShift.findFirst({
          where: {
            cashierId: actor.id,
            organizationId: orgId,
            status: "OPEN",
          },
          orderBy: { openedAt: "desc" },
          select: { id: true },
        });

        if (existingShift) {
          resolvedShiftId = existingShift.id;
        } else {
          // Auto-create a shift for this cashier
          const autoShift = await tx.posShift.create({
            data: {
              organizationId: orgId,
              branchId,
              cashierId: actor.id,
              openingCash: 0,
              status: "OPEN",
            },
            select: { id: true },
          });
          resolvedShiftId = autoShift.id;
        }
      }

      // Create structured PosSale + PosSaleLine records
      const posSale = await tx.posSale.create({
        data: {
          receiptNo,
          organizationId: effectiveOrganizationId,
          branchId: body.branchId!,
          registerId: registerId || undefined,
          shiftId: resolvedShiftId,
          cashierId: actor.id,
          paymentMethod: paymentMethodSummary || "CASH",
          subtotal: subTotal,
          taxTotal,
          discountTotal,
          grandTotal,
          note: body.note || null,
          lines: {
            create: lineDetails.map((ld) => ({
              productId: ld.productId,
              productName: ld.productName,
              productSku: ld.productSku,
              qty: ld.qty,
              unitPrice: ld.unitPrice,
              taxAmount: ld.taxAmount,
              discount: ld.discount,
              lineTotal: ld.lineTotal,
            })),
          },
        },
        select: { id: true },
      });

      const fullSale = await tx.posSale.findUniqueOrThrow({
        where: { id: posSale.id },
        select: {
          id: true,
          receiptNo: true,
          paymentMethod: true,
          createdAt: true,
          subtotal: true,
          taxTotal: true,
          discountTotal: true,
          grandTotal: true,
          lines: {
            select: {
              productId: true,
              productName: true,
              qty: true,
              unitPrice: true,
              taxAmount: true,
              lineTotal: true,
            },
          },
          cashier: { select: { email: true } },
          branch: { select: { name: true } },
        },
      });

      let loyaltyResponse: null | {
        mode: string;
        phone: string;
        earnedPoints: number;
        redeemedPoints: number;
        balanceAfter: number | null;
        earnRate: number;
        membershipBadge: string;
      } = null;

      if (loyaltyMode !== "NONE") {
        const loyaltyUser = await resolveLoyaltyUser(tx, loyaltyPhone);
        if (!loyaltyUser) {
          throw toApiError(404, "M Point хэрэглэгч олдсонгүй");
        }

        const currentBalance = await getPointBalance(tx, loyaltyUser.id);
        const effectiveRate = getPosMPointRate(loyaltyUser);
        const membershipBadge = isMembershipActive(loyaltyUser) ? "MEMBER" : "STANDARD";
        const earnedPoints = Math.max(0, Math.floor(Number(fullSale.grandTotal) * effectiveRate));
        const redeemedPoints = loyaltyMode === "REDEEM" ? requestedRedeemPoints : 0;

        if (redeemedPoints > currentBalance) {
          throw toApiError(409, `M Point үлдэгдэл хүрэлцэхгүй байна. Боломжит: ${currentBalance}`);
        }
        if (redeemedPoints > Number(fullSale.grandTotal)) {
          throw toApiError(400, "Хасуулах оноо нийт дүнгээс их байж болохгүй");
        }

        let ledgerId: string | null = null;
        let balanceAfter: number | null = null;

        if (loyaltyMode === "REDEEM" && redeemedPoints > 0) {
          balanceAfter = currentBalance - redeemedPoints;
          const spendLedger = await tx.mPointLedger.create({
            data: {
              userId: loyaltyUser.id,
              type: MPointLedgerType.SPEND,
              amount: -redeemedPoints,
              balanceAfter,
              sourceType: "POS_SALE",
              sourceId: fullSale.id,
              invoiceId: `pos:${fullSale.id}:redeem`,
              description: `POS худалдан авалтад M Point хасуулсан - ${fullSale.receiptNo}`,
            },
            select: { id: true },
          });
          ledgerId = spendLedger.id;
        }

        if (earnedPoints > 0) {
          balanceAfter = (balanceAfter ?? currentBalance) + earnedPoints;
          const earnLedger = await tx.mPointLedger.create({
            data: {
              userId: loyaltyUser.id,
              type: MPointLedgerType.EARN,
              amount: earnedPoints,
              balanceAfter,
              sourceType: "POS_SALE",
              sourceId: fullSale.id,
              invoiceId: `pos:${fullSale.id}:earn`,
              description: `POS худалдан авалтын ${Math.round(effectiveRate * 100)}% буцаан олголт - ${fullSale.receiptNo}`,
            },
            select: { id: true },
          });
          if (!ledgerId) ledgerId = earnLedger.id;
        }

        await tx.posLoyaltyTransaction.create({
          data: {
            saleId: fullSale.id,
            organizationId: effectiveOrganizationId,
            branchId: body.branchId!,
            userId: loyaltyUser.id,
            customerPhone: loyaltyPhone,
            action: loyaltyMode === "EARN" ? MPointLedgerType.EARN : MPointLedgerType.SPEND,
            baseRate: POS_MPOINT_BASE_RATE,
            effectiveRate,
            saleTotal: Number(fullSale.grandTotal),
            earnedPoints,
            redeemedPoints,
            membershipBadge,
            ledgerId: ledgerId || undefined,
            note: loyaltyMode === "EARN" ? "POS checkout reward" : "POS checkout redemption",
          },
        });

        loyaltyResponse = {
          mode: loyaltyMode === "EARN" ? "EARN" : "REDEEM",
          phone: loyaltyPhone,
          earnedPoints,
          redeemedPoints,
          balanceAfter,
          earnRate: effectiveRate,
          membershipBadge,
        };
      }

      const saleResponse = {
        id: fullSale.id,
        receiptNo: fullSale.receiptNo,
        branchName: fullSale.branch.name,
        cashierName: fullSale.cashier.email,
        paymentMethod: fullSale.paymentMethod,
        ebarimt: null,
        paymentBreakdown: normalizedPayments.map((item) => {
          if (item.method === PaymentMethod.CARD && item.attemptId) {
            const attemptMeta = cardAttemptMap.get(String(item.attemptId));
            return { ...item, traceno: attemptMeta?.traceno ?? null, terminalId: attemptMeta?.terminalId ?? null };
          }
          return item;
        }),
        createdAt: fullSale.createdAt.toISOString(),
        lines: fullSale.lines.map((l) => ({
          productId: l.productId,
          name: l.productName,
          qty: l.qty,
          unitPrice: Number(l.unitPrice),
          taxAmount: Number(l.taxAmount),
          lineTotal: Number(l.lineTotal),
        })),
        subTotal: Number(fullSale.subtotal),
        taxTotal: Number(fullSale.taxTotal),
        discountTotal: Number(fullSale.discountTotal),
        grandTotal: Number(fullSale.grandTotal),
        loyalty: loyaltyResponse,
      };

      await tx.posSaleIdempotency.update({
        where: {
          organizationId_clientSaleId: {
            organizationId: effectiveOrganizationId,
            clientSaleId,
          },
        },
        data: { response: saleResponse as object },
      });

      return { saleResponse, effectiveOrganizationId, grandTotal, loyalty: loyaltyResponse };
    });

    void prisma.auditLog.create({
      data: {
        userId: actor?.id || null,
        action: AuditAction.POS_SALE_CREATED,
        ip: req.ip,
        meta: {
          clientSaleId,
          receiptNo,
          registerId,
          branchId: body.branchId,
          organizationId: result.effectiveOrganizationId,
          paymentBreakdown: normalizedPayments,
          grandTotal: result.grandTotal,
          loyalty: result.loyalty,
        },
      },
    });

    res.status(201).json(result.saleResponse);
  } catch (error) {
    const maybeKnownError = error as { code?: string };
    if (maybeKnownError?.code === "P2002") {
      const body = req.body as CreateSaleBody;
      const clientSaleId = String(body.clientSaleId || "").trim();
      const organizationId = String(body.organizationId || "").trim() || null;
      if (clientSaleId) {
        const existingSale = await prisma.posSaleIdempotency.findFirst({
          where: {
            organizationId: organizationId || undefined,
            clientSaleId,
          },
          select: { response: true },
        });
        if (existingSale?.response) {
          const existingResponse = existingSale.response as Record<string, unknown>;
          if (existingResponse.pending === true) {
            return res.status(409).json({ message: "Sale request одоо боловсруулагдаж байна" });
          }
          return res.status(200).json(existingSale.response as object);
        }
      }
    }

    console.error("create pos sale error", error);

    const maybeApiError = error as Partial<ApiError>;
    if (maybeApiError?.status && maybeApiError?.message) {
      return res.status(maybeApiError.status).json({ message: maybeApiError.message });
    }

    res.status(500).json({ message: "POS борлуулалт үүсгэхэд алдаа гарлаа" });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
 * Shift management — open / close / current
 * ─────────────────────────────────────────────────────────────────────── */

router.post("/pos/sales/:id/ebarimt", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const saleId = String(req.params.id || "").trim();
    if (!saleId) {
      return res.status(400).json({ message: "saleId шаардлагатай" });
    }

    const sale = await prisma.posSale.findUnique({
      where: { id: saleId },
      select: { id: true, organizationId: true, receiptNo: true },
    });
    if (!sale) {
      return res.status(404).json({ message: "POS борлуулалт олдсонгүй" });
    }

    if (actor.role !== "ADMIN" && !(await hasOrgMembership(actor.id, sale.organizationId))) {
      return res.status(403).json({ message: "Энэ борлуулалтын eBarimt мэдээлэл засах эрхгүй" });
    }

    const body = req.body as {
      status?: string;
      billId?: string | null;
      receiptId?: string | null;
      qrData?: string | null;
      lottery?: string | null;
      date?: string | null;
      error?: string | null;
      payload?: unknown;
    };

    const cleanText = (value: unknown) => {
      const text = String(value ?? "").trim();
      return text || null;
    };
    const status = cleanText(body.status)?.toUpperCase() || (body.error ? "FAILED" : "SUCCESS");

    const updated = await prisma.posSale.update({
      where: { id: sale.id },
      data: {
        ebarimtStatus: status,
        ebarimtBillId: cleanText(body.billId),
        ebarimtReceiptId: cleanText(body.receiptId),
        ebarimtQrData: cleanText(body.qrData),
        ebarimtLottery: cleanText(body.lottery),
        ebarimtDate: parseEbarimtDate(body.date),
        ebarimtError: cleanText(body.error),
        ...(body.payload !== undefined
          ? { ebarimtPayload: body.payload as Prisma.InputJsonValue }
          : {}),
        ebarimtSyncedAt: new Date(),
      },
      select: {
        ebarimtStatus: true,
        ebarimtBillId: true,
        ebarimtReceiptId: true,
        ebarimtQrData: true,
        ebarimtLottery: true,
        ebarimtDate: true,
        ebarimtError: true,
        ebarimtSyncedAt: true,
      },
    });

    const idempotency = await prisma.posSaleIdempotency.findUnique({
      where: { receiptNo: sale.receiptNo },
      select: { response: true },
    });
    if (idempotency?.response && typeof idempotency.response === "object") {
      await prisma.posSaleIdempotency.update({
        where: { receiptNo: sale.receiptNo },
        data: {
          response: {
            ...(idempotency.response as Record<string, unknown>),
            ebarimt: mapEbarimtReceipt(updated),
          },
        },
      });
    }

    return res.json({ ebarimt: mapEbarimtReceipt(updated) });
  } catch (error) {
    console.error("attach ebarimt receipt error", error);
    return res.status(500).json({ message: "eBarimt мэдээлэл хадгалахад алдаа гарлаа" });
  }
});

export default router;
