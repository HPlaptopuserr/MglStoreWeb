import rateLimit from "express-rate-limit";
import investmentTopUpRoutes from "./warehouse-investment-topup.routes";
import {
  confirmedBankDecision,
  readInvestorBankAccount,
  savedBankAccountSelection,
  serializeInvestorBankAccount,
} from "../../services/warehouse-investor-bank-account.service";
import { assertActiveWarehouseViewerActor } from "../../services/warehouse-viewer-access.service";
import {
  dividendDecisionService,
  serializeDividendDecision,
} from "../../services/warehouse-dividend-decision.service";
import { currentWarehouseMonth } from "@mgl/types";
import { recordMonthlyDividend } from "../../services/warehouse-dividend.service";
import {
  warehouseViewerSession,
  assertWarehouseViewerManagement,
  assertWarehouseReportAccess,
} from "../../services/warehouse-viewer-access.service";
import {
  recordWarehouseInvestment,
  readWarehouseInvestmentSummary,
} from "../../services/warehouse-investment.service";
import {
  Router,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";
import { prisma } from "@mgl/database";
import { requireAuth, type AuthPayload } from "../../middleware/auth";
import {
  WarehouseViewerError,
  parseViewerPhone,
} from "../../services/warehouse-viewer.policy";
import { getWarehouseInvestorReport } from "../../services/warehouse-viewer.service";

const router: ExpressRouter = Router();
router.use(investmentTopUpRoutes);
const actor = (req: Request) => (req as Request & { user: AuthPayload }).user;
const handle =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  async (req: Request, res: Response) => {
    try {
      res.setHeader("Cache-Control", "private, no-store");
      await fn(req, res);
    } catch (error) {
      if (error instanceof WarehouseViewerError)
        return res.status(error.status).json({ message: error.message });
      console.error("[warehouse-viewer]", error);
      return res.status(500).json({
        message: "Дэлгүүрийн мэдээллийг ачаалж чадсангүй. Дахин оролдоно уу.",
      });
    }
  };

const decisionLimiter = rateLimit({
  windowMs: 60000,
  limit: 60,
  keyGenerator: (req) => actor(req).userId,
  message: {
    message:
      "Баталгаажуулах хүсэлт олширсон байна. Түр хүлээгээд дахин оролдоно уу.",
  },
});
router.post(
  "/warehouse-viewer/warehouses/:id/dividends/:dividendId/verification",
  requireAuth,
  decisionLimiter,
  handle(async (req, res) => {
    res.json(
      await dividendDecisionService.start(
        actor(req),
        String(req.params.id),
        String(req.params.dividendId),
        req.body,
      ),
    );
  }),
);
router.post(
  "/warehouse-viewer/warehouses/:id/dividend-decisions/:decisionId/confirm",
  requireAuth,
  decisionLimiter,
  handle(async (req, res) => {
    res.json(
      await dividendDecisionService.confirm(
        actor(req),
        String(req.params.id),
        String(req.params.decisionId),
      ),
    );
  }),
);
router.get(
  "/warehouse-viewer/bank-account",
  requireAuth,
  handle(async (req, res) => {
    const user = actor(req);
    await assertActiveWarehouseViewerActor(user);
    res.json(await readInvestorBankAccount(user.userId));
  }),
);
router.get(
  "/warehouse-viewer/session",
  requireAuth,
  handle(async (req, res) => {
    res.json(await warehouseViewerSession(actor(req)));
  }),
);
router.get(
  "/warehouse-viewer/warehouses/:id/investment",
  requireAuth,
  handle(async (req, res) => {
    const user = actor(req),
      warehouseId = String(req.params.id);
    const { isOperator } = await assertWarehouseReportAccess(user, warehouseId);
    res.json(
      await readWarehouseInvestmentSummary(
        prisma,
        warehouseId,
        user.userId,
        isOperator,
      ),
    );
  }),
);
router.get(
  "/warehouse-viewer/warehouses/:id/report",
  requireAuth,
  handle(async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    res.json(
      await getWarehouseInvestorReport(
        actor(req),
        String(req.params.id),
        req.query,
      ),
    );
  }),
);
router.get(
  "/warehouses/:id/viewers",
  requireAuth,
  handle(async (req, res) => {
    const warehouseId = String(req.params.id);
    await assertWarehouseViewerManagement(actor(req), warehouseId);
    const viewers = await prisma.warehouseViewer.findMany({
      where: { warehouseId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        createdAt: true,
        user: {
          select: {
            email: true,
            profile: { select: { fullName: true, phoneNumber: true } },
            warehouseDividends: {
              where: { warehouseId, decision: { is: confirmedBankDecision } },
              orderBy: { decision: { confirmedAt: "desc" } },
              take: 1,
              select: { decision: { select: savedBankAccountSelection } },
            },
          },
        },
      },
    });
    const investments = await prisma.warehouseInvestment.findMany({
      where: {
        warehouseId,
        userId: { in: viewers.map((viewer) => viewer.userId) },
      },
      select: { userId: true, amount: true, version: true, updatedAt: true },
    });
    const investmentByUser = new Map(
      investments.map((record) => [record.userId, record]),
    );
    const month = currentWarehouseMonth();
    const dividends = await prisma.warehouseInvestorDividend.findMany({
      where: {
        warehouseId,
        month,
        userId: { in: viewers.map((viewer) => viewer.userId) },
      },
      select: {
        id: true,
        userId: true,
        amount: true,
        version: true,
        updatedAt: true,
        decision: true,
      },
    });
    const dividendByUser = new Map(
      dividends.map((record) => [record.userId, record]),
    );
    res.json(
      viewers.map(({ user, ...viewer }) => ({
        ...viewer,
        bankAccount: serializeInvestorBankAccount(
          user.warehouseDividends[0]?.decision,
        ),
        monthlyDividend: {
          id: dividendByUser.get(viewer.userId)?.id,
          decision: dividendByUser.get(viewer.userId)?.decision
            ? serializeDividendDecision(
                dividendByUser.get(viewer.userId)!.decision!,
              )
            : null,
          month,
          amount:
            dividendByUser.get(viewer.userId)?.amount.toFixed(2) ?? "0.00",
          version: dividendByUser.get(viewer.userId)?.version ?? 0,
          updatedAt:
            dividendByUser.get(viewer.userId)?.updatedAt.toISOString() ?? null,
        },
        investmentAmount:
          investmentByUser.get(viewer.userId)?.amount.toFixed(2) ?? "0.00",
        investmentVersion: investmentByUser.get(viewer.userId)?.version ?? 0,
        investmentUpdatedAt:
          investmentByUser.get(viewer.userId)?.updatedAt.toISOString() ?? null,
        fullName: user.profile?.fullName || user.email,
        email: user.email,
        phoneNumber: user.profile?.phoneNumber || null,
      })),
    );
  }),
);
router.post(
  "/warehouses/:id/viewers",
  requireAuth,
  handle(async (req, res) => {
    const warehouseId = String(req.params.id);
    await assertWarehouseViewerManagement(actor(req), warehouseId);
    const phone = parseViewerPhone(
      (req.body as { phone?: unknown } | undefined)?.phone,
    );
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        profile: {
          phoneNumber: { in: [phone, `+976${phone}`, `976${phone}`] },
        },
      },
      select: { id: true },
      take: 2,
    });
    if (!users.length)
      throw new WarehouseViewerError(
        "Энэ дугаартай хэрэглэгч олдсонгүй. Эхлээд MGL Store-д өөрийн хаягаар бүртгүүлсэн байх шаардлагатай.",
        404,
      );
    if (users.length > 1)
      throw new WarehouseViewerError(
        "Энэ дугаарт давхардсан бүртгэл байна. Хэрэглэгчийн бүртгэлийг шалгана уу.",
        409,
      );
    const viewer = await prisma.$transaction(async (tx) => {
      const result = await tx.warehouseViewer.upsert({
        where: { warehouseId_userId: { warehouseId, userId: users[0].id } },
        update: {},
        create: {
          warehouseId,
          userId: users[0].id,
          grantedById: actor(req).userId,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: actor(req).userId,
          action: "WAREHOUSE_VIEWER_GRANTED",
          meta: { warehouseId, targetUserId: users[0].id, role: "VIEWER" },
        },
      });
      return result;
    });
    res
      .status(201)
      .json({ id: viewer.id, message: "Зөвхөн мэдээлэл харах эрх олголоо." });
  }),
);
router.patch(
  "/warehouses/:id/viewers/:userId/investment",
  requireAuth,
  handle(async (req, res) => {
    const result = await recordWarehouseInvestment(
      actor(req),
      String(req.params.id),
      String(req.params.userId),
      req.body,
    );
    res.json({
      amount: result.amount.toFixed(2),
      version: result.version,
      updatedAt: result.updatedAt.toISOString(),
    });
  }),
);
router.patch(
  "/warehouses/:id/viewers/:userId/dividend",
  requireAuth,
  handle(async (req, res) => {
    const result = await recordMonthlyDividend(
      actor(req),
      String(req.params.id),
      String(req.params.userId),
      req.body,
    );
    res.json({
      month: result.month,
      amount: result.amount.toFixed(2),
      version: result.version,
      updatedAt: result.updatedAt.toISOString(),
    });
  }),
);
router.delete(
  "/warehouses/:id/viewers/:userId",
  requireAuth,
  handle(async (req, res) => {
    const warehouseId = String(req.params.id),
      userId = String(req.params.userId);
    await assertWarehouseViewerManagement(actor(req), warehouseId);
    await prisma.$transaction(async (tx) => {
      const removed = await tx.warehouseViewer.deleteMany({
        where: { warehouseId, userId },
      });
      if (removed.count)
        await tx.auditLog.create({
          data: {
            userId: actor(req).userId,
            action: "WAREHOUSE_VIEWER_REVOKED",
            meta: { warehouseId, targetUserId: userId, role: "VIEWER" },
          },
        });
    });
    res.status(204).end();
  }),
);

export default router;
