import { Router, type Router as ExpressRouter } from "express";
import { prisma, AuditAction, InventoryReason, PaymentMethod, PosPaymentStatus, PosQPayStatus, PosActivationStatus, ShiftStatus, PosSaleStatus } from "@mgl/database";
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

router.get("/pos/products", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const branchId = String(req.query.branchId || "").trim();
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
        where: { userId: actor.id, organizationId: branch.organizationId, isActive: true },
        select: { id: true },
      });
      if (!membership) {
        return res.status(403).json({ message: "Энэ байгууллагад хандах эрхгүй" });
      }
    }

    const products = await prisma.product.findMany({
      where: {
        organizationId: branch.organizationId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        sku: true,
        name: true,
        price: true,
        stock: true,
        isActive: true,
      },
      orderBy: { name: "asc" },
    });

    const response = products.map((p) => ({
      id: p.id,
      sku: p.sku || "",
      name: p.name,
      price: Number(p.price),
      stockQty: p.stock,
      isActive: p.isActive,
    }));

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
      select: { id: true, cashierId: true, branchId: true, organizationId: true },
    });
    if (!shift) {
      return res.status(404).json({ message: "Ээлж олдсонгүй" });
    }

    if (shift.cashierId !== actor.id && actor.role !== "ADMIN") {
      return res.status(403).json({ message: "Энэ ээлжийн мэдээлэл харах эрхгүй" });
    }

    const sales = await prisma.posSale.findMany({
      where: { shiftId },
      include: {
        lines: true,
        cashier: { select: { email: true } },
        branch: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const receipts = sales.map((sale) => ({
      id: sale.id,
      receiptNo: sale.receiptNo,
      branchName: sale.branch.name,
      cashierName: sale.cashier.email,
      paymentMethod: sale.paymentMethod,
      createdAt: sale.createdAt.toISOString(),
      lines: sale.lines.map((line) => ({
        productId: line.productId,
        name: line.productName,
        qty: line.qty,
        unitPrice: Number(line.unitPrice),
        taxAmount: Number(line.taxAmount),
        lineTotal: Number(line.lineTotal),
      })),
      subTotal: Number(sale.subtotal),
      taxTotal: Number(sale.taxTotal),
      discountTotal: Number(sale.discountTotal),
      grandTotal: Number(sale.grandTotal),
    }));

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
      actor.role === "ADMIN" ? queryOrgId : (actor.organizationId || queryOrgId);

    if (!effectiveOrgId) {
      return res.status(400).json({ message: "organizationId шаардлагатай" });
    }

    if (actor.role !== "ADMIN" && !(await hasOrgMembership(actor.id, effectiveOrgId))) {
      return res.status(403).json({ message: "Энэ байгууллагын мэдээлэл харах эрхгүй" });
    }

    const fromStr = String(req.query.from || "").trim();
    const toStr = String(req.query.to || "").trim();
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));

    const where: Record<string, unknown> = { organizationId: effectiveOrgId };
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
        include: {
          lines: { include: { product: { select: { name: true, sku: true } } } },
          cashier: { select: { email: true, profile: { select: { fullName: true } } } },
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
        discount: Number(line.discount),
        lineTotal: Number(line.lineTotal),
      })),
    }));

    return res.json({ total, page, limit, pages: Math.ceil(total / limit), sales: result });
  } catch (error) {
    console.error("sales history error", error);
    return res.status(500).json({ message: "Борлуулалтын түүх авахад алдаа гарлаа" });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
 * POS Reports — aggregated sales report
 * GET /pos/reports?branchId=<uuid>&from=<ISO>&to=<ISO>
 * ─────────────────────────────────────────────────────────────────────── */

router.get("/pos/reports", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const branchId = String(req.query.branchId || "").trim();
    const fromStr = String(req.query.from || "").trim();
    const toStr = String(req.query.to || "").trim();

    if (!branchId || !fromStr || !toStr) {
      return res.status(400).json({ message: "branchId, from, to шаардлагатай" });
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
        where: { userId: actor.id, organizationId: branch.organizationId, isActive: true },
        select: { id: true },
      });
      if (!membership) {
        return res.status(403).json({ message: "Энэ байгууллагад хандах эрхгүй" });
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
    const grossAmount = sales.reduce((sum, s) => sum + Number(s.grandTotal) + Number(s.discountTotal), 0);
    const netAmount = sales.reduce((sum, s) => sum + Number(s.grandTotal), 0);
    const averageTicket = salesCount > 0 ? roundMoney(netAmount / salesCount) : 0;

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
    const reason = String(req.body.reason || "").trim().slice(0, 500);
    if (!reason) {
      return res.status(400).json({ message: "Цуцлах шалтгаан шаардлагатай" });
    }

    const sale = await prisma.posSale.findUnique({
      where: { id: saleId },
      include: { lines: true },
    });
    if (!sale) {
      return res.status(404).json({ message: "Борлуулалт олдсонгүй" });
    }
    if (sale.status !== PosSaleStatus.COMPLETED) {
      return res.status(409).json({ message: "Зөвхөн дууссан борлуулалтыг цуцлах боломжтой" });
    }

    if (actor.role !== "ADMIN") {
      const membership = await prisma.organizationMember.findFirst({
        where: { userId: actor.id, organizationId: sale.organizationId, isActive: true },
        select: { id: true },
      });
      if (!membership) {
        return res.status(403).json({ message: "Энэ байгууллагад хандах эрхгүй" });
      }
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.posSale.update({
        where: { id: saleId },
        data: {
          status: PosSaleStatus.VOIDED,
          voidedAt: new Date(),
          voidReason: reason,
          voidedById: actor.id,
        },
      });

      // Reverse stock for each line
      for (const line of sale.lines) {
        const warehouseId = await resolveOrgWarehouse(tx, sale.organizationId, line.productId);
        await adjustStock(tx, {
          productId: line.productId,
          warehouseId: warehouseId ?? undefined,
          change: line.qty, // positive = return to stock
          reason: InventoryReason.ORDER,
          note: `Void sale ${sale.receiptNo}`,
          createdById: actor.id,
          referenceId: sale.receiptNo,
          referenceType: "POS_VOID",
        });
      }
    });

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

    res.status(200).json({ ok: true, message: "Борлуулалт амжилттай цуцлагдлаа" });
  } catch (error) {
    console.error("void sale error", error);
    const maybeApiError = error as Partial<ApiError>;
    if (maybeApiError?.status && maybeApiError?.message) {
      return res.status(maybeApiError.status).json({ message: maybeApiError.message });
    }
    res.status(500).json({ message: "Борлуулалт цуцлахад алдаа гарлаа" });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
 * PosRegister config — vendor POS machine fetches this on boot
 * GET /pos/register-config?registerId=<uuid>
 * ─────────────────────────────────────────────────────────────────────── */

export default router;
