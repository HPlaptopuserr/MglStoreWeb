import { Router, type Router as ExpressRouter } from "express";
import {
  prisma,
  AuditAction,
  InventoryReason,
  PaymentMethod,
  PosPaymentStatus,
  PosQPayStatus,
  PosActivationStatus,
  ShiftStatus,
  PosSaleStatus,
  PosCreditStatus,
  CashDrawerEventType,
  KitchenTicketStatus,
  RestaurantTicketStatus,
} from "@mgl/database";
import type { Prisma } from "@mgl/database";
import {
  adjustStock,
  resolveOrgWarehouse,
} from "../../../services/inventory.service";
import { hasOrgMembership } from "../../../services/permission.service";
import { checkQPayPayment, createQPayInvoice } from "../../../services/qpay";
import { buildQPayMerchantContextFromPosRegister } from "../../../services/qpay.merchant-context";
import { getVendorMerchantConfig } from "../../../services/vendor-merchant.service";
import {
  requirePosUser,
  requireAdminUser,
  normalizePaymentMethod,
  normalizeRegisterName,
  roundMoney,
  moneyMatches,
  signPayload,
  timingSafeEqualHex,
  getHeaderValue,
  parseBridgeResultStatus,
  parseQPaySuccess,
  parseOptionalDate,
  makePushEcrReferral,
  pushEcrHeaders,
  pushEcrBaseUrl,
  allowPosSimulation,
  isProdLikeEnv,
  bridgeSharedSecret,
  pushEcrDefaultTerminalId,
  MONEY_EPSILON,
  type AuthUser,
  type ApiError,
  type SaleLineInput,
  type SalePaymentLineInput,
  type CreateSaleBody,
  type PushEcrPurchaseResponse,
  toApiError,
  parseAuthClaims,
  runtimeEnv,
} from "./_shared";
import { calculatePosCreditPayable } from "./credit-interest";

const router: ExpressRouter = Router();

const cleanOptionalText = (value: unknown) => {
  const text = String(value ?? "").trim();
  return text || null;
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

const mapCreditSaleResponse = (creditSale: {
  id: string;
  customerId: string | null;
  status: string;
  targetType: string;
  borrowerId: string;
  borrowerName: string;
  borrowerPhone: string | null;
  borrowerEmail?: string | null;
  borrowerAddress?: string | null;
  employeeId: string | null;
  employeeName: string | null;
  principalAmount: unknown;
  monthlyInterestRate: unknown;
  totalInterest: unknown;
  totalDue: unknown;
  termMonths: number;
  dueDate: Date | null;
  createdAt?: Date | null;
  paidAt?: Date | null;
  paidAmount?: unknown;
  paymentMethod?: string | null;
  paymentNote?: string | null;
}) => {
  const payable = calculatePosCreditPayable(creditSale);

  return {
    id: creditSale.id,
    customerId: creditSale.customerId,
    status: creditSale.status,
    targetType: creditSale.targetType,
    borrowerId: creditSale.borrowerId,
    borrowerName: creditSale.borrowerName,
    borrowerPhone: creditSale.borrowerPhone,
    borrowerEmail: creditSale.borrowerEmail ?? null,
    borrowerAddress: creditSale.borrowerAddress ?? null,
    employeeId: creditSale.employeeId,
    employeeName: creditSale.employeeName,
    principalAmount: payable.principalAmount,
    monthlyInterestRate: payable.monthlyInterestRate,
    totalInterest: payable.totalInterest,
    totalDue: payable.totalDue,
    termMonths: creditSale.termMonths,
    dueDate: payable.dueDate?.toISOString() ?? null,
    paidAt: creditSale.paidAt?.toISOString() ?? null,
    paidAmount:
      creditSale.paidAmount == null ? null : Number(creditSale.paidAmount),
    paymentMethod: creditSale.paymentMethod ?? null,
    paymentNote: creditSale.paymentNote ?? null,
  };
};

const getExpirySortValue = (value?: Date | string | null) => {
  if (!value) return Number.POSITIVE_INFINITY;
  const time =
    value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
};

router.get("/pos/products", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const branchId = String(req.query.branchId || "").trim();
    const restaurantMenuOnly = ["1", "true", "yes", "on"].includes(
      String(req.query.restaurantMenu || "")
        .trim()
        .toLowerCase(),
    );
    const includeAllSupplyTypes = ["1", "true", "yes", "on"].includes(
      String(req.query.includeAllSupplyTypes || "")
        .trim()
        .toLowerCase(),
    );
    if (!branchId) {
      return res.status(400).json({ message: "branchId шаардлагатай" });
    }

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { organizationId: true },
    });
    if (!branch) {
      return res.status(404).json({ message: "Салбар олдсонгүй" });
    }

    if (actor.role !== "ADMIN") {
      const membership = await prisma.organizationMember.findFirst({
        where: {
          userId: actor.id,
          organizationId: branch.organizationId,
          isActive: true,
        },
        select: { id: true },
      });
      if (!membership) {
        return res
          .status(403)
          .json({ message: "Энэ байгууллагад хандах эрхгүй" });
      }
    }

    const products = await prisma.product.findMany({
      where: {
        organizationId: branch.organizationId,
        isActive: true,
        deletedAt: null,
        ...(includeAllSupplyTypes ? {} : { supplyType: "IN_STOCK" }),
        ...(restaurantMenuOnly ? { isRestaurantMenuItem: true } : {}),
      },
      select: {
        id: true,
        sku: true,
        barcode: true,
        name: true,
        price: true,
        wholesalePrice: true,
        orderPrice: true,
        taxType: true,
        cityTaxRate: true,
        classificationCode: true,
        taxProductCode: true,
        stock: true,
        isActive: true,
        isRestaurantMenuItem: true,
        menuCategory: true,
        kitchenStation: true,
        preparationMinutes: true,
        category: { select: { name: true } },
        businessCategory: { select: { name: true } },
        images: { select: { url: true }, take: 1 },
        warehouseInventories: {
          where: {
            quantity: { gt: 0 },
            expiryDate: { not: null },
          },
          select: {
            expiryDate: true,
          },
          orderBy: {
            expiryDate: "asc",
          },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    });

    const response = products
      .map((p) => {
        const expiryDate = p.warehouseInventories[0]?.expiryDate ?? null;
        return {
          id: p.id,
          sku: p.sku || "",
          barcode: p.barcode || null,
          name: p.name,
          imageUrl: p.images[0]?.url ?? null,
          price: Number(p.price),
          wholesalePrice:
            p.wholesalePrice == null ? null : Number(p.wholesalePrice),
          orderPrice: p.orderPrice == null ? null : Number(p.orderPrice),
          stockQty: p.stock,
          taxType: p.taxType || "VAT_ABLE",
          taxRate: p.taxType === "VAT_ABLE" ? 10 : 0,
          cityTaxRate: Number(p.cityTaxRate || 0),
          classificationCode: p.classificationCode || "4711000",
          taxProductCode: p.taxProductCode || null,
          measureUnit: "pcs",
          expiryDate: expiryDate?.toISOString() ?? null,
          isActive: p.isActive,
          isRestaurantMenuItem: p.isRestaurantMenuItem,
          menuCategory: p.menuCategory,
          kitchenStation: p.kitchenStation,
          preparationMinutes: p.preparationMinutes,
          categoryName: p.category?.name || p.businessCategory?.name || null,
        };
      })
      .sort((a, b) => {
        const expiryDiff =
          getExpirySortValue(a.expiryDate) - getExpirySortValue(b.expiryDate);
        if (expiryDiff !== 0) return expiryDiff;
        return a.name.localeCompare(b.name);
      });

    res.status(200).json(response);
  } catch (error) {
    console.error("get pos products error", error);
    res.status(500).json({ message: "Бараа жагсаалт авахад алдаа гарлаа" });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
 * POS Receipts — list sales for a shift
 * GET /pos/receipts?shiftId=<uuid>
 * ─────────────────────────────────────────────────────────────────────── */

router.get("/pos/receipts", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const shiftId = String(req.query.shiftId || "").trim();
    if (!shiftId) {
      return res.status(400).json({ message: "shiftId шаардлагатай" });
    }

    const shift = await prisma.posShift.findUnique({
      where: { id: shiftId },
      select: {
        id: true,
        cashierId: true,
        branchId: true,
        organizationId: true,
      },
    });
    if (!shift) {
      return res.status(404).json({ message: "Ээлж олдсонгүй" });
    }

    if (
      shift.cashierId !== actor.id &&
      actor.role !== "ADMIN" &&
      actor.role !== "SUPER_ADMIN"
    ) {
      const allowed = await hasOrgMembership(actor.id, shift.organizationId);
      if (!allowed) {
        return res
          .status(403)
          .json({ message: "Энэ ээлжийн мэдээлэл харах эрхгүй" });
      }
    }

    const sales = await prisma.posSale.findMany({
      where: { shiftId },
      select: {
        id: true,
        receiptNo: true,
        paymentMethod: true,
        paymentBreakdown: true,
        status: true,
        voidedAt: true,
        createdAt: true,
        ebarimtStatus: true,
        ebarimtBillId: true,
        ebarimtReceiptId: true,
        ebarimtQrData: true,
        ebarimtLottery: true,
        ebarimtDate: true,
        ebarimtError: true,
        ebarimtSyncedAt: true,
        subtotal: true,
        taxTotal: true,
        discountTotal: true,
        grandTotal: true,
        lines: {
          select: {
            productId: true,
            productName: true,
            productBarcode: true,
            qty: true,
            unitPrice: true,
            taxAmount: true,
            taxType: true,
            taxRate: true,
            cityTaxRate: true,
            cityTaxAmount: true,
            classificationCode: true,
            taxProductCode: true,
            measureUnit: true,
            lineTotal: true,
          },
        },
        cashier: { select: { email: true } },
        branch: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const receiptNumbers = sales.map((sale) => sale.receiptNo);
    const [cardAttempts, qpayInvoices] = await Promise.all([
      prisma.cardPaymentAttempt.findMany({
        where: { saleReference: { in: receiptNumbers } },
        select: {
          id: true,
          saleReference: true,
          amount: true,
          transactionId: true,
          traceno: true,
          terminalId: true,
        },
      }),
      prisma.qPayInvoice.findMany({
        where: { saleReference: { in: receiptNumbers } },
        select: {
          id: true,
          saleReference: true,
          amount: true,
          paymentId: true,
        },
      }),
    ]);

    const cardByReceipt = new Map<string, typeof cardAttempts>();
    for (const attempt of cardAttempts) {
      const key = attempt.saleReference || "";
      cardByReceipt.set(key, [...(cardByReceipt.get(key) || []), attempt]);
    }

    const qpayByReceipt = new Map<string, typeof qpayInvoices>();
    for (const invoice of qpayInvoices) {
      const key = invoice.saleReference || "";
      qpayByReceipt.set(key, [...(qpayByReceipt.get(key) || []), invoice]);
    }

    const receipts = sales.map((sale) => {
      const storedPaymentBreakdown = Array.isArray(sale.paymentBreakdown)
        ? sale.paymentBreakdown
            .map((item) => {
              const source = item as Record<string, unknown>;
              const method = String(source.method || "")
                .trim()
                .toUpperCase();
              const amount = Number(source.amount);
              if (!method || !Number.isFinite(amount) || amount <= 0)
                return null;

              if (method === "CARD") {
                const attemptId = String(source.attemptId || "");
                const attempt = (cardByReceipt.get(sale.receiptNo) || []).find(
                  (candidate) => candidate.id === attemptId,
                );
                return {
                  method,
                  amount,
                  attemptId: attemptId || undefined,
                  transactionId:
                    String(source.transactionId || "") ||
                    attempt?.transactionId ||
                    undefined,
                  traceno: attempt?.traceno,
                  terminalId: attempt?.terminalId,
                };
              }

              return {
                method,
                amount,
                invoiceId: String(source.invoiceId || "") || undefined,
                transactionId: String(source.transactionId || "") || undefined,
              };
            })
            .filter(Boolean)
        : [];
      const reconstructedPaymentBreakdown = [
        ...(cardByReceipt.get(sale.receiptNo) || []).map((attempt) => ({
          method: "CARD",
          amount: Number(attempt.amount),
          attemptId: attempt.id,
          transactionId: attempt.transactionId || undefined,
          traceno: attempt.traceno,
          terminalId: attempt.terminalId,
        })),
        ...(qpayByReceipt.get(sale.receiptNo) || []).map((invoice) => ({
          method: "QPAY",
          amount: Number(invoice.amount),
          invoiceId: invoice.id,
          transactionId: invoice.paymentId || invoice.id,
        })),
        ...(cardByReceipt.has(sale.receiptNo) ||
        qpayByReceipt.has(sale.receiptNo)
          ? []
          : [{ method: sale.paymentMethod, amount: Number(sale.grandTotal) }]),
      ];

      return {
        id: sale.id,
        receiptNo: sale.receiptNo,
        branchName: sale.branch.name,
        cashierName: sale.cashier.email,
        paymentMethod: sale.paymentMethod,
        status: sale.status,
        voidedAt: sale.voidedAt?.toISOString() ?? null,
        ebarimt: mapEbarimtReceipt(sale),
        paymentBreakdown:
          storedPaymentBreakdown.length > 0
            ? storedPaymentBreakdown
            : reconstructedPaymentBreakdown,
        createdAt: sale.createdAt.toISOString(),
        lines: sale.lines.map((line) => ({
          productId: line.productId,
          name: line.productName,
          qty: line.qty,
          unitPrice: Number(line.unitPrice),
          taxAmount: Number(line.taxAmount),
          taxType: line.taxType,
          taxRate: Number(line.taxRate),
          cityTaxRate: Number(line.cityTaxRate),
          cityTaxAmount: Number(line.cityTaxAmount),
          classificationCode: line.classificationCode,
          taxProductCode: line.taxProductCode,
          measureUnit: line.measureUnit,
          lineTotal: Number(line.lineTotal),
        })),
        subTotal: Number(sale.subtotal),
        taxTotal: Number(sale.taxTotal),
        discountTotal: Number(sale.discountTotal),
        grandTotal: Number(sale.grandTotal),
      };
    });

    res.status(200).json(receipts);
  } catch (error) {
    console.error("get receipts error", error);
    res.status(500).json({ message: "Баримтын жагсаалт авахад алдаа гарлаа" });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
 * Sales history — org-level
 * GET /pos/sales/history?organizationId=&from=&to=&page=&limit=
 * ─────────────────────────────────────────────────────────────────────── */
router.get("/pos/sales/history", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const queryOrgId = String(req.query.organizationId || "").trim() || null;
    const effectiveOrgId =
      actor.role === "ADMIN" ? queryOrgId : actor.organizationId || queryOrgId;

    if (!effectiveOrgId) {
      return res.status(400).json({ message: "organizationId шаардлагатай" });
    }

    if (
      actor.role !== "ADMIN" &&
      !(await hasOrgMembership(actor.id, effectiveOrgId))
    ) {
      return res
        .status(403)
        .json({ message: "Энэ байгууллагын мэдээлэл харах эрхгүй" });
    }

    const fromStr = String(req.query.from || "").trim();
    const toStr = String(req.query.to || "").trim();
    const branchId = String(req.query.branchId || "").trim();
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));

    const where: Record<string, unknown> = { organizationId: effectiveOrgId };
    if (branchId) where.branchId = branchId;
    if (fromStr || toStr) {
      where.createdAt = {
        ...(fromStr ? { gte: new Date(fromStr) } : {}),
        ...(toStr ? { lte: new Date(toStr) } : {}),
      };
    }

    const [total, sales] = await Promise.all([
      prisma.posSale.count({ where }),
      prisma.posSale.findMany({
        where,
        select: {
          id: true,
          receiptNo: true,
          paymentMethod: true,
          status: true,
          voidedAt: true,
          voidReason: true,
          subtotal: true,
          taxTotal: true,
          discountTotal: true,
          grandTotal: true,
          createdAt: true,
          lines: {
            select: {
              productId: true,
              productName: true,
              productSku: true,
              productBarcode: true,
              qty: true,
              unitPrice: true,
              taxAmount: true,
              taxType: true,
              taxRate: true,
              cityTaxRate: true,
              cityTaxAmount: true,
              classificationCode: true,
              taxProductCode: true,
              measureUnit: true,
              discount: true,
              lineTotal: true,
            },
          },
          cashier: {
            select: { email: true, profile: { select: { fullName: true } } },
          },
          branch: { select: { name: true } },
          register: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const result = sales.map((sale) => ({
      id: sale.id,
      receiptNo: sale.receiptNo,
      branchName: sale.branch.name,
      registerName: sale.register?.name || null,
      cashierName: sale.cashier.profile?.fullName || sale.cashier.email,
      paymentMethod: sale.paymentMethod,
      status: sale.status,
      voidedAt: sale.voidedAt?.toISOString() ?? null,
      voidReason: sale.voidReason ?? null,
      ebarimt: null,
      subtotal: Number(sale.subtotal),
      taxTotal: Number(sale.taxTotal),
      discountTotal: Number(sale.discountTotal),
      grandTotal: Number(sale.grandTotal),
      createdAt: sale.createdAt.toISOString(),
      lines: sale.lines.map((line) => ({
        productId: line.productId,
        productName: line.productName,
        productSku: line.productSku,
        qty: line.qty,
        unitPrice: Number(line.unitPrice),
        taxAmount: Number(line.taxAmount),
        taxType: line.taxType,
        taxRate: Number(line.taxRate),
        cityTaxRate: Number(line.cityTaxRate),
        cityTaxAmount: Number(line.cityTaxAmount),
        classificationCode: line.classificationCode,
        taxProductCode: line.taxProductCode,
        measureUnit: line.measureUnit,
        discount: Number(line.discount),
        lineTotal: Number(line.lineTotal),
      })),
    }));

    return res.json({
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      sales: result,
    });
  } catch (error) {
    console.error("sales history error", error);
    return res
      .status(500)
      .json({ message: "Борлуулалтын түүх авахад алдаа гарлаа" });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
 * POS Reports — aggregated sales report
 * GET /pos/reports?branchId=<uuid>&from=<ISO>&to=<ISO>
 * ─────────────────────────────────────────────────────────────────────── */

router.get("/pos/credit-sales", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const queryOrgId = String(req.query.organizationId || "").trim() || null;
    const branchId = String(req.query.branchId || "").trim() || null;
    const effectiveOrgId =
      actor.role === "ADMIN" ? queryOrgId : actor.organizationId || queryOrgId;

    if (!effectiveOrgId) {
      return res.status(400).json({ message: "organizationId шаардлагатай" });
    }
    if (
      actor.role !== "ADMIN" &&
      !(await hasOrgMembership(actor.id, effectiveOrgId))
    ) {
      return res
        .status(403)
        .json({ message: "Энэ байгууллагын зээлийн жагсаалт харах эрхгүй" });
    }

    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const credits = await prisma.posCreditSale.findMany({
      where: {
        organizationId: effectiveOrgId,
        ...(branchId ? { branchId } : {}),
        status: { in: [PosCreditStatus.OPEN, PosCreditStatus.OVERDUE] },
        sale: { status: PosSaleStatus.COMPLETED },
      },
      select: {
        id: true,
        customerId: true,
        saleId: true,
        status: true,
        targetType: true,
        borrowerId: true,
        borrowerName: true,
        borrowerPhone: true,
        borrowerEmail: true,
        borrowerAddress: true,
        employeeId: true,
        employeeName: true,
        principalAmount: true,
        monthlyInterestRate: true,
        totalInterest: true,
        totalDue: true,
        termMonths: true,
        dueDate: true,
        paidAt: true,
        paidAmount: true,
        paymentMethod: true,
        paymentNote: true,
        sale: {
          select: {
            receiptNo: true,
            createdAt: true,
            lines: {
              select: {
                id: true,
                productId: true,
                productName: true,
                productSku: true,
                qty: true,
                unitPrice: true,
                taxAmount: true,
                discount: true,
                lineTotal: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return res.json({
      credits: credits.map((credit) => ({
        ...mapCreditSaleResponse({
          ...credit,
          createdAt: credit.sale.createdAt,
        }),
        saleId: credit.saleId,
        receiptNo: credit.sale.receiptNo,
        createdAt: credit.sale.createdAt.toISOString(),
        lines: credit.sale.lines.map((line) => ({
          id: line.id,
          productId: line.productId,
          productName: line.productName,
          productSku: line.productSku,
          qty: line.qty,
          unitPrice: Number(line.unitPrice),
          taxAmount: Number(line.taxAmount),
          discount: Number(line.discount),
          lineTotal: Number(line.lineTotal),
        })),
      })),
    });
  } catch (error) {
    console.error("credit sales list error", error);
    return res
      .status(500)
      .json({ message: "Зээлийн жагсаалт авахад алдаа гарлаа" });
  }
});

router.get("/pos/credit-customers", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const queryOrgId = String(req.query.organizationId || "").trim() || null;
    const targetType = String(req.query.targetType || "")
      .trim()
      .toUpperCase();
    const search = String(req.query.search || "").trim();
    const effectiveOrgId =
      actor.role === "ADMIN" ? queryOrgId : actor.organizationId || queryOrgId;

    if (!effectiveOrgId) {
      return res.status(400).json({ message: "organizationId шаардлагатай" });
    }
    if (
      actor.role !== "ADMIN" &&
      !(await hasOrgMembership(actor.id, effectiveOrgId))
    ) {
      return res
        .status(403)
        .json({
          message: "Энэ байгууллагын зээлдэгчийн жагсаалт харах эрхгүй",
        });
    }

    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const customers = await prisma.posCreditCustomer.findMany({
      where: {
        organizationId: effectiveOrgId,
        ...(targetType === "COMPANY" || targetType === "CUSTOMER"
          ? { targetType }
          : {}),
        ...(search
          ? {
              OR: [
                { borrowerName: { contains: search, mode: "insensitive" } },
                { borrowerPhone: { contains: search, mode: "insensitive" } },
                { borrowerEmail: { contains: search, mode: "insensitive" } },
                { borrowerAddress: { contains: search, mode: "insensitive" } },
                { employeeName: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        targetType: true,
        borrowerId: true,
        borrowerName: true,
        borrowerPhone: true,
        borrowerEmail: true,
        borrowerAddress: true,
        employeeId: true,
        employeeName: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });

    return res.json({
      customers: customers.map((customer) => ({
        ...customer,
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("credit customers list error", error);
    return res
      .status(500)
      .json({ message: "Зээлдэгчийн жагсаалт авахад алдаа гарлаа" });
  }
});

router.post("/pos/credit-sales/pay-bulk", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const creditSaleIds: string[] = Array.isArray(req.body.creditSaleIds)
      ? Array.from(
          new Set<string>(
            req.body.creditSaleIds
              .map((value: unknown): string => String(value || "").trim())
              .filter((value: string) => Boolean(value)),
          ),
        )
      : [];
    if (creditSaleIds.length < 2) {
      return res
        .status(400)
        .json({ message: "Нийт төлөлтөд 2 буюу түүнээс олон зээл сонгоно уу" });
    }

    const paymentMethod =
      normalizePaymentMethod(String(req.body.paymentMethod || "")) ||
      PaymentMethod.CASH;
    if (paymentMethod === PaymentMethod.CREDIT) {
      return res.status(400).json({
        message: "Зээлийн төлөлтийг CREDIT хэлбэрээр бүртгэх боломжгүй",
      });
    }

    const credits = await prisma.posCreditSale.findMany({
      where: { id: { in: creditSaleIds } },
      select: {
        id: true,
        organizationId: true,
        branchId: true,
        registerId: true,
        createdAt: true,
        status: true,
        principalAmount: true,
        monthlyInterestRate: true,
        totalDue: true,
        termMonths: true,
        dueDate: true,
        paidAt: true,
      },
    });
    if (credits.length !== creditSaleIds.length) {
      return res.status(404).json({ message: "Зарим зээлийн бүртгэл олдсонгүй" });
    }

    const organizationIds = new Set(credits.map((credit) => credit.organizationId));
    if (organizationIds.size !== 1) {
      return res
        .status(400)
        .json({ message: "Нийт төлөлт зөвхөн нэг байгууллагын зээлүүд дээр хийгдэнэ" });
    }
    const organizationId = credits[0]!.organizationId;
    if (
      actor.role !== "ADMIN" &&
      !(await hasOrgMembership(actor.id, organizationId))
    ) {
      return res
        .status(403)
        .json({ message: "Энэ байгууллагын зээлийн бүртгэлд хандах эрхгүй" });
    }

    const invalidCredit = credits.find(
      (credit) =>
        credit.status === PosCreditStatus.PAID ||
        credit.status === PosCreditStatus.CANCELLED,
    );
    if (invalidCredit) {
      return res.status(409).json({
        message:
          invalidCredit.status === PosCreditStatus.PAID
            ? "Сонгосон зээлүүдийн нэг нь аль хэдийн төлөгдсөн байна"
            : "Цуцлагдсан зээлийг төлсөн болгох боломжгүй",
      });
    }

    const payables = credits.map((credit) => ({
      credit,
      payable: calculatePosCreditPayable({
        principalAmount: credit.principalAmount,
        monthlyInterestRate: credit.monthlyInterestRate,
        termMonths: credit.termMonths,
        dueDate: credit.dueDate,
        createdAt: credit.createdAt,
        paidAt: credit.paidAt,
      }),
    }));
    const dueAmount = roundMoney(
      payables.reduce((sum, item) => sum + item.payable.totalDue, 0),
    );
    const paidAmount = roundMoney(Number(req.body.amount || dueAmount));
    if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
      return res
        .status(400)
        .json({ message: "Төлсөн дүн 0-оос их байх ёстой" });
    }
    if (!moneyMatches(paidAmount, dueAmount)) {
      return res
        .status(400)
        .json({ message: `Нийт зээлийг бүтэн төлөх дүн ${dueAmount} байна` });
    }

    const qpayInvoiceId = cleanOptionalText(req.body.qpayInvoiceId);
    const cardAttemptId = cleanOptionalText(
      req.body.cardAttemptId ?? req.body.attemptId ?? req.body.transactionId,
    );
    if (paymentMethod === PaymentMethod.CARD && !cardAttemptId) {
      return res
        .status(400)
        .json({ message: "Картын төлөлтөд cardAttemptId шаардлагатай" });
    }
    const shiftId = cleanOptionalText(req.body.shiftId);
    const paymentNote =
      [
        cleanOptionalText(req.body.note),
        `Bulk credit count: ${credits.length}`,
        qpayInvoiceId ? `QPay invoice: ${qpayInvoiceId}` : null,
        cardAttemptId ? `Card attempt: ${cardAttemptId}` : null,
      ]
        .filter(Boolean)
        .join(" | ") || null;

    const paidAt = new Date();
    const updated = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        if (paymentMethod === PaymentMethod.QPAY) {
          if (!qpayInvoiceId)
            throw toApiError(400, "QPay төлөлтөд invoiceId шаардлагатай");
          const invoice = await tx.qPayInvoice.findUnique({
            where: { id: qpayInvoiceId },
          });
          if (!invoice) throw toApiError(404, "QPay invoice олдсонгүй");
          if (invoice.status !== PosQPayStatus.PAID)
            throw toApiError(409, "QPay төлбөр баталгаажаагүй байна");
          if (invoice.saleReference || invoice.consumedAt)
            throw toApiError(409, "QPay invoice аль хэдийн ашиглагдсан байна");
          if (!invoice.organizationId || invoice.organizationId !== organizationId) {
            throw toApiError(400, "QPay invoice байгууллага зөрүүтэй байна");
          }
          if (!moneyMatches(Number(invoice.amount), paidAmount)) {
            throw toApiError(
              400,
              "QPay invoice дүн төлсөн дүнтэй таарахгүй байна",
            );
          }
          await tx.qPayInvoice.update({
            where: { id: invoice.id },
            data: {
              saleReference: `CREDIT-BULK-${creditSaleIds[0]}`,
              consumedAt: paidAt,
            },
          });
        }

        if (paymentMethod === PaymentMethod.CARD && cardAttemptId) {
          const attempt = await tx.cardPaymentAttempt.findUnique({
            where: { id: cardAttemptId },
          });
          if (!attempt) throw toApiError(404, "Card attempt олдсонгүй");
          if (attempt.status !== PosPaymentStatus.APPROVED)
            throw toApiError(409, "Картын төлбөр баталгаажаагүй байна");
          if (attempt.saleReference || attempt.consumedAt)
            throw toApiError(409, "Card attempt аль хэдийн ашиглагдсан байна");
          if (!attempt.organizationId || attempt.organizationId !== organizationId) {
            throw toApiError(400, "Card attempt байгууллага зөрүүтэй байна");
          }
          if (!moneyMatches(Number(attempt.amount), paidAmount)) {
            throw toApiError(
              400,
              "Card attempt дүн төлсөн дүнтэй таарахгүй байна",
            );
          }
          await tx.cardPaymentAttempt.update({
            where: { id: attempt.id },
            data: {
              saleReference: `CREDIT-BULK-${creditSaleIds[0]}`,
              consumedAt: paidAt,
            },
          });
        }

        if (paymentMethod === PaymentMethod.CASH && shiftId) {
          const shift = await tx.posShift.findUnique({
            where: { id: shiftId },
          });
          if (!shift) throw toApiError(404, "Ээлж олдсонгүй");
          if (shift.status !== ShiftStatus.OPEN)
            throw toApiError(
              409,
              "Хаагдсан ээлж дээр бэлэн төлөлт бүртгэх боломжгүй",
            );
          if (shift.organizationId !== organizationId)
            throw toApiError(400, "Ээлж байгууллага зөрүүтэй байна");
          await tx.posCashDrawerEvent.create({
            data: {
              organizationId: shift.organizationId,
              branchId: shift.branchId,
              registerId: shift.registerId,
              shiftId: shift.id,
              cashierId: actor.id,
              type: CashDrawerEventType.PAID_IN,
              amount: paidAmount,
              note: paymentNote || `Bulk credit payment ${creditSaleIds[0]}`,
            },
          });
        }

        return Promise.all(
          payables.map(({ credit, payable }) =>
            tx.posCreditSale.update({
              where: { id: credit.id },
              data: {
                status: PosCreditStatus.PAID,
                paidAt,
                paidAmount: payable.totalDue,
                paymentMethod,
                paymentNote,
                totalInterest: payable.totalInterest,
                totalDue: payable.totalDue,
              },
              select: {
                id: true,
                customerId: true,
                status: true,
                targetType: true,
                borrowerId: true,
                borrowerName: true,
                borrowerPhone: true,
                borrowerEmail: true,
                borrowerAddress: true,
                employeeId: true,
                employeeName: true,
                principalAmount: true,
                monthlyInterestRate: true,
                totalInterest: true,
                totalDue: true,
                termMonths: true,
                dueDate: true,
                paidAt: true,
                paidAmount: true,
                paymentMethod: true,
                paymentNote: true,
                createdAt: true,
              },
            }),
          ),
        );
      },
    );

    return res.status(200).json({
      credits: updated.map((credit) =>
        mapCreditSaleResponse({
          ...credit,
          createdAt: credit.createdAt,
        }),
      ),
      paidAmount,
    });
  } catch (error) {
    const known = error as ApiError;
    if (known?.status && known?.message) {
      return res.status(known.status).json({ message: known.message });
    }
    console.error("pay bulk credit sales error", error);
    return res
      .status(500)
      .json({ message: "Нийт зээлийн төлөлт бүртгэхэд алдаа гарлаа" });
  }
});

router.post("/pos/credit-sales/:id/pay", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const creditSaleId = String(req.params.id || "").trim();
    if (!creditSaleId) {
      return res.status(400).json({ message: "creditSaleId шаардлагатай" });
    }

    const creditSale = await prisma.posCreditSale.findUnique({
      where: { id: creditSaleId },
      select: {
        id: true,
        organizationId: true,
        branchId: true,
        registerId: true,
        status: true,
        principalAmount: true,
        monthlyInterestRate: true,
        totalDue: true,
        termMonths: true,
        dueDate: true,
        paidAt: true,
        sale: { select: { createdAt: true } },
      },
    });
    if (!creditSale) {
      return res.status(404).json({ message: "Зээлийн бүртгэл олдсонгүй" });
    }
    if (
      actor.role !== "ADMIN" &&
      !(await hasOrgMembership(actor.id, creditSale.organizationId))
    ) {
      return res
        .status(403)
        .json({ message: "Энэ байгууллагын зээлийн бүртгэлд хандах эрхгүй" });
    }
    if (creditSale.status === PosCreditStatus.PAID) {
      return res
        .status(409)
        .json({ message: "Энэ зээл аль хэдийн төлөгдсөн байна" });
    }
    if (creditSale.status === PosCreditStatus.CANCELLED) {
      return res
        .status(409)
        .json({ message: "Цуцлагдсан зээлийг төлсөн болгох боломжгүй" });
    }

    const paymentMethod =
      normalizePaymentMethod(String(req.body.paymentMethod || "")) ||
      PaymentMethod.CASH;
    if (paymentMethod === PaymentMethod.CREDIT) {
      return res
        .status(400)
        .json({
          message: "Зээлийн төлөлтийг CREDIT хэлбэрээр бүртгэх боломжгүй",
        });
    }

    const payable = calculatePosCreditPayable({
      principalAmount: creditSale.principalAmount,
      monthlyInterestRate: creditSale.monthlyInterestRate,
      termMonths: creditSale.termMonths,
      dueDate: creditSale.dueDate,
      createdAt: creditSale.sale.createdAt,
      paidAt: creditSale.paidAt,
    });

    const paidAmount = roundMoney(Number(req.body.amount || payable.totalDue));
    const dueAmount = payable.totalDue;
    if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
      return res
        .status(400)
        .json({ message: "Төлсөн дүн 0-оос их байх ёстой" });
    }
    if (!moneyMatches(paidAmount, dueAmount)) {
      return res
        .status(400)
        .json({ message: `Зээлийг бүтэн төлөх дүн ${dueAmount} байна` });
    }

    const qpayInvoiceId = cleanOptionalText(req.body.qpayInvoiceId);
    const cardAttemptId = cleanOptionalText(
      req.body.cardAttemptId ?? req.body.attemptId ?? req.body.transactionId,
    );
    if (paymentMethod === PaymentMethod.CARD && !cardAttemptId) {
      return res
        .status(400)
        .json({ message: "Картын төлөлтөд cardAttemptId шаардлагатай" });
    }
    const shiftId = cleanOptionalText(req.body.shiftId);
    const paymentNote =
      [
        cleanOptionalText(req.body.note),
        qpayInvoiceId ? `QPay invoice: ${qpayInvoiceId}` : null,
        cardAttemptId ? `Card attempt: ${cardAttemptId}` : null,
      ]
        .filter(Boolean)
        .join(" | ") || null;

    const paidAt = new Date();
    const updated = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        if (paymentMethod === PaymentMethod.QPAY) {
          if (!qpayInvoiceId)
            throw toApiError(400, "QPay төлөлтөд invoiceId шаардлагатай");
          const invoice = await tx.qPayInvoice.findUnique({
            where: { id: qpayInvoiceId },
          });
          if (!invoice) throw toApiError(404, "QPay invoice олдсонгүй");
          if (invoice.status !== PosQPayStatus.PAID)
            throw toApiError(409, "QPay төлбөр баталгаажаагүй байна");
          if (invoice.saleReference || invoice.consumedAt)
            throw toApiError(409, "QPay invoice аль хэдийн ашиглагдсан байна");
          if (
            !invoice.organizationId ||
            invoice.organizationId !== creditSale.organizationId
          ) {
            throw toApiError(400, "QPay invoice байгууллага зөрүүтэй байна");
          }
          if (!moneyMatches(Number(invoice.amount), paidAmount)) {
            throw toApiError(
              400,
              "QPay invoice дүн төлсөн дүнтэй таарахгүй байна",
            );
          }
          await tx.qPayInvoice.update({
            where: { id: invoice.id },
            data: {
              saleReference: `CREDIT-${creditSale.id}`,
              consumedAt: paidAt,
            },
          });
        }

        if (paymentMethod === PaymentMethod.CARD && cardAttemptId) {
          const attempt = await tx.cardPaymentAttempt.findUnique({
            where: { id: cardAttemptId },
          });
          if (!attempt) throw toApiError(404, "Card attempt олдсонгүй");
          if (attempt.status !== PosPaymentStatus.APPROVED)
            throw toApiError(409, "Картын төлбөр баталгаажаагүй байна");
          if (attempt.saleReference || attempt.consumedAt)
            throw toApiError(409, "Card attempt аль хэдийн ашиглагдсан байна");
          if (
            !attempt.organizationId ||
            attempt.organizationId !== creditSale.organizationId
          ) {
            throw toApiError(400, "Card attempt байгууллага зөрүүтэй байна");
          }
          if (!moneyMatches(Number(attempt.amount), paidAmount)) {
            throw toApiError(
              400,
              "Card attempt дүн төлсөн дүнтэй таарахгүй байна",
            );
          }
          await tx.cardPaymentAttempt.update({
            where: { id: attempt.id },
            data: {
              saleReference: `CREDIT-${creditSale.id}`,
              consumedAt: paidAt,
            },
          });
        }

        if (paymentMethod === PaymentMethod.CASH && shiftId) {
          const shift = await tx.posShift.findUnique({
            where: { id: shiftId },
          });
          if (!shift) throw toApiError(404, "Ээлж олдсонгүй");
          if (shift.status !== ShiftStatus.OPEN)
            throw toApiError(
              409,
              "Хаагдсан ээлж дээр бэлэн төлөлт бүртгэх боломжгүй",
            );
          if (shift.organizationId !== creditSale.organizationId)
            throw toApiError(400, "Ээлж байгууллага зөрүүтэй байна");
          await tx.posCashDrawerEvent.create({
            data: {
              organizationId: shift.organizationId,
              branchId: shift.branchId,
              registerId: shift.registerId,
              shiftId: shift.id,
              cashierId: actor.id,
              type: CashDrawerEventType.PAID_IN,
              amount: paidAmount,
              note: paymentNote || `Credit payment ${creditSale.id}`,
            },
          });
        }

        return tx.posCreditSale.update({
          where: { id: creditSale.id },
          data: {
            status: PosCreditStatus.PAID,
            paidAt,
            paidAmount,
            paymentMethod,
            paymentNote,
            totalInterest: payable.totalInterest,
            totalDue: payable.totalDue,
          },
          select: {
            id: true,
            customerId: true,
            status: true,
            targetType: true,
            borrowerId: true,
            borrowerName: true,
            borrowerPhone: true,
            borrowerEmail: true,
            borrowerAddress: true,
            employeeId: true,
            employeeName: true,
            principalAmount: true,
            monthlyInterestRate: true,
            totalInterest: true,
            totalDue: true,
            termMonths: true,
            dueDate: true,
            paidAt: true,
            paidAmount: true,
            paymentMethod: true,
            paymentNote: true,
            sale: { select: { createdAt: true } },
          },
        });
      },
    );

    return res
      .status(200)
      .json({
        credit: mapCreditSaleResponse({
          ...updated,
          createdAt: updated.sale.createdAt,
        }),
      });
  } catch (error) {
    const known = error as ApiError;
    if (known?.status && known?.message) {
      return res.status(known.status).json({ message: known.message });
    }
    console.error("pay credit sale error", error);
    return res
      .status(500)
      .json({ message: "Зээлийн төлөлт бүртгэхэд алдаа гарлаа" });
  }
});

router.get("/pos/reports", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const branchId = String(req.query.branchId || "").trim();
    const fromStr = String(req.query.from || "").trim();
    const toStr = String(req.query.to || "").trim();

    if (!branchId || !fromStr || !toStr) {
      return res
        .status(400)
        .json({ message: "branchId, from, to шаардлагатай" });
    }

    const from = new Date(fromStr);
    const to = new Date(toStr);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return res.status(400).json({ message: "from, to буруу огноо формат" });
    }

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { organizationId: true },
    });
    if (!branch) {
      return res.status(404).json({ message: "Салбар олдсонгүй" });
    }

    if (actor.role !== "ADMIN") {
      const membership = await prisma.organizationMember.findFirst({
        where: {
          userId: actor.id,
          organizationId: branch.organizationId,
          isActive: true,
        },
        select: { id: true },
      });
      if (!membership) {
        return res
          .status(403)
          .json({ message: "Энэ байгууллагад хандах эрхгүй" });
      }
    }

    const sales = await prisma.posSale.findMany({
      where: {
        branchId,
        status: PosSaleStatus.COMPLETED,
        createdAt: { gte: from, lte: to },
      },
      select: { grandTotal: true, discountTotal: true },
    });

    const salesCount = sales.length;
    const grossAmount = sales.reduce(
      (sum, s) => sum + Number(s.grandTotal) + Number(s.discountTotal),
      0,
    );
    const netAmount = sales.reduce((sum, s) => sum + Number(s.grandTotal), 0);
    const averageTicket =
      salesCount > 0 ? roundMoney(netAmount / salesCount) : 0;

    res.status(200).json({
      salesCount,
      grossAmount: roundMoney(grossAmount),
      netAmount: roundMoney(netAmount),
      averageTicket,
    });
  } catch (error) {
    console.error("get pos reports error", error);
    res.status(500).json({ message: "Тайлан авахад алдаа гарлаа" });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
 * Void a completed sale
 * POST /pos/sales/:id/void
 * ─────────────────────────────────────────────────────────────────────── */

router.post("/pos/sales/:id/void", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const saleId = req.params.id;
    const reason = String(req.body.reason || "")
      .trim()
      .slice(0, 500);
    if (!reason) {
      return res.status(400).json({ message: "Цуцлах шалтгаан шаардлагатай" });
    }

    const sale = await prisma.posSale.findUnique({
      where: { id: saleId },
      include: {
        lines: true,
        restaurantTicket: { select: { id: true, note: true } },
      },
    });
    if (!sale) {
      return res.status(404).json({ message: "Борлуулалт олдсонгүй" });
    }
    if (sale.status !== PosSaleStatus.COMPLETED) {
      return res
        .status(409)
        .json({ message: "Зөвхөн дууссан борлуулалтыг цуцлах боломжтой" });
    }

    if (actor.role !== "ADMIN") {
      const membership = await prisma.organizationMember.findFirst({
        where: {
          userId: actor.id,
          organizationId: sale.organizationId,
          isActive: true,
        },
        select: { id: true },
      });
      if (!membership) {
        return res
          .status(403)
          .json({ message: "Энэ байгууллагад хандах эрхгүй" });
      }
    }

    await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const voidedAt = new Date();

        await tx.posSale.update({
          where: { id: saleId },
          data: {
            status: PosSaleStatus.VOIDED,
            voidedAt,
            voidReason: reason,
            voidedById: actor.id,
          },
        });

        if (sale.restaurantTicket) {
          const existingNote = sale.restaurantTicket.note?.trim();
          await tx.restaurantTicket.update({
            where: { id: sale.restaurantTicket.id },
            data: {
              status: RestaurantTicketStatus.CANCELLED,
              closedAt: voidedAt,
              note: existingNote ? `${existingNote}\nVOID: ${reason}` : `VOID: ${reason}`,
            },
          });

          await tx.kitchenTicket.updateMany({
            where: {
              restaurantTicketId: sale.restaurantTicket.id,
              status: {
                in: [
                  KitchenTicketStatus.NEW,
                  KitchenTicketStatus.PREPARING,
                  KitchenTicketStatus.READY,
                ],
              },
            },
            data: {
              status: KitchenTicketStatus.CANCELLED,
              cancelledAt: voidedAt,
            },
          });
        }

        // Reverse stock for each line
        for (const line of sale.lines) {
          const warehouseId = await resolveOrgWarehouse(
            tx,
            sale.organizationId,
            line.productId,
          );
          await adjustStock(tx, {
            productId: line.productId,
            warehouseId: warehouseId ?? undefined,
            branchId: sale.branchId,
            change: line.qty, // positive = return to stock
            reason: InventoryReason.RETURN,
            note: `Void sale ${sale.receiptNo}`,
            createdById: actor.id,
            referenceId: sale.receiptNo,
            referenceType: "POS_VOID",
          });
        }
      },
      { timeout: 15_000 },
    );

    void prisma.auditLog.create({
      data: {
        userId: actor.id,
        action: AuditAction.POS_SALE_CREATED, // reuse closest action
        ip: req.ip,
        meta: {
          saleId,
          receiptNo: sale.receiptNo,
          voidReason: reason,
          action: "VOID",
        },
      },
    });

    res.status(200).json({ ok: true, message: "Буцаалт амжилттай хийгдлээ" });
  } catch (error) {
    console.error("void sale error", error);
    const maybeApiError = error as Partial<ApiError>;
    if (maybeApiError?.status && maybeApiError?.message) {
      return res
        .status(maybeApiError.status)
        .json({ message: maybeApiError.message });
    }
    res.status(500).json({ message: "Буцаалт хийхэд алдаа гарлаа" });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
 * PosRegister config — vendor POS machine fetches this on boot
 * GET /pos/register-config?registerId=<uuid>
 * ─────────────────────────────────────────────────────────────────────── */

export default router;
