import { Router, type Router as ExpressRouter } from "express";
import { prisma, AuditAction, InventoryReason, PaymentMethod, PosPaymentStatus, PosQPayStatus, PosActivationStatus, ShiftStatus, PosSaleStatus, CashDrawerEventType } from "@mgl/database";
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
  type CreateSaleBody, type PushEcrPurchaseResponse,
  toApiError,
} from "./_shared";
import {
  calculateExpectedCash,
  summarizeShiftSales,
  type ShiftSaleAccountingInput,
} from "./shift-accounting";

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

type ShiftAccountingClient = Pick<
  Prisma.TransactionClient,
  "posSale" | "cardPaymentAttempt" | "qPayInvoice" | "posCashDrawerEvent"
>;

async function loadShiftAccountingSales(
  client: ShiftAccountingClient,
  shiftIds: string[],
) {
  const result = new Map<string, ShiftSaleAccountingInput[]>();
  if (shiftIds.length === 0) return result;

  const sales = await client.posSale.findMany({
    where: {
      shiftId: { in: shiftIds },
      status: PosSaleStatus.COMPLETED,
    },
    select: {
      id: true,
      shiftId: true,
      receiptNo: true,
      grandTotal: true,
      paymentMethod: true,
      paymentBreakdown: true,
      loyalty: { select: { redeemedPoints: true } },
      creditSale: { select: { principalAmount: true } },
    },
  });

  const receiptNumbers = sales.map((sale) => sale.receiptNo);
  const [cardAttempts, qpayInvoices] = receiptNumbers.length
    ? await Promise.all([
        client.cardPaymentAttempt.findMany({
          where: { saleReference: { in: receiptNumbers } },
          select: { saleReference: true, amount: true },
        }),
        client.qPayInvoice.findMany({
          where: { saleReference: { in: receiptNumbers } },
          select: { saleReference: true, amount: true },
        }),
      ])
    : [[], []];

  const cardByReceipt = new Map<string, number[]>();
  for (const attempt of cardAttempts) {
    const key = attempt.saleReference || "";
    cardByReceipt.set(key, [...(cardByReceipt.get(key) || []), Number(attempt.amount)]);
  }
  const qpayByReceipt = new Map<string, number[]>();
  for (const invoice of qpayInvoices) {
    const key = invoice.saleReference || "";
    qpayByReceipt.set(key, [...(qpayByReceipt.get(key) || []), Number(invoice.amount)]);
  }

  for (const sale of sales) {
    const accountingSale: ShiftSaleAccountingInput = {
      grandTotal: Number(sale.grandTotal),
      paymentMethod: sale.paymentMethod,
      paymentBreakdown: sale.paymentBreakdown,
      redeemedPoints: sale.loyalty?.redeemedPoints || 0,
      cardPayments: cardByReceipt.get(sale.receiptNo) || [],
      qpayPayments: qpayByReceipt.get(sale.receiptNo) || [],
      creditAmount: Number(sale.creditSale?.principalAmount || 0),
    };
    result.set(sale.shiftId, [...(result.get(sale.shiftId) || []), accountingSale]);
  }

  return result;
}

async function getCashDrawerEventTotals(
  client: Pick<Prisma.TransactionClient, "posCashDrawerEvent">,
  shiftId: string,
) {
  const events = await client.posCashDrawerEvent.findMany({
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
  const [salesByShift, events] = await Promise.all([
    loadShiftAccountingSales(prisma, [shift.id]),
    prisma.posCashDrawerEvent.findMany({
      where: { shiftId: shift.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const cashSalesTotal = summarizeShiftSales(salesByShift.get(shift.id) || []).cashSales;
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
  const expectedCash = calculateExpectedCash({
    openingCash: Number(shift.openingCash),
    cashSales: cashSalesTotal,
    paidIn: totals.paidIn,
    paidOut: totals.paidOut,
  });
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

    if (!isAdminActor(actor)) {
      const membership = await prisma.organizationMember.findFirst({
        where: { userId: actor.id, organizationId: branch.organizationId, isActive: true },
        select: { id: true },
      });
      if (!membership) {
        return res.status(403).json({ message: "Энэ байгууллагад хандах эрхгүй" });
      }
    }

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Serialize concurrent shift-open requests for this cashier and register.
      await tx.$queryRaw`
        SELECT "id"
        FROM "User"
        WHERE "id" = ${actor.id}
        FOR UPDATE
      `;
      if (registerId) {
        await tx.$queryRaw`
          SELECT "id"
          FROM "PosRegister"
          WHERE "id" = ${registerId}
          FOR UPDATE
        `;
      }

      const existingOpen = await tx.posShift.findFirst({
        where: {
          status: ShiftStatus.OPEN,
          OR: [
            { cashierId: actor.id },
            ...(registerId ? [{ registerId }] : []),
          ],
        },
        select: { id: true, cashierId: true, registerId: true },
      });
      if (existingOpen) {
        return { existingOpen, shift: null };
      }

      const shift = await tx.posShift.create({
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
      return { existingOpen: null, shift };
    });

    if (result.existingOpen) {
      const message =
        result.existingOpen.cashierId === actor.id
          ? "Танд нээлттэй ээлж аль хэдийн байна. Эхлээд хаана уу."
          : "Энэ POS касс дээр өөр кассчны нээлттэй ээлж байна.";
      return res.status(409).json({ message });
    }

    res.status(201).json(toShiftResponse(result.shift));
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

    const shiftForAccess = await prisma.posShift.findUnique({
      where: { id: shiftId },
      select: { id: true, cashierId: true },
    });
    if (!shiftForAccess) {
      return res.status(404).json({ message: "Ээлж олдсонгүй" });
    }
    if (shiftForAccess.cashierId !== actor.id && !isAdminActor(actor)) {
      return res.status(403).json({ message: "Зөвхөн өөрийн ээлжийг хааж болно" });
    }

    const updatedShift = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // A sale transaction locks the same row before inserting. This guarantees
      // the closing total either includes that sale or the sale sees CLOSED.
      await tx.$queryRaw`
        SELECT "id"
        FROM "PosShift"
        WHERE "id" = ${shiftId}
        FOR UPDATE
      `;

      const shift = await tx.posShift.findUnique({
        where: { id: shiftId },
        include: {
          cashier: { select: { id: true, email: true } },
          branch: { select: { id: true, name: true } },
          register: { select: { id: true, name: true } },
        },
      });
      if (!shift) throw toApiError(404, "Ээлж олдсонгүй");
      if (shift.status !== ShiftStatus.OPEN) {
        throw toApiError(409, "Ээлж аль хэдийн хаагдсан");
      }

      const [salesByShift, drawerTotals] = await Promise.all([
        loadShiftAccountingSales(tx, [shift.id]),
        getCashDrawerEventTotals(tx, shift.id),
      ]);
      const salesSummary = summarizeShiftSales(salesByShift.get(shift.id) || []);
      const expectedCash = calculateExpectedCash({
        openingCash: Number(shift.openingCash),
        cashSales: salesSummary.cashSales,
        paidIn: drawerTotals.paidIn,
        paidOut: drawerTotals.paidOut,
      });
      const cashDifference = roundMoney(closingCash - expectedCash);

      return tx.posShift.update({
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
    });

    res.status(200).json(toShiftResponse(updatedShift));
  } catch (error) {
    const known = error as ApiError;
    if (known?.status && known?.message) {
      return res.status(known.status).json({ message: known.message });
    }
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
      },
    });
    const shiftIds = shifts.map((shift: { id: string }) => shift.id);
    const [salesByShift, drawerEvents] = await Promise.all([
      loadShiftAccountingSales(prisma, shiftIds),
      shiftIds.length
        ? prisma.posCashDrawerEvent.findMany({
            where: { shiftId: { in: shiftIds } },
            select: { shiftId: true, type: true, amount: true },
          })
        : [],
    ]);
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
          ...summarizeShiftSales(salesByShift.get(shift.id) || []),
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
