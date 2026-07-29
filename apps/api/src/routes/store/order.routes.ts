import {
  Router,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { OrderDispatchAttemptStatus } from "@prisma/client";
import {
  DeliverySourceType,
  prisma,
  OrderStatus,
  type Prisma,
} from "@mgl/database";
import { isFullAdmin } from "@mgl/types";
import {
  notifyAssignedOrderDelivery,
  routeOrderDelivery,
} from "../../services/delivery-routing.service";

const router: ExpressRouter = Router();
const JWT_SECRET =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === "production"
    ? (() => {
        throw new Error("FATAL: JWT_SECRET not set");
      })()
    : "dev-secret-change-me");

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

    const [organization, membership] = await Promise.all([
      prisma.organization.findFirst({
        where: { id: decoded.organizationId, deletedAt: null },
        select: { businessOrdersEnabled: true },
      }),
      prisma.organizationMember.findFirst({
        where: {
          userId: user.id,
          organizationId: decoded.organizationId,
          isActive: true,
          deletedAt: null,
        },
        select: { id: true },
      }),
    ]);

    if (!organization) return null;
    if (!isFullAdmin(user.role) && !membership) return null;

    return {
      ...user,
      organizationId: decoded.organizationId,
      ordersEnabled: organization.businessOrdersEnabled,
    };
  } catch {
    return null;
  }
};

/* ── Generate 6-digit delivery code ──────────────────── */
function generateDeliveryCode(): string {
  return String(crypto.randomInt(100000, 999999));
}

const DISPATCH_WINDOW_SECONDS = 10;

async function advanceNextDispatchAttempt(
  tx: Prisma.TransactionClient,
  orderId: string,
) {
  const next = await tx.orderDispatchAttempt.findFirst({
    where: {
      orderId,
      status: OrderDispatchAttemptStatus.QUEUED,
    },
    orderBy: { sequence: "asc" },
    select: { sequence: true },
  });

  if (!next) return null;

  const result = await tx.orderDispatchAttempt.updateMany({
    where: {
      orderId,
      status: OrderDispatchAttemptStatus.QUEUED,
      sequence: next.sequence,
    },
    data: {
      status: OrderDispatchAttemptStatus.PENDING,
      requestedAt: new Date(),
      expiresAt: new Date(Date.now() + DISPATCH_WINDOW_SECONDS * 1000),
    },
  });

  return {
    zone: next.sequence,
    count: result.count,
  };
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

router.post(
  "/vendor/orders/:orderId/delivery-provider",
  async (req: Request, res: Response) => {
    try {
      const user = await getVendorUser(req);
      if (!user) return res.status(401).json({ message: "Нэвтэрнэ үү" });
      const providerOrganizationId =
        typeof req.body.providerOrganizationId === "string"
          ? req.body.providerOrganizationId
          : undefined;
      const order = await prisma.order.findFirst({
        where: {
          id: req.params.orderId,
          organizationId: user.organizationId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!order) {
        return res.status(404).json({ message: "Захиалга олдсонгүй" });
      }

      const delivery = await prisma.$transaction(async (tx) => {
        await routeOrderDelivery(tx, {
          orderId: order.id,
          sourceType: DeliverySourceType.VENDOR_ORDER,
        });
        if (!providerOrganizationId) {
          return tx.delivery.findUnique({ where: { orderId: order.id } });
        }
        const partnership = await tx.deliveryPartnership.findFirst({
          where: {
            requesterOrganizationId: user.organizationId,
            providerOrganizationId,
            status: "ACCEPTED",
          },
          select: { id: true, warehouseId: true },
        });
        if (!partnership) {
          throw new Error("DELIVERY_PARTNERSHIP_NOT_FOUND");
        }
        return tx.delivery.update({
          where: { orderId: order.id },
          data: {
            sourceType: DeliverySourceType.VENDOR_ORDER,
            providerOrganizationId,
            partnershipId: partnership.id,
            warehouseId: partnership.warehouseId,
          },
        });
      });
      return res.json(delivery);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "DELIVERY_PARTNERSHIP_NOT_FOUND"
      ) {
        return res.status(400).json({
          message: "Сонгосон хүргэлтийн компанитай идэвхтэй хамтын ажиллагаа алга",
        });
      }
      console.error("POST /vendor/orders/:orderId/delivery-provider error", error);
      return res.status(500).json({
        message: "Хүргэлтийн компанид захиалга илгээхэд алдаа гарлаа",
      });
    }
  },
);

/* ══════════════════════════════════════════════════════════
   GET /vendor/orders
   List org's orders (newest first), with filters.
   Query: ?status=CONFIRMED&page=1&limit=50
   ══════════════════════════════════════════════════════════ */
router.get("/vendor/orders", async (req: Request, res: Response) => {
  try {
    const user = await getVendorUser(req);
    if (!user) return res.status(401).json({ message: "Нэвтэрнэ үү" });
    if (!user.ordersEnabled) {
      return res.status(403).json({
        code: "BUSINESS_ORDERS_DISABLED",
        message: "Надад ирсэн захиалгын хэсэг идэвхгүй байна",
      });
    }

    const {
      status,
      page = "1",
      limit = "50",
    } = req.query as Record<string, string>;
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
            select: {
              productName: true,
              quantity: true,
              price: true,
              subtotal: true,
              product: {
                select: {
                  supplyType: true,
                  preorderLeadTimeDays: true,
                  preorderNote: true,
                },
              },
            },
          },
          branch: { select: { id: true, name: true, address: true } },
          dispatchAttempts: {
            orderBy: { sequence: "asc" },
            select: {
              id: true,
              branchId: true,
              status: true,
              sequence: true,
              distanceKm: true,
              requestedAt: true,
              respondedAt: true,
              branch: { select: { id: true, name: true, address: true } },
            },
          },
          customer: {
            select: {
              id: true,
              email: true,
              profile: { select: { fullName: true, phoneNumber: true } },
            },
          },
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
        branch: o.branch,
        dispatch: {
          status: o.branch
            ? "ACCEPTED"
            : o.dispatchAttempts.some((a) => a.status === "PENDING")
              ? "SEARCHING"
              : o.dispatchAttempts.some((a) => a.status === "QUEUED")
                ? "QUEUED"
                : o.dispatchAttempts.length > 0
                  ? "NO_BRANCH_AVAILABLE"
                  : "NOT_STARTED",
          attempts: o.dispatchAttempts.map((a) => ({
            id: a.id,
            branchId: a.branchId,
            status: a.status,
            sequence: a.sequence,
            distanceKm: a.distanceKm,
            requestedAt: a.requestedAt.toISOString(),
            respondedAt: a.respondedAt?.toISOString() || null,
            branch: a.branch,
          })),
        },
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
          supplyType: i.product.supplyType,
          isPreorder: i.product.supplyType === "CHINA_PREORDER",
          preorderLeadTimeDays: i.product.preorderLeadTimeDays,
          preorderNote: i.product.preorderNote,
        })),
      })),
      total,
      page: Math.max(Number(page) || 1, 1),
      limit: take,
    });
  } catch (error) {
    console.error("vendor orders error", error);
    return res
      .status(500)
      .json({ message: "Захиалгын жагсаалт авахад алдаа гарлаа" });
  }
});

/* ══════════════════════════════════════════════════════════
   GET /vendor/order-dispatches
   Radar-style branch requests waiting for this organization.
   ══════════════════════════════════════════════════════════ */
router.get("/vendor/order-dispatches", async (req: Request, res: Response) => {
  try {
    const user = await getVendorUser(req);
    if (!user) return res.status(401).json({ message: "Нэвтэрнэ үү" });
    if (!user.ordersEnabled) {
      return res.status(403).json({
        code: "BUSINESS_ORDERS_DISABLED",
        message: "Надад ирсэн захиалгын хэсэг идэвхгүй байна",
      });
    }

    const attempts = await prisma.orderDispatchAttempt.findMany({
      where: {
        organizationId: user.organizationId,
        status: {
          in: [
            OrderDispatchAttemptStatus.PENDING,
            OrderDispatchAttemptStatus.QUEUED,
          ],
        },
        order: {
          deletedAt: null,
          paymentStatus: "PAID",
          branchId: null,
        },
      },
      orderBy: [
        { status: "desc" },
        { sequence: "asc" },
        { requestedAt: "asc" },
      ],
      take: 80,
      include: {
        branch: {
          select: { id: true, name: true, address: true, lat: true, lng: true },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            shippingAddress: true,
            phone: true,
            customerLat: true,
            customerLng: true,
            createdAt: true,
            items: {
              select: { productName: true, quantity: true, subtotal: true },
            },
            customer: {
              select: {
                email: true,
                profile: { select: { fullName: true, phoneNumber: true } },
              },
            },
          },
        },
      },
    });

    return res.json({
      dispatches: attempts.map((a) => ({
        id: a.id,
        orderId: a.orderId,
        branchId: a.branchId,
        status: a.status,
        sequence: a.sequence,
        distanceKm: a.distanceKm,
        requestedAt: a.requestedAt.toISOString(),
        expiresAt: a.expiresAt?.toISOString() || null,
        branch: a.branch,
        order: {
          id: a.order.id,
          orderNumber: a.order.orderNumber,
          total: Number(a.order.total),
          shippingAddress: a.order.shippingAddress,
          phone: a.order.phone,
          customerLat: a.order.customerLat,
          customerLng: a.order.customerLng,
          createdAt: a.order.createdAt.toISOString(),
          customer: {
            name: a.order.customer.profile?.fullName || a.order.customer.email,
            phone: a.order.customer.profile?.phoneNumber || null,
          },
          items: a.order.items.map((i) => ({
            name: i.productName,
            qty: i.quantity,
            subtotal: Number(i.subtotal),
          })),
        },
      })),
    });
  } catch (error) {
    console.error("vendor order dispatches error", error);
    return res
      .status(500)
      .json({ message: "Захиалгын radar хүсэлт авахад алдаа гарлаа" });
  }
});

/* ══════════════════════════════════════════════════════════
   POST /vendor/order-dispatches/:attemptId/accept
   Branch accepts the radar request.
   ══════════════════════════════════════════════════════════ */
router.post(
  "/vendor/order-dispatches/:attemptId/accept",
  async (req: Request, res: Response) => {
    try {
      const user = await getVendorUser(req);
      if (!user) return res.status(401).json({ message: "Нэвтэрнэ үү" });
      if (!user.ordersEnabled) {
        return res.status(403).json({
          code: "BUSINESS_ORDERS_DISABLED",
          message: "Надад ирсэн захиалгын хэсэг идэвхгүй байна",
        });
      }

      const { attemptId } = req.params;
      const attempt = await prisma.orderDispatchAttempt.findUnique({
        where: { id: attemptId },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              branchId: true,
              status: true,
            },
          },
          branch: true,
        },
      });

      if (!attempt || attempt.organizationId !== user.organizationId) {
        return res.status(404).json({ message: "Radar хүсэлт олдсонгүй" });
      }
      if (attempt.order.branchId) {
        return res
          .status(409)
          .json({ message: "Энэ захиалгыг өөр салбар аль хэдийн авсан байна" });
      }
      if (attempt.status !== OrderDispatchAttemptStatus.PENDING) {
        return res
          .status(400)
          .json({ message: "Зөвхөн идэвхтэй radar хүсэлтийг авах боломжтой" });
      }

      const assignedDelivery = await prisma.$transaction(async (tx) => {
        await tx.orderDispatchAttempt.update({
          where: { id: attempt.id },
          data: {
            status: OrderDispatchAttemptStatus.ACCEPTED,
            respondedAt: new Date(),
            respondedById: user.id,
          },
        });

        await tx.orderDispatchAttempt.updateMany({
          where: {
            orderId: attempt.orderId,
            id: { not: attempt.id },
            status: {
              in: [
                OrderDispatchAttemptStatus.PENDING,
                OrderDispatchAttemptStatus.QUEUED,
              ],
            },
          },
          data: {
            status: OrderDispatchAttemptStatus.CANCELLED,
            respondedAt: new Date(),
          },
        });

        await tx.order.update({
          where: { id: attempt.orderId },
          data: { branchId: attempt.branchId, status: OrderStatus.CONFIRMED },
        });

        const delivery = await routeOrderDelivery(tx, {
          orderId: attempt.orderId,
          sourceType: DeliverySourceType.WEBSITE_ORDER,
        });

        await tx.orderHistory.create({
          data: {
            orderId: attempt.orderId,
            fromStatus: attempt.order.status as OrderStatus,
            toStatus: OrderStatus.CONFIRMED,
            changedById: user.id,
            note: `${attempt.branch.name} салбар захиалгыг хүлээн авлаа`,
          },
        });

        return delivery;
      });
      await notifyAssignedOrderDelivery({
        courierId: assignedDelivery.courierId,
        deliveryId: assignedDelivery.id,
        orderNumber: attempt.order.orderNumber,
      });

      return res.json({
        orderId: attempt.orderId,
        orderNumber: attempt.order.orderNumber,
        branchId: attempt.branchId,
        branchName: attempt.branch.name,
        status: "ACCEPTED",
        message: "Захиалгыг салбар хүлээн авлаа",
      });
    } catch (error) {
      console.error("accept order dispatch error", error);
      return res
        .status(500)
        .json({ message: "Radar хүсэлт авахад алдаа гарлаа" });
    }
  },
);

/* ══════════════════════════════════════════════════════════
   POST /vendor/order-dispatches/:attemptId/decline
   Branch declines; next nearest queued branch becomes active.
   ══════════════════════════════════════════════════════════ */
router.post(
  "/vendor/order-dispatches/:attemptId/decline",
  async (req: Request, res: Response) => {
    try {
      const user = await getVendorUser(req);
      if (!user) return res.status(401).json({ message: "Нэвтэрнэ үү" });
      if (!user.ordersEnabled) {
        return res.status(403).json({
          code: "BUSINESS_ORDERS_DISABLED",
          message: "Надад ирсэн захиалгын хэсэг идэвхгүй байна",
        });
      }

      const { attemptId } = req.params;
      const { note } = req.body as { note?: string };
      const attempt = await prisma.orderDispatchAttempt.findUnique({
        where: { id: attemptId },
        include: {
          order: { select: { id: true, orderNumber: true, branchId: true } },
          branch: true,
        },
      });

      if (!attempt || attempt.organizationId !== user.organizationId) {
        return res.status(404).json({ message: "Radar хүсэлт олдсонгүй" });
      }
      if (attempt.order.branchId) {
        return res
          .status(409)
          .json({ message: "Энэ захиалгыг өөр салбар аль хэдийн авсан байна" });
      }
      if (attempt.status !== OrderDispatchAttemptStatus.PENDING) {
        return res.status(400).json({
          message: "Зөвхөн идэвхтэй radar хүсэлтийг татгалзах боломжтой",
        });
      }

      const next = await prisma.$transaction(async (tx) => {
        await tx.orderDispatchAttempt.update({
          where: { id: attempt.id },
          data: {
            status: OrderDispatchAttemptStatus.DECLINED,
            respondedAt: new Date(),
            respondedById: user.id,
            note: note || null,
          },
        });

        await tx.orderHistory.create({
          data: {
            orderId: attempt.orderId,
            toStatus: OrderStatus.CONFIRMED,
            changedById: user.id,
            note: `${attempt.branch.name} салбар боломжгүй гэж татгалзлаа`,
          },
        });

        return advanceNextDispatchAttempt(tx, attempt.orderId);
      });

      return res.json({
        orderId: attempt.orderId,
        orderNumber: attempt.order.orderNumber,
        declinedBranchId: attempt.branchId,
        nextZone: next?.zone || null,
        nextBranchCount: next?.count || 0,
        status: next ? "NEXT_BRANCH_REQUESTED" : "NO_BRANCH_AVAILABLE",
        message: next
          ? `Дараагийн бүсийн ${next.count} салбар руу хүсэлт зэрэг илгээгдлээ`
          : "Ойролцоох бүх бүсийн салбар татгалзсан байна",
      });
    } catch (error) {
      console.error("decline order dispatch error", error);
      return res
        .status(500)
        .json({ message: "Radar хүсэлт татгалзахад алдаа гарлаа" });
    }
  },
);

/* ══════════════════════════════════════════════════════════
   PATCH /vendor/orders/:orderId/status
   Advance order status: CONFIRMED→PREPARED→SHIPPING
   When moving to SHIPPING, a 6-digit delivery code is generated.
   ══════════════════════════════════════════════════════════ */
router.patch(
  "/vendor/orders/:orderId/status",
  async (req: Request, res: Response) => {
    try {
      const user = await getVendorUser(req);
      if (!user) return res.status(401).json({ message: "Нэвтэрнэ үү" });
      if (!user.ordersEnabled) {
        return res.status(403).json({
          code: "BUSINESS_ORDERS_DISABLED",
          message: "Надад ирсэн захиалгын хэсэг идэвхгүй байна",
        });
      }

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

      if (!order)
        return res.status(404).json({ message: "Захиалга олдсонгүй" });
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

        if (nextStatus === OrderStatus.SHIPPING) {
          await routeOrderDelivery(tx, {
            orderId: order.id,
            sourceType: DeliverySourceType.WEBSITE_ORDER,
          });
        }
      });

      return res.json({
        orderId: order.id,
        orderNumber: order.orderNumber,
        previousStatus: order.status,
        newStatus: nextStatus,
        deliveryCode:
          nextStatus === OrderStatus.SHIPPING
            ? updateData.deliveryCode
            : undefined,
        message: `Төлөв "${nextStatus}" болж шинэчлэгдлээ`,
      });
    } catch (error) {
      console.error("vendor order status update error", error);
      return res
        .status(500)
        .json({ message: "Захиалгын төлөв шинэчлэхэд алдаа гарлаа" });
    }
  },
);

/* ══════════════════════════════════════════════════════════
   POST /vendor/orders/:orderId/deliver
   Confirm delivery with 6-digit code.
   Body: { code: "123456" }
   Works for both vendor/driver AND customer.
   ══════════════════════════════════════════════════════════ */
router.post(
  "/vendor/orders/:orderId/deliver",
  async (req: Request, res: Response) => {
    try {
      const header = req.headers.authorization;
      if (!header) return res.status(401).json({ message: "Нэвтэрнэ үү" });
      const [scheme, token] = header.split(" ");
      if (scheme !== "Bearer" || !token)
        return res.status(401).json({ message: "Нэвтэрнэ үү" });

      let decoded: { userId?: string };
      try {
        decoded = jwt.verify(token, JWT_SECRET) as { userId?: string };
      } catch {
        return res.status(401).json({ message: "Нэвтэрнэ үү" });
      }
      if (!decoded?.userId)
        return res.status(401).json({ message: "Нэвтэрнэ үү" });

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

      if (!order)
        return res.status(404).json({ message: "Захиалга олдсонгүй" });

      if (order.status !== "SHIPPING") {
        return res
          .status(400)
          .json({ message: "Захиалга хүргэлтэнд гараагүй байна" });
      }

      if (!order.deliveryCode) {
        return res
          .status(400)
          .json({ message: "Хүргэлтийн код үүсээгүй байна" });
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
      return res
        .status(500)
        .json({ message: "Хүргэлт баталгаажуулахад алдаа гарлаа" });
    }
  },
);

export { router as vendorOrderRoutes };
