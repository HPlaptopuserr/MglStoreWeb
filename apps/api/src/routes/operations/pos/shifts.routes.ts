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


export default router;
