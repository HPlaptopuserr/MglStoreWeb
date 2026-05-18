import { Router, type Router as ExpressRouter } from "express";
import { prisma, AuditAction, InventoryReason, PaymentMethod, PosPaymentStatus, PosQPayStatus, PosActivationStatus, ShiftStatus, PosSaleStatus } from "@mgl/database";
import type { Prisma } from "@mgl/database";
import { adjustStock, resolveOrgWarehouse } from "../../../services/inventory.service";
import { hasOrgMembership } from "../../../services/permission.service";
import { checkQPayPayment, createQPayInvoice } from "../../../services/qpay";
import { buildQPayMerchantContextFromPosRegister } from "../../../services/qpay.merchant-context";
import { getVendorMerchantConfig } from "../../../services/vendor-merchant.service";
import { issueEbarimtReceipt, type EbarimtPaymentLine } from "../../../services/ebarimt.service";
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

type TerminalEbarimtResult = {
  billId: string | null;
  qrData: string | null;
  lottery: string | null;
  source: string;
};

const firstString = (...values: unknown[]) => {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const parseLooseKeyValueText = (raw: string) => {
  const result: Record<string, unknown> = {};
  const pairPattern = /([A-Za-z][A-Za-z0-9_]*)\s*[:=]\s*("(?:\\.|[^"])*"|[^,}\r\n>]*)/g;
  let match: RegExpExecArray | null;
  while ((match = pairPattern.exec(raw))) {
    result[match[1]] = match[2].trim().replace(/^"(.*)"$/, "$1");
  }
  return result;
};

function extractTerminalEbarimt(payload: unknown): TerminalEbarimtResult | null {
  if (!isRecord(payload)) return null;

  const candidates: Record<string, unknown>[] = [payload];
  for (const key of ["parsed", "ebarimt", "eBarimt", "ebarimtReceipt", "receipt", "taxReceipt", "checkTxn"]) {
    const nested = payload[key];
    if (isRecord(nested)) candidates.push(nested);
  }

  const raw = firstString(payload.raw, payload.rawText);
  if (raw) candidates.push(parseLooseKeyValueText(raw));

  for (const candidate of candidates) {
    const billId = firstString(
      candidate.ebarimtBillId,
      candidate.billId,
      candidate.bill_id,
      candidate.ebillId,
      candidate.ebarimt_id,
      candidate.ebarimtId,
    );
    const qrData = firstString(
      candidate.ebarimtQrData,
      candidate.qrData,
      candidate.qr_data,
      candidate.qrText,
      candidate.qr_text,
      candidate.qrCode,
      candidate.qr_code,
    );
    const lottery = firstString(
      candidate.ebarimtLottery,
      candidate.lottery,
      candidate.lotteryNo,
      candidate.lottery_no,
      candidate.luckyNo,
    );

    if (billId || qrData || lottery) {
      return {
        billId: billId || null,
        qrData: qrData || null,
        lottery: lottery || null,
        source: firstString(candidate.ebarimtSource, candidate.source) || "CARD_TERMINAL",
      };
    }
  }

  return null;
}

function mapSaleEbarimt(sale: {
  ebarimtStatus: string;
  ebarimtBillId: string | null;
  ebarimtQrData: string | null;
  ebarimtLottery: string | null;
  ebarimtError: string | null;
  ebarimtSentAt: Date | null;
  ebarimtRetryCount: number;
}) {
  return {
    status: sale.ebarimtStatus,
    billId: sale.ebarimtBillId,
    qrData: sale.ebarimtQrData,
    lottery: sale.ebarimtLottery,
    error: sale.ebarimtError,
    sentAt: sale.ebarimtSentAt?.toISOString() || null,
    retryCount: sale.ebarimtRetryCount,
  };
}

async function issueAndStoreEbarimtReceipt(saleId: string, payments: EbarimtPaymentLine[]) {
  const sale = await prisma.posSale.findUnique({
    where: { id: saleId },
    include: {
      lines: true,
      organization: {
        select: {
          ebarimtEnabled: true,
          ebarimtTin: true,
          ebarimtBranchNo: true,
          ebarimtPosNo: true,
          ebarimtServiceUrl: true,
        },
      },
    },
  });

  if (!sale) return null;

  const result = await issueEbarimtReceipt(
    {
      enabled: sale.organization.ebarimtEnabled,
      tin: sale.organization.ebarimtTin,
      branchNo: sale.organization.ebarimtBranchNo,
      posNo: sale.organization.ebarimtPosNo,
      serviceUrl: sale.organization.ebarimtServiceUrl,
    },
    {
      saleId: sale.id,
      receiptNo: sale.receiptNo,
      createdAt: sale.createdAt,
      grandTotal: Number(sale.grandTotal),
      taxTotal: Number(sale.taxTotal),
      payments,
      lines: sale.lines.map((line) => ({
        productId: line.productId,
        productName: line.productName,
        productSku: line.productSku,
        qty: line.qty,
        unitPrice: Number(line.unitPrice),
        taxAmount: Number(line.taxAmount),
        discount: Number(line.discount),
        lineTotal: Number(line.lineTotal),
      })),
    },
  );

  const updated = await prisma.posSale.update({
    where: { id: sale.id },
    data: {
      ebarimtStatus: result.status,
      ebarimtBillId: result.billId || null,
      ebarimtQrData: result.qrData || null,
      ebarimtLottery: result.lottery || null,
      ebarimtError: result.error || null,
      ebarimtPayload: result.payload ? (result.payload as Prisma.InputJsonValue) : undefined,
      ebarimtResponse: result.response ? (result.response as Prisma.InputJsonValue) : undefined,
      ebarimtSentAt: result.sentAt || null,
      ...(result.status !== "DISABLED" ? { ebarimtRetryCount: { increment: 1 } } : {}),
    },
    select: {
      ebarimtStatus: true,
      ebarimtBillId: true,
      ebarimtQrData: true,
      ebarimtLottery: true,
      ebarimtError: true,
      ebarimtSentAt: true,
      ebarimtRetryCount: true,
    },
  });

  return mapSaleEbarimt(updated);
}

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

    if (normalizedPayments.length === 0) {
      return res.status(400).json({ message: "paymentBreakdown шаардлагатай" });
    }

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

    if (!moneyMatches(paymentTotal, expectedGrandTotal)) {
      return res.status(400).json({
        message: `Payment total (${paymentTotal}) нь grandTotal (${expectedGrandTotal})-тай таарахгүй байна`,
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

      const cardAttemptMap = new Map<string, { traceno: string | null; terminalId: string; ebarimt: TerminalEbarimtResult | null }>();
      for (const cardLine of cardLines) {
        const attemptId = String(cardLine.attemptId || cardLine.transactionId || "").trim();
        if (!attemptId) {
          throw toApiError(400, "CARD payment line дээр attemptId шаардлагатай");
        }

        const attempt = await tx.cardPaymentAttempt.findUnique({ where: { id: attemptId } });
        if (!attempt) throw toApiError(404, `Card attempt олдсонгүй: ${attemptId}`);
        cardAttemptMap.set(attemptId, {
          traceno: attempt.traceno,
          terminalId: attempt.terminalId,
          ebarimt: extractTerminalEbarimt(attempt.providerPayload),
        });
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

      const terminalEbarimt = Array.from(cardAttemptMap.values()).find((item) => item.ebarimt)?.ebarimt ?? null;

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
          ...(terminalEbarimt
            ? {
                ebarimtStatus: "SENT",
                ebarimtBillId: terminalEbarimt.billId,
                ebarimtQrData: terminalEbarimt.qrData,
                ebarimtLottery: terminalEbarimt.lottery,
                ebarimtError: null,
                ebarimtResponse: {
                  source: terminalEbarimt.source,
                  billId: terminalEbarimt.billId,
                  qrData: terminalEbarimt.qrData,
                  lottery: terminalEbarimt.lottery,
                },
                ebarimtSentAt: new Date(),
              }
            : {}),
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
      });

      const fullSale = await tx.posSale.findUniqueOrThrow({
        where: { id: posSale.id },
        include: {
          lines: true,
          cashier: { select: { email: true } },
          branch: { select: { name: true } },
        },
      });

      const saleResponse = {
        id: fullSale.id,
        receiptNo: fullSale.receiptNo,
        branchName: fullSale.branch.name,
        cashierName: fullSale.cashier.email,
        paymentMethod: fullSale.paymentMethod,
        paymentBreakdown: normalizedPayments.map((item) => {
          if (item.method === PaymentMethod.CARD && item.attemptId) {
            const attemptMeta = cardAttemptMap.get(String(item.attemptId));
            return { ...item, traceno: attemptMeta?.traceno ?? null, terminalId: attemptMeta?.terminalId ?? null };
          }
          return item;
        }),
        ...(terminalEbarimt
          ? {
              ebarimt: {
                status: "SENT",
                billId: terminalEbarimt.billId,
                qrData: terminalEbarimt.qrData,
                lottery: terminalEbarimt.lottery,
                error: null,
                sentAt: fullSale.ebarimtSentAt?.toISOString() || null,
                retryCount: fullSale.ebarimtRetryCount,
              },
            }
          : {}),
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

      return { saleResponse, saleId: fullSale.id, effectiveOrganizationId, grandTotal, terminalEbarimt };
    });

    const ebarimt = result.terminalEbarimt
      ? (result.saleResponse as { ebarimt?: ReturnType<typeof mapSaleEbarimt> }).ebarimt ?? null
      : await issueAndStoreEbarimtReceipt(
          result.saleId,
          normalizedPayments.map((item) => ({ method: item.method || "CASH", amount: item.amount })),
        );
    const responseWithEbarimt = ebarimt
      ? { ...result.saleResponse, ebarimt }
      : result.saleResponse;

    if (ebarimt) {
      await prisma.posSaleIdempotency.update({
        where: {
          organizationId_clientSaleId: {
            organizationId: result.effectiveOrganizationId,
            clientSaleId,
          },
        },
        data: { response: responseWithEbarimt as object },
      });
    }

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
          ebarimtStatus: ebarimt?.status || "DISABLED",
        },
      },
    });

    res.status(201).json(responseWithEbarimt);
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

router.post("/pos/sales/:id/ebarimt/retry", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const sale = await prisma.posSale.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        organizationId: true,
        status: true,
        paymentMethod: true,
        grandTotal: true,
        ebarimtStatus: true,
        ebarimtBillId: true,
        ebarimtQrData: true,
        ebarimtLottery: true,
        ebarimtError: true,
        ebarimtSentAt: true,
        ebarimtRetryCount: true,
      },
    });

    if (!sale) {
      return res.status(404).json({ message: "POS sale олдсонгүй" });
    }

    if (actor.role !== "ADMIN" && !(await hasOrgMembership(actor.id, sale.organizationId))) {
      return res.status(403).json({ message: "Энэ байгууллагын баримт дахин илгээх эрхгүй" });
    }

    if (sale.status !== PosSaleStatus.COMPLETED) {
      return res.status(409).json({ message: "Зөвхөн дууссан борлуулалтын eBarimt-ийг дахин илгээнэ" });
    }

    if (sale.ebarimtStatus === "SENT" && req.body?.force !== true) {
      return res.json({ success: true, ebarimt: mapSaleEbarimt(sale) });
    }

    const ebarimt = await issueAndStoreEbarimtReceipt(sale.id, [
      { method: sale.paymentMethod, amount: Number(sale.grandTotal) },
    ]);

    return res.status(ebarimt?.status === "SENT" ? 200 : 400).json({
      success: ebarimt?.status === "SENT",
      ebarimt,
    });
  } catch (error) {
    console.error("retry ebarimt receipt error", error);
    return res.status(500).json({ message: "eBarimt дахин илгээхэд алдаа гарлаа" });
  }
});

export default router;
