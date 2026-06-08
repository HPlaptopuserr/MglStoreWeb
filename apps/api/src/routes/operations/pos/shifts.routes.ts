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
  type AuthUser, type SaleLineInput, type SalePaymentLineInput,
  type CreateSaleBody, type PushEcrPurchaseResponse,
} from "./_shared";

const router: ExpressRouter = Router();

const isAdminActor = (actor: AuthUser) =>
  actor.role === "ADMIN" || actor.role === "SUPER_ADMIN";

const toShiftResponse = (shift: any) => ({
  id: shift.id,
  organizationId: shift.organizationId,
  cashierId: shift.cashierId,
  cashierName: shift.cashier?.email || "",
  branchId: shift.branchId,
  branchName: shift.branch?.name,
  registerId: shift.registerId ?? null,
  registerName: shift.register?.name ?? null,
  openedAt: shift.openedAt.toISOString(),
  closedAt: shift.closedAt?.toISOString() ?? null,
  openingCash: Number(shift.openingCash),
  closingCash: shift.closingCash === null ? null : Number(shift.closingCash),
  expectedCash: shift.expectedCash === null ? 0 : Number(shift.expectedCash),
  cashDifference: shift.cashDifference === null ? null : Number(shift.cashDifference),
  note: shift.note ?? null,
  status: shift.status,
});

const summarizeShiftSales = (
  sales: Array<{ grandTotal: unknown; paymentMethod: string | null }>,
) => {
  const summary = {
    salesCount: sales.length,
    totalSales: 0,
    cashSales: 0,
    cardSales: 0,
    qpaySales: 0,
    mixedSales: 0,
  };

  for (const sale of sales) {
    const amount = Number(sale.grandTotal);
    if (!Number.isFinite(amount)) continue;
    summary.totalSales += amount;
    const method = String(sale.paymentMethod || "").toUpperCase();
    if (method === "CASH") summary.cashSales += amount;
    else if (method === "CARD") summary.cardSales += amount;
    else if (method === "QPAY" || method === "QR") summary.qpaySales += amount;
    else summary.mixedSales += amount;
  }

  return {
    salesCount: summary.salesCount,
    totalSales: roundMoney(summary.totalSales),
    cashSales: roundMoney(summary.cashSales),
    cardSales: roundMoney(summary.cardSales),
    qpaySales: roundMoney(summary.qpaySales),
    mixedSales: roundMoney(summary.mixedSales),
  };
};

router.post("/pos/shifts/open", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const branchId = String(req.body.branchId || "").trim();
    const openingCash = Number(req.body.openingCash);

    if (!branchId) {
      return res.status(400).json({ message: "branchId шаардлагатай" });
    }
    if (!Number.isFinite(openingCash) || openingCash < 0) {
      return res.status(400).json({ message: "openingCash 0 буюу түүнээс дээш байх ёстой" });
    }

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true, organizationId: true, name: true },
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

    const existingOpen = await prisma.posShift.findFirst({
      where: { cashierId: actor.id, status: ShiftStatus.OPEN },
      select: { id: true },
    });
    if (existingOpen) {
      return res.status(409).json({ message: "Нээлттэй ээлж аль хэдийн байна. Эхлээд хаана уу." });
    }

    const shift = await prisma.posShift.create({
      data: {
        organizationId: branch.organizationId,
        branchId,
        cashierId: actor.id,
        openingCash,
        status: ShiftStatus.OPEN,
      },
      include: {
        cashier: { select: { id: true, email: true } },
      },
    });

    const response = {
      id: shift.id,
      cashierId: shift.cashierId,
      cashierName: shift.cashier.email,
      branchId: shift.branchId,
      openedAt: shift.openedAt.toISOString(),
      closedAt: null,
      openingCash: Number(shift.openingCash),
      closingCash: null,
      expectedCash: 0,
      status: shift.status,
    };

    res.status(201).json(response);
  } catch (error) {
    console.error("open shift error", error);
    res.status(500).json({ message: "Ээлж нээхэд алдаа гарлаа" });
  }
});

router.post("/pos/shifts/close", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const shiftId = String(req.body.shiftId || "").trim();
    const closingCash = Number(req.body.closingCash);
    const note = String(req.body.note || "").trim().slice(0, 500) || null;

    if (!shiftId) {
      return res.status(400).json({ message: "shiftId шаардлагатай" });
    }
    if (!Number.isFinite(closingCash) || closingCash < 0) {
      return res.status(400).json({ message: "closingCash 0 буюу түүнээс дээш байх ёстой" });
    }

    const shift = await prisma.posShift.findUnique({
      where: { id: shiftId },
      include: {
        cashier: { select: { id: true, email: true } },
      },
    });
    if (!shift) {
      return res.status(404).json({ message: "Ээлж олдсонгүй" });
    }
    if (shift.cashierId !== actor.id && actor.role !== "ADMIN") {
      return res.status(403).json({ message: "Зөвхөн өөрийн ээлжийг хааж болно" });
    }
    if (shift.status === ShiftStatus.CLOSED) {
      return res.status(409).json({ message: "Ээлж аль хэдийн хаагдсан" });
    }

    // Calculate expected cash from CASH sales in this shift
    const cashSales = await prisma.posSale.findMany({
      where: { shiftId: shift.id, status: PosSaleStatus.COMPLETED },
      select: { grandTotal: true, paymentMethod: true },
    });
    // Sum up all CASH payment totals. For mixed payments we'd need breakdown, 
    // but for simplicity, when paymentMethod is CASH, add grandTotal.
    const expectedCashFromSales = cashSales
      .filter((s) => s.paymentMethod === "CASH")
      .reduce((sum, s) => sum + Number(s.grandTotal), 0);
    const expectedCash = Number(shift.openingCash) + expectedCashFromSales;
    const cashDifference = roundMoney(closingCash - expectedCash);

    const updatedShift = await prisma.posShift.update({
      where: { id: shiftId },
      data: {
        status: ShiftStatus.CLOSED,
        closingCash,
        expectedCash,
        cashDifference,
        note,
        closedAt: new Date(),
      },
      include: {
        cashier: { select: { id: true, email: true } },
      },
    });

    const response = {
      id: updatedShift.id,
      cashierId: updatedShift.cashierId,
      cashierName: updatedShift.cashier.email,
      branchId: updatedShift.branchId,
      openedAt: updatedShift.openedAt.toISOString(),
      closedAt: updatedShift.closedAt?.toISOString() ?? null,
      openingCash: Number(updatedShift.openingCash),
      closingCash: Number(updatedShift.closingCash),
      expectedCash: Number(updatedShift.expectedCash),
      cashDifference: Number(updatedShift.cashDifference),
      note: updatedShift.note,
      status: updatedShift.status,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("close shift error", error);
    res.status(500).json({ message: "Ээлж хаахад алдаа гарлаа" });
  }
});

router.get("/pos/shifts/current", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const shift = await prisma.posShift.findFirst({
      where: { cashierId: actor.id, status: ShiftStatus.OPEN },
      include: {
        cashier: { select: { id: true, email: true } },
      },
    });

    if (!shift) {
      return res.status(200).json(null);
    }

    const response = {
      id: shift.id,
      cashierId: shift.cashierId,
      cashierName: shift.cashier.email,
      branchId: shift.branchId,
      openedAt: shift.openedAt.toISOString(),
      closedAt: null,
      openingCash: Number(shift.openingCash),
      closingCash: null,
      expectedCash: 0,
      status: shift.status,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("get current shift error", error);
    res.status(500).json({ message: "Ээлж мэдээлэл авахад алдаа гарлаа" });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
 * POS Products — product list for the POS grid
 * GET /pos/products?branchId=<uuid>
 * ─────────────────────────────────────────────────────────────────────── */


router.get("/pos/shifts/history", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const branchId = String(req.query.branchId || "").trim();
    const statusRaw = String(req.query.status || "CLOSED").trim().toUpperCase();
    const status =
      statusRaw === "OPEN" || statusRaw === "CLOSED" ? statusRaw : "";
    const fromRaw = String(req.query.from || "").trim();
    const toRaw = String(req.query.to || "").trim();
    const parsedLimit = Number(req.query.limit);
    const limit = Math.min(
      100,
      Math.max(1, Number.isFinite(parsedLimit) ? Math.floor(parsedLimit) : 30),
    );

    const from = fromRaw ? new Date(fromRaw) : null;
    const to = toRaw ? new Date(toRaw) : null;
    if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
      return res.status(400).json({ message: "from, to буруу огноо формат" });
    }

    const where: Prisma.PosShiftWhereInput = {};
    if (status) where.status = status as ShiftStatus;

    if (branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { id: true, organizationId: true },
      });
      if (!branch) {
        return res.status(404).json({ message: "Салбар олдсонгүй" });
      }
      if (!isAdminActor(actor) && !(await hasOrgMembership(actor.id, branch.organizationId))) {
        return res.status(403).json({ message: "Энэ байгууллагын хаалтын түүх харах эрхгүй" });
      }
      where.branchId = branchId;
    } else if (!isAdminActor(actor)) {
      if (actor.organizationId) where.organizationId = actor.organizationId;
      else where.cashierId = actor.id;
    }

    if (status === "CLOSED") {
      const closedAt: Prisma.DateTimeNullableFilter = { not: null };
      if (from) closedAt.gte = from;
      if (to) closedAt.lte = to;
      where.closedAt = closedAt;
    } else if (from || to) {
      where.openedAt = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    }

    const shifts = await prisma.posShift.findMany({
      where,
      take: limit,
      orderBy: status === "CLOSED" ? { closedAt: "desc" } : { openedAt: "desc" },
      include: {
        cashier: { select: { id: true, email: true } },
        branch: { select: { id: true, name: true } },
        register: { select: { id: true, name: true } },
        sales: {
          where: { status: PosSaleStatus.COMPLETED },
          select: { grandTotal: true, paymentMethod: true },
        },
      },
    });

    res.status(200).json({
      shifts: shifts.map((shift) => ({
        ...toShiftResponse(shift),
        ...summarizeShiftSales(shift.sales),
      })),
    });
  } catch (error) {
    console.error("get shift history error", error);
    res.status(500).json({ message: "Ээлжийн хаалтын түүх авахад алдаа гарлаа" });
  }
});

export default router;
