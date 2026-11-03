import rateLimit from "express-rate-limit";
import {
  Router,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";
import { prisma, OrderStatus } from "@mgl/database";
import { requireAuth, type AuthPayload } from "../../middleware/auth";
import { hasWarehouseAccess } from "../../services/warehouse-access.service";
import {
  createRetailCheckout,
  createRetailInvoice,
  checkRetailPayment,
  retailOrderInclude,
} from "../../services/warehouse-retail.service";
import { WarehouseRetailError } from "../../services/warehouse-retail.policy";
import { StockMinuConfigurationError } from "../../services/stock-minu-payment.service";

const router: ExpressRouter = Router();
const checkoutLimit = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
const invoiceLimit = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
const actor = (req: Request) => (req as Request & { user: AuthPayload }).user;
function failure(error: unknown, res: Response) {
  const known =
    error instanceof WarehouseRetailError ||
    error instanceof StockMinuConfigurationError;
  if (!known) console.error("[warehouse retail]", error);
  return res
    .status(
      error instanceof WarehouseRetailError ? error.status : known ? 409 : 502,
    )
    .json({
      message: known
        ? error.message
        : "Хүсэлтийг гүйцэтгэж чадсангүй. Дахин оролдоно уу.",
    });
}
router.post(
  "/store/shared-store/checkout",
  checkoutLimit,
  requireAuth,
  async (req, res) => {
    try {
      res.setHeader("Cache-Control", "private, no-store");
      return res.json(await createRetailCheckout(actor(req).userId, req.body));
    } catch (error: unknown) {
      return failure(error, res);
    }
  },
);
router.get("/store/shared-store/orders", requireAuth, async (req, res) => {
  try {
    res.setHeader("Cache-Control", "private, no-store");
    return res.json(
      await prisma.warehouseRetailOrder.findMany({
        where: { customerId: actor(req).userId },
        include: retailOrderInclude,
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    );
  } catch (error: unknown) {
    return failure(error, res);
  }
});
router.post(
  "/store/shared-store/orders/:id/invoice",
  invoiceLimit,
  requireAuth,
  async (req, res) => {
    try {
      return res.json(
        await createRetailInvoice(req.params.id, actor(req).userId),
      );
    } catch (error: unknown) {
      return failure(error, res);
    }
  },
);
router.post(
  "/store/shared-store/orders/:id/check",
  requireAuth,
  async (req, res) => {
    try {
      return res.json(
        await checkRetailPayment(req.params.id, actor(req).userId),
      );
    } catch (error: unknown) {
      return failure(error, res);
    }
  },
);
router.get("/warehouse-retail-orders", requireAuth, async (req, res) => {
  try {
    const warehouseId = String(req.query.warehouseId || "");
    if (!warehouseId || !(await hasWarehouseAccess(actor(req), warehouseId)))
      return res.status(403).json({ message: "Агуулахын эрх олдсонгүй." });
    res.setHeader("Cache-Control", "private, no-store");
    return res.json(
      await prisma.warehouseRetailOrder.findMany({
        where: { warehouseId, paymentStatus: "PAID" },
        include: retailOrderInclude,
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    );
  } catch (error: unknown) {
    return failure(error, res);
  }
});
const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  CONFIRMED: "PREPARING",
  PREPARING: "PREPARED",
  PREPARED: "SHIPPING",
  SHIPPING: "COMPLETED",
};
router.patch(
  "/warehouse-retail-orders/:id/status",
  requireAuth,
  async (req, res) => {
    try {
      const order = await prisma.warehouseRetailOrder.findUnique({
        where: { id: req.params.id },
      });
      if (!order || !(await hasWarehouseAccess(actor(req), order.warehouseId)))
        return res.status(404).json({ message: "Захиалга олдсонгүй." });
      const status = nextStatus[order.status];
      if (!status || order.paymentStatus !== "PAID" || order.fulfillmentIssue)
        return res
          .status(409)
          .json({ message: "Энэ захиалгын төлөвийг өөрчлөх боломжгүй." });
      const changed = await prisma.warehouseRetailOrder.updateMany({
        where: { id: order.id, status: order.status, paymentStatus: "PAID" },
        data: { status },
      });
      if (!changed.count)
        return res
          .status(409)
          .json({ message: "Захиалга өөрчлөгдсөн. Жагсаалтаа шинэчилнэ үү." });
      return res.json({ status });
    } catch (error: unknown) {
      return failure(error, res);
    }
  },
);
export default router;
