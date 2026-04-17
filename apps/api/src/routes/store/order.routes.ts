import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma, OrderStatus } from "@mgl/database";

const router: ExpressRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

/* ── Auth helper — vendor or admin with org ─────────── */
const getVendorUser = async (req: Request) => {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId?: string;
      organizationId?: string;
    };
    if (!decoded?.userId || !decoded?.organizationId) return null;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        deletedAt: true,
      },
    });

    if (!user || !user.isActive || user.deletedAt) return null;

    return { ...user, organizationId: decoded.organizationId };
  } catch {
    return null;
  }
};

/* ── Generate 6-digit delivery code ──────────────────── */
function generateDeliveryCode(): string {
  return String(crypto.randomInt(100000, 999999));
}

/* ══════════════════════════════════════════════════════════
   Allowed status transitions:
   CONFIRMED → PREPARED → SHIPPING → COMPLETED
   ══════════════════════════════════════════════════════════ */
const STATUS_FLOW: Record<string, OrderStatus | null> = {
  CONFIRMED: OrderStatus.PREPARED,
  PREPARED: OrderStatus.SHIPPING,
  // SHIPPING → COMPLETED only via delivery code confirm
};

/* ══════════════════════════════════════════════════════════
   GET /vendor/orders
   List org's orders (newest first), with filters.
   Query: ?status=CONFIRMED&page=1&limit=50
   ══════════════════════════════════════════════════════════ */
router.get("/vendor/orders", async (req: Request, res: Response) => {
  try {
    const user = await getVendorUser(req);
    if (!user) return res.status(401).json({ message: "Нэвтэрнэ үү" });

    const { status, page = "1", limit = "50" } = req.query as Record<string, string>;
    const take = Math.min(Number(limit) || 50, 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const where: Record<string, unknown> = {
      organizationId: user.organizationId!,
      deletedAt: null,
      paymentStatus: "PAID",
    };
    if (status && Object.values(OrderStatus).includes(status as OrderStatus)) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        include: {
          items: {
            select: { productName: true, quantity: true, price: true, subtotal: true },
          },
          customer: { select: { id: true, email: true, profile: { select: { fullName: true, phoneNumber: true } } } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return res.json({
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        paymentStatus: o.paymentStatus,
        total: Number(o.total),
        subtotal: Number(o.subtotal),
        phone: o.phone,
        shippingAddress: o.shippingAddress,
        note: o.note,
        deliveryCode: o.deliveryCode,
        createdAt: o.createdAt.toISOString(),
        customer: {
          id: o.customer.id,
          name: o.customer.profile?.fullName || o.customer.email,
          email: o.customer.email,
          phone: o.customer.profile?.phoneNumber || null,
        },
        items: o.items.map((i) => ({
          name: i.productName,
          qty: i.quantity,
          price: Number(i.price),
          subtotal: Number(i.subtotal),
        })),
      })),
      total,
      page: Math.max(Number(page) || 1, 1),
      limit: take,
    });
  } catch (error) {
    console.error("vendor orders error", error);
    return res.status(500).json({ message: "Захиалгын жагсаалт авахад алдаа гарлаа" });
  }
});

/* ══════════════════════════════════════════════════════════
   PATCH /vendor/orders/:orderId/status
   Advance order status: CONFIRMED→PREPARED→SHIPPING
   When moving to SHIPPING, a 6-digit delivery code is generated.
   ══════════════════════════════════════════════════════════ */
router.patch("/vendor/orders/:orderId/status", async (req: Request, res: Response) => {
  try {
    const user = await getVendorUser(req);
    if (!user) return res.status(401).json({ message: "Нэвтэрнэ үү" });

    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        organizationId: true,
        status: true,
        orderNumber: true,
      },
    });

    if (!order) return res.status(404).json({ message: "Захиалга олдсонгүй" });
    if (order.organizationId !== user.organizationId) {
      return res.status(403).json({ message: "Энэ захиалгад хандах эрхгүй" });
    }

    const nextStatus = STATUS_FLOW[order.status];
    if (!nextStatus) {
      return res.status(400).json({
        message: `"${order.status}" төлвөөс шилжих боломжгүй. Хүргэлт баталгаажуулахын тулд код ашиглана уу.`,
      });
    }

    const updateData: Record<string, unknown> = { status: nextStatus };

    // Generate delivery code when moving to SHIPPING
    if (nextStatus === OrderStatus.SHIPPING) {
      updateData.deliveryCode = generateDeliveryCode();
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: order.id }, data: updateData });

      await tx.orderHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status as OrderStatus,
          toStatus: nextStatus,
          changedById: user.id,
          note:
            nextStatus === OrderStatus.PREPARED
              ? "Бараа бэлтгэгдсэн"
              : nextStatus === OrderStatus.SHIPPING
                ? "Хүргэлтэнд гарсан"
                : undefined,
        },
      });
    });

    return res.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      previousStatus: order.status,
      newStatus: nextStatus,
      deliveryCode: nextStatus === OrderStatus.SHIPPING ? updateData.deliveryCode : undefined,
      message: `Төлөв "${nextStatus}" болж шинэчлэгдлээ`,
    });
  } catch (error) {
    console.error("vendor order status update error", error);
    return res.status(500).json({ message: "Захиалгын төлөв шинэчлэхэд алдаа гарлаа" });
  }
});

/* ══════════════════════════════════════════════════════════
   POST /vendor/orders/:orderId/deliver
   Confirm delivery with 6-digit code.
   Body: { code: "123456" }
   Works for both vendor/driver AND customer.
   ══════════════════════════════════════════════════════════ */
router.post("/vendor/orders/:orderId/deliver", async (req: Request, res: Response) => {
  try {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ message: "Нэвтэрнэ үү" });
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) return res.status(401).json({ message: "Нэвтэрнэ үү" });

    let decoded: { userId?: string };
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId?: string };
    } catch {
      return res.status(401).json({ message: "Нэвтэрнэ үү" });
    }
    if (!decoded?.userId) return res.status(401).json({ message: "Нэвтэрнэ үү" });

    const { orderId } = req.params;
    const { code } = req.body as { code?: string };

    if (!code || code.length !== 6) {
      return res.status(400).json({ message: "6 оронтой код оруулна уу" });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        organizationId: true,
        customerId: true,
        status: true,
        deliveryCode: true,
      },
    });

    if (!order) return res.status(404).json({ message: "Захиалга олдсонгүй" });

    if (order.status !== "SHIPPING") {
      return res.status(400).json({ message: "Захиалга хүргэлтэнд гараагүй байна" });
    }

    if (!order.deliveryCode) {
      return res.status(400).json({ message: "Хүргэлтийн код үүсээгүй байна" });
    }

    if (order.deliveryCode !== code) {
      return res.status(400).json({ message: "Хүргэлтийн код буруу байна" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.COMPLETED,
          deliveryCode: null, // clear the code after use
        },
      });

      await tx.orderHistory.create({
        data: {
          orderId: order.id,
          fromStatus: OrderStatus.SHIPPING,
          toStatus: OrderStatus.COMPLETED,
          changedById: decoded.userId!,
          note: "Хүргэлт баталгаажсан (кодоор)",
        },
      });
    });

    return res.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: "COMPLETED",
      message: "Хүргэлт амжилттай баталгаажлаа",
    });
  } catch (error) {
    console.error("deliver confirm error", error);
    return res.status(500).json({ message: "Хүргэлт баталгаажуулахад алдаа гарлаа" });
  }
});

export { router as vendorOrderRoutes };
