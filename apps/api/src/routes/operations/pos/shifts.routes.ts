import { Router, type Router as ExpressRouter } from "express";
import { prisma, AuditAction, InventoryReason, PaymentMethod, PosPaymentStatus, PosQPayStatus, PosActivationStatus, ShiftStatus, PosSaleStatus, CashDrawerEventType } from "@mgl/database";
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

const normalizeCashCountForResponse = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const source = item as Record<string, unknown>;
      const denomination = Number(source.denomination);
      const count = Math.max(0, Math.floor(Number(source.count) || 0));
      if (!Number.isFinite(denomination) || denomination <= 0) return null;
      return {
        denomination,
        count,
        total: roundMoney(denomination * count),
      };
    })
    .filter(Boolean);
};

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
  cashCount: normalizeCashCountForResponse(shift.cashCount),
  cashCountedAt: shift.cashCountedAt?.toISOString?.() ?? null,
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

const parseCashCountInput = (value: unknown) => {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value)) {
    throw new Error("cashCount массив байх ёстой");
  }

  const counts = value
    .map((item) => {
      const source = item as Record<string, unknown>;
      const denomination = Number(source.denomination);
      const count = Math.max(0, Math.floor(Number(source.count) || 0));
      if (!Number.isFinite(denomination) || denomination <= 0) return null;
      return {
        denomination,
        count,
        total: roundMoney(denomination * count),
      };
    })
    .filter((item): item is { denomination: number; count: number; total: number } => Boolean(item));

  const total = roundMoney(counts.reduce((sum, item) => sum + item.total, 0));
  return { counts, total };
};

const mapCashDrawerEvent = (event: any) => ({
  id: event.id,
  organizationId: event.organizationId,
  branchId: event.branchId,
  registerId: event.registerId ?? null,
  shiftId: event.shiftId,
  cashierId: event.cashierId,
  type: event.type,
  amount: Number(event.amount),
  note: event.note ?? null,
  createdAt: event.createdAt.toISOString(),
});

async function getCashDrawerEventTotals(shiftId: string) {
  const events = await prisma.posCashDrawerEvent.findMany({
    where: { shiftId },
    select: { type: true, amount: true },
  });
  return events.reduce<{ paidIn: number; paidOut: number }>(
    (summary: { paidIn: number; paidOut: number }, event: { type: CashDrawerEventType; amount: unknown }) => {
      const amount = Number(event.amount);
      if (!Number.isFinite(amount)) return summary;
      if (event.type === CashDrawerEventType.PAID_IN) summary.paidIn += amount;
      if (event.type === CashDrawerEventType.PAID_OUT) summary.paidOut += amount;
      return summary;
    },
    { paidIn: 0, paidOut: 0 },
  );
}

async function buildCashDrawerSummary(shift: any) {
  const [cashSales, events] = await Promise.all([
    prisma.posSale.findMany({
      where: { shiftId: shift.id, status: PosSaleStatus.COMPLETED, paymentMethod: "CASH" },
      select: { grandTotal: true },
    }),
    prisma.posCashDrawerEvent.findMany({
      where: { shiftId: shift.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const cashSalesTotal = roundMoney(
    cashSales.reduce((sum: number, sale: { grandTotal: unknown }) => sum + Number(sale.grandTotal), 0),
  );
  const totals = events.reduce<{ paidIn: number; paidOut: number }>(
    (summary: { paidIn: number; paidOut: number }, event: { type: CashDrawerEventType; amount: unknown }) => {
      const amount = Number(event.amount);
      if (!Number.isFinite(amount)) return summary;
      if (event.type === CashDrawerEventType.PAID_IN) summary.paidIn += amount;
      if (event.type === CashDrawerEventType.PAID_OUT) summary.paidOut += amount;
      return summary;
    },
    { paidIn: 0, paidOut: 0 },
  );
  const expectedCash = roundMoney(
    Number(shift.openingCash) + cashSalesTotal + totals.paidIn - totals.paidOut,
  );
  const countedCash = shift.closingCash === null ? null : Number(shift.closingCash);

  return {
    shift: toShiftResponse(shift),
    events: events.map(mapCashDrawerEvent),
    openingCash: Number(shift.openingCash),
    cashSales: cashSalesTotal,
    paidIn: roundMoney(totals.paidIn),
    paidOut: roundMoney(totals.paidOut),
    expectedCash,
    countedCash,
    cashDifference: countedCash === null ? null : roundMoney(countedCash - expectedCash),
    cashCount: normalizeCashCountForResponse(shift.cashCount),
  };
}

router.post("/pos/shifts/open", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const branchId = String(req.body.branchId || "").trim();
    const registerId = String(req.body.registerId || "").trim() || null;
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

    if (registerId) {
      const register = await prisma.posRegister.findUnique({
        where: { id: registerId },
        select: { id: true, branchId: true, organizationId: true, isActive: true, activationStatus: true },
      });
      if (!register) {
        return res.status(404).json({ message: "POS register олдсонгүй" });
      }
      if (register.branchId !== branchId || register.organizationId !== branch.organizationId) {
        return res.status(400).json({ message: "POS register салбартай зөрүүтэй байна" });
      }
      if (!register.isActive || register.activationStatus !== PosActivationStatus.APPROVED) {
        return res.status(403).json({ message: "POS register идэвхгүй эсвэл батлагдаагүй байна" });
      }
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
        registerId,
        cashierId: actor.id,
        openingCash,
        status: ShiftStatus.OPEN,
      },
      include: {
        cashier: { select: { id: true, email: true } },
        branch: { select: { id: true, name: true } },
        register: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(toShiftResponse(shift));
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
    const note = String(req.body.note || "").trim().slice(0, 500) || null;
    let parsedCashCount: ReturnType<typeof parseCashCountInput> = null;
    try {
      parsedCashCount = parseCashCountInput(req.body.cashCount);
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : "cashCount буруу байна" });
    }
    const closingCash = parsedCashCount ? parsedCashCount.total : Number(req.body.closingCash);

    if (!shiftId) {
      return res.status(400).json({ message: "Ээлжийн ID шаардлагатай" });
    }
    if (!Number.isFinite(closingCash) || closingCash < 0) {
      return res.status(400).json({ message: "closingCash 0 буюу түүнээс дээш байх ёстой" });
    }

    const shift = await prisma.posShift.findUnique({
      where: { id: shiftId },
      include: {
        cashier: { select: { id: true, email: true } },
        branch: { select: { id: true, name: true } },
        register: { select: { id: true, name: true } },
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
      .filter((s: { paymentMethod: string | null }) => s.paymentMethod === "CASH")
      .reduce((sum: number, s: { grandTotal: unknown }) => sum + Number(s.grandTotal), 0);
    const drawerTotals = await getCashDrawerEventTotals(shift.id);
    const expectedCash = roundMoney(
      Number(shift.openingCash) + expectedCashFromSales + drawerTotals.paidIn - drawerTotals.paidOut,
    );
    const cashDifference = roundMoney(closingCash - expectedCash);

    const updatedShift = await prisma.posShift.update({
      where: { id: shiftId },
      data: {
        status: ShiftStatus.CLOSED,
        closingCash,
        expectedCash,
        cashDifference,
        cashCount: parsedCashCount?.counts ?? undefined,
        cashCountedAt: parsedCashCount ? new Date() : undefined,
        note,
        closedAt: new Date(),
      },
      include: {
        cashier: { select: { id: true, email: true } },
        branch: { select: { id: true, name: true } },
        register: { select: { id: true, name: true } },
      },
    });

    res.status(200).json(toShiftResponse(updatedShift));
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
        branch: { select: { id: true, name: true } },
        register: { select: { id: true, name: true } },
      },
    });

    if (!shift) {
      return res.status(200).json(null);
    }

    res.status(200).json(toShiftResponse(shift));
  } catch (error) {
    console.error("get current shift error", error);
    res.status(500).json({ message: "Ээлж мэдээлэл авахад алдаа гарлаа" });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
 * POS Products — product list for the POS grid
 * GET /pos/products?branchId=<uuid>
 * ─────────────────────────────────────────────────────────────────────── */


router.get("/pos/shifts/:shiftId/drawer", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const shiftId = String(req.params.shiftId || "").trim();
    if (!shiftId) {
      return res.status(400).json({ message: "Ээлжийн ID шаардлагатай" });
    }

    const shift = await prisma.posShift.findUnique({
      where: { id: shiftId },
      include: {
        cashier: { select: { id: true, email: true } },
        branch: { select: { id: true, name: true } },
        register: { select: { id: true, name: true } },
      },
    });
    if (!shift) {
      return res.status(404).json({ message: "Ээлж олдсонгүй" });
    }
    if (
      shift.cashierId !== actor.id &&
      !isAdminActor(actor) &&
      !(await hasOrgMembership(actor.id, shift.organizationId))
    ) {
      return res.status(403).json({ message: "Энэ шургуулгын тайлан харах эрхгүй" });
    }

    return res.json(await buildCashDrawerSummary(shift));
  } catch (error) {
    console.error("get cash drawer summary error", error);
    return res.status(500).json({ message: "Кассын шургуулгын мэдээлэл авахад алдаа гарлаа" });
  }
});

router.post("/pos/shifts/drawer-events", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const shiftId = String(req.body.shiftId || "").trim();
    const typeRaw = String(req.body.type || "").trim().toUpperCase();
    const note = String(req.body.note || "").trim().slice(0, 500) || null;
    const type =
      typeRaw === CashDrawerEventType.PAID_IN ||
      typeRaw === CashDrawerEventType.PAID_OUT ||
      typeRaw === CashDrawerEventType.OPEN_DRAWER
        ? (typeRaw as CashDrawerEventType)
        : null;
    const amount = type === CashDrawerEventType.OPEN_DRAWER ? 0 : Number(req.body.amount);

    if (!shiftId) {
      return res.status(400).json({ message: "Ээлжийн ID шаардлагатай" });
    }
    if (!type) {
      return res.status(400).json({ message: "Хөдөлгөөний төрөл буруу байна" });
    }
    if (!Number.isFinite(amount) || amount < 0 || (type !== CashDrawerEventType.OPEN_DRAWER && amount <= 0)) {
      return res.status(400).json({ message: "Дүн 0-оос их байх ёстой" });
    }

    const shift = await prisma.posShift.findUnique({
      where: { id: shiftId },
      include: {
        cashier: { select: { id: true, email: true } },
        branch: { select: { id: true, name: true } },
        register: { select: { id: true, name: true } },
      },
    });
    if (!shift) {
      return res.status(404).json({ message: "Ээлж олдсонгүй" });
    }
    if (shift.status !== ShiftStatus.OPEN) {
      return res.status(409).json({ message: "Хаагдсан ээлж дээр шургуулгын хөдөлгөөн хийх боломжгүй" });
    }
    if (
      shift.cashierId !== actor.id &&
      !isAdminActor(actor) &&
      !(await hasOrgMembership(actor.id, shift.organizationId))
    ) {
      return res.status(403).json({ message: "Энэ шургуулга дээр хөдөлгөөн хийх эрхгүй" });
    }

    const event = await prisma.posCashDrawerEvent.create({
      data: {
        organizationId: shift.organizationId,
        branchId: shift.branchId,
        registerId: shift.registerId,
        shiftId: shift.id,
        cashierId: actor.id,
        type,
        amount,
        note,
      },
    });

    return res.status(201).json({
      event: mapCashDrawerEvent(event),
      summary: await buildCashDrawerSummary(shift),
    });
  } catch (error) {
    console.error("create cash drawer event error", error);
    return res.status(500).json({ message: "Кассын шургуулгын хөдөлгөөн бүртгэхэд алдаа гарлаа" });
  }
});

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

    const where: any = {};
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
      const closedAt: any = { not: null };
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
    const drawerEvents = shifts.length
      ? await prisma.posCashDrawerEvent.findMany({
          where: { shiftId: { in: shifts.map((shift: { id: string }) => shift.id) } },
          select: { shiftId: true, type: true, amount: true },
        })
      : [];
    const drawerTotalsByShift = new Map<string, { paidIn: number; paidOut: number }>();
    for (const event of drawerEvents) {
      const totals = drawerTotalsByShift.get(event.shiftId) || { paidIn: 0, paidOut: 0 };
      const amount = Number(event.amount);
      if (event.type === CashDrawerEventType.PAID_IN) totals.paidIn += amount;
      if (event.type === CashDrawerEventType.PAID_OUT) totals.paidOut += amount;
      drawerTotalsByShift.set(event.shiftId, totals);
    }

    res.status(200).json({
      shifts: shifts.map((shift: any) => {
        const drawerTotals = drawerTotalsByShift.get(shift.id) || { paidIn: 0, paidOut: 0 };
        return {
          ...toShiftResponse(shift),
          ...summarizeShiftSales(shift.sales),
          paidIn: roundMoney(drawerTotals.paidIn),
          paidOut: roundMoney(drawerTotals.paidOut),
        };
      }),
    });
  } catch (error) {
    console.error("get shift history error", error);
    res.status(500).json({ message: "Ээлжийн хаалтын түүх авахад алдаа гарлаа" });
  }
});

export default router;
