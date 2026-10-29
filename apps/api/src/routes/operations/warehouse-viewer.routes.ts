import {
  Router,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";
import { prisma } from "@mgl/database";
import { Permission } from "@mgl/types";
import {
  requireAuth,
  requirePlatformPermission,
  type AuthPayload,
} from "../../middleware/auth";
import {
  WarehouseViewerError,
  parseViewerPhone,
} from "../../services/warehouse-viewer.policy";
import {
  assertActiveWarehouseViewerActor,
  getWarehouseInvestorReport,
  warehouseViewerSession,
} from "../../services/warehouse-viewer.service";

const router: ExpressRouter = Router();
const actor = (req: Request) => (req as Request & { user: AuthPayload }).user;
const handle =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  async (req: Request, res: Response) => {
    try {
      res.setHeader("Cache-Control", "private, no-store");
      await assertActiveWarehouseViewerActor(actor(req));
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
const manage = requirePlatformPermission(Permission.MANAGE_WAREHOUSES);
async function assertManagedWarehouse(id: string) {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id, type: "CENTRAL", deletedAt: null },
    select: { id: true },
  });
  if (!warehouse) throw new WarehouseViewerError("Дэлгүүр олдсонгүй.", 404);
}

router.get(
  "/warehouse-viewer/session",
  requireAuth,
  handle(async (req, res) => {
    res.json(await warehouseViewerSession(actor(req)));
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
  manage,
  handle(async (req, res) => {
    const warehouseId = String(req.params.id);
    await assertManagedWarehouse(warehouseId);
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
          },
        },
      },
    });
    res.json(
      viewers.map(({ user, ...viewer }) => ({
        ...viewer,
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
  manage,
  handle(async (req, res) => {
    const warehouseId = String(req.params.id);
    await assertManagedWarehouse(warehouseId);
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
router.delete(
  "/warehouses/:id/viewers/:userId",
  requireAuth,
  manage,
  handle(async (req, res) => {
    const warehouseId = String(req.params.id),
      userId = String(req.params.userId);
    await assertManagedWarehouse(warehouseId);
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
