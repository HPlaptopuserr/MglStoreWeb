import {
  Router,
  type NextFunction,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";
import {
  Capability,
  DeliveryStatus,
  DispatchStatus,
  OrderStatus,
  OrgRole,
  StockRequestStatus,
  prisma,
  type Prisma,
} from "@mgl/database";
import { requireAuth, type AuthPayload } from "../../middleware/auth";
import { transferStockToVendor } from "../../services/stock-transfer.service";

const router: ExpressRouter = Router();
type DeliveryRequest = Request & {
  user: AuthPayload;
  deliveryOrganizationId?: string;
};

const deliveryRelations = {
  providerOrganization: { select: { id: true, name: true } },
  requesterOrganization: {
    select: { id: true, name: true, address: true, phone: true },
  },
  warehouse: { select: { id: true, name: true, address: true, phone: true } },
  stockDispatch: {
    include: {
      warehouse: { select: { id: true, name: true, address: true, phone: true } },
      organization: { select: { id: true, name: true, phone: true, address: true } },
      request: {
        include: {
          items: {
            include: { product: { select: { name: true } } },
          },
        },
      },
    },
  },
  order: {
    include: {
      customer: {
        select: {
          email: true,
          profile: { select: { fullName: true, phoneNumber: true } },
        },
      },
      items: { include: { product: { select: { name: true } } } },
    },
  },
} as const;

type DeliveryWithRelations = Prisma.DeliveryGetPayload<{
  include: typeof deliveryRelations;
}>;

function normalizeDelivery(delivery: DeliveryWithRelations) {
  if (delivery.order) {
    return {
      ...delivery,
      pickupAddress:
        delivery.warehouse?.address ||
        delivery.requesterOrganization?.address ||
        delivery.requesterOrganization?.name ||
        "",
    };
  }
  const dispatch = delivery.stockDispatch;
  if (!dispatch) return delivery;
  return {
    ...delivery,
    pickupAddress: dispatch.warehouse.address,
    orderId: delivery.stockDispatchId,
    order: {
      id: dispatch.id,
      orderNumber: dispatch.dispatchNumber,
      shippingAddress:
        dispatch.organization.address || dispatch.organization.name,
      phone: dispatch.organization.phone || "",
      total: "0",
      customerLat: null,
      customerLng: null,
      customer: {
        email: "",
        profile: {
          fullName: dispatch.organization.name,
          phoneNumber: dispatch.organization.phone,
        },
      },
      items: dispatch.request.items.map((item) => ({
        productName: item.product.name,
        product: { name: item.product.name },
      })),
    },
  };
}

const requireDeliveryManager = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authenticated = req as DeliveryRequest;
  const organizationId = authenticated.user.organizationId;
  if (!organizationId) {
    return res.status(403).json({ message: "Байгууллага сонгогдоогүй байна" });
  }
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: authenticated.user.userId,
      organizationId,
      isActive: true,
      deletedAt: null,
      role: { in: [OrgRole.OWNER, OrgRole.ADMIN] },
      organization: {
        businessDeliveryEnabled: true,
        deletedAt: null,
      },
    },
    select: { id: true },
  });
  if (!membership) {
    return res.status(403).json({
      message: "Хүргэлтийн ажлыг удирдах эрхгүй байна",
    });
  }
  authenticated.deliveryOrganizationId = organizationId;
  return next();
};

router.get(
  "/delivery-provider/drivers",
  requireAuth,
  requireDeliveryManager,
  async (req, res) => {
    try {
      const organizationId = (req as DeliveryRequest).deliveryOrganizationId!;
      const drivers = await prisma.organizationMember.findMany({
        where: {
          organizationId,
          isActive: true,
          deletedAt: null,
          capabilities: { has: Capability.DELIVERY_DRIVER },
        },
        select: {
          user: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  fullName: true,
                  phoneNumber: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });
      return res.json(drivers.map(({ user }) => user));
    } catch (error) {
      console.error("GET /delivery-provider/drivers error", error);
      return res.status(500).json({
        message: "Жолоочдын жагсаалт авахад алдаа гарлаа",
      });
    }
  },
);

router.get(
  "/delivery-provider/jobs",
  requireAuth,
  requireDeliveryManager,
  async (req, res) => {
    try {
      const organizationId = (req as DeliveryRequest).deliveryOrganizationId!;
      const deliveries = await prisma.delivery.findMany({
        where: { providerOrganizationId: organizationId },
        include: {
          ...deliveryRelations,
          courier: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  fullName: true,
                  phoneNumber: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      return res.json(deliveries.map(normalizeDelivery));
    } catch (error) {
      console.error("GET /delivery-provider/jobs error", error);
      return res.status(500).json({
        message: "Хүргэлтийн ажлуудыг авахад алдаа гарлаа",
      });
    }
  },
);

router.patch(
  "/delivery-provider/jobs/:id/assign",
  requireAuth,
  requireDeliveryManager,
  async (req, res) => {
    try {
      const organizationId = (req as DeliveryRequest).deliveryOrganizationId!;
      const courierId =
        typeof req.body.courierId === "string" ? req.body.courierId : "";
      if (!courierId) {
        return res.status(400).json({ message: "Жолооч сонгоно уу" });
      }

      const [delivery, driver] = await Promise.all([
        prisma.delivery.findFirst({
          where: {
            id: req.params.id,
            providerOrganizationId: organizationId,
          },
          select: { id: true, warehouseId: true },
        }),
        prisma.organizationMember.findFirst({
          where: {
            userId: courierId,
            organizationId,
            isActive: true,
            deletedAt: null,
            capabilities: { has: Capability.DELIVERY_DRIVER },
          },
          select: { id: true },
        }),
      ]);
      if (!delivery) {
        return res.status(404).json({ message: "Хүргэлтийн ажил олдсонгүй" });
      }
      if (!driver) {
        return res.status(400).json({
          message: "Сонгосон ажилтан жолоочийн идэвхтэй эрхгүй байна",
        });
      }
      if (delivery.warehouseId) {
        const warehouseAssignment =
          await prisma.warehouseCourierAssignment.findFirst({
            where: {
              warehouseId: delivery.warehouseId,
              courierId,
              providerOrganizationId: organizationId,
              isActive: true,
            },
            select: { id: true },
          });
        if (!warehouseAssignment) {
          return res.status(400).json({
            message: "Энэ жолооч тухайн агуулахад бүртгэгдээгүй байна",
          });
        }
      }

      const updated = await prisma.delivery.update({
        where: { id: delivery.id },
        data: { courierId },
        include: deliveryRelations,
      });
      return res.json(normalizeDelivery(updated));
    } catch (error) {
      console.error("PATCH /delivery-provider/jobs/:id/assign error", error);
      return res.status(500).json({
        message: "Жолооч онооход алдаа гарлаа",
      });
    }
  },
);

const requireDeliveryDriver = async (req: any, res: any, next: any) => {
  const user = req.user as AuthPayload;
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: user.userId,
      ...(user.organizationId
        ? { organizationId: user.organizationId }
        : {}),
      isActive: true,
      deletedAt: null,
      capabilities: { has: Capability.DELIVERY_DRIVER },
      organization: {
        businessDeliveryEnabled: true,
        deletedAt: null,
      },
    },
    select: { organizationId: true },
  });
  if (!membership) {
    return res.status(403).json({
      message: "Хүргэлтийн ажилтны эрх идэвхгүй байна",
    });
  }
  req.deliveryOrganizationId = membership.organizationId;
  return next();
};

// ── GET /deliveries — courier's assigned delivery jobs
router.get(
  "/deliveries",
  requireAuth,
  requireDeliveryDriver,
  async (req, res) => {
    try {
      const courierId = (req as any).user.userId;
      const deliveries = await prisma.delivery.findMany({
        where: {
          courierId,
        },
        include: deliveryRelations,
        orderBy: {
          createdAt: "desc",
        },
      });

      res.json(deliveries.map(normalizeDelivery));
    } catch (error) {
      console.error("GET /deliveries error", error);
      res
        .status(500)
        .json({ message: "Хүргэлтийн жагсаалт авахад алдаа гарлаа" });
    }
  },
);

// ── GET /deliveries/:id — delivery detail
router.get(
  "/deliveries/:id",
  requireAuth,
  requireDeliveryDriver,
  async (req, res) => {
    try {
      const delivery = await prisma.delivery.findFirst({
        where: {
          id: req.params.id,
          courierId: (req as any).user.userId,
        },
        include: deliveryRelations,
      });

      if (!delivery) {
        res.status(404).json({ message: "Хүргэлт олдсонгүй" });
        return;
      }

      res.json(normalizeDelivery(delivery));
    } catch (error) {
      console.error("GET /deliveries/:id error", error);
      res
        .status(500)
        .json({ message: "Хүргэлтийн мэдээлэл авахад алдаа гарлаа" });
    }
  },
);

// ── POST/PATCH /deliveries/:id/status — update delivery status
const updateStatusHandler = async (req: Request, res: Response) => {
  try {
    const authenticated = req as DeliveryRequest;
    const status =
      typeof req.body.status === "string" ? req.body.status : "";
    const proofImage =
      typeof req.body.proofImage === "string" ? req.body.proofImage : undefined;
    const deliveryId = req.params.id;
    const courierId = authenticated.user.userId;

    const delivery = await prisma.delivery.findFirst({
      where: { id: deliveryId, courierId },
    });

    if (!delivery) {
      res.status(404).json({ message: "Хүргэлт олдсонгүй" });
      return;
    }

    const validStatuses = [
      "WAITING",
      "PICKING",
      "DELIVERING",
      "COMPLETED",
      "CANCELLED",
    ];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ message: "Буруу статус" });
      return;
    }
    const transitions: Record<string, string[]> = {
      WAITING: ["PICKING", "CANCELLED"],
      PICKING: ["DELIVERING", "CANCELLED"],
      DELIVERING: ["COMPLETED", "CANCELLED"],
      COMPLETED: [],
      CANCELLED: [],
    };
    if (!transitions[delivery.status]?.includes(status)) {
      return res.status(409).json({
        message: `"${delivery.status}" төлвөөс "${status}" төлөв рүү шилжих боломжгүй`,
      });
    }

    const updateData: Prisma.DeliveryUncheckedUpdateInput = {
      status: status as DeliveryStatus,
    };

    if (status === "DELIVERING" && !delivery.pickupTime) {
      updateData.pickupTime = new Date();
    }

    if (status === "COMPLETED") {
      updateData.deliveredAt = new Date();
      if (proofImage) {
        updateData.proofImage = proofImage;
      }
    }

    let orderStatus: OrderStatus = OrderStatus.SHIPPING;
    if (status === "COMPLETED") {
      orderStatus = OrderStatus.COMPLETED;
    } else if (status === "CANCELLED") {
      orderStatus = OrderStatus.CANCELLED;
    } else if (status === "PICKING" || status === "DELIVERING") {
      orderStatus = OrderStatus.SHIPPING;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const nextDelivery = await tx.delivery.update({
        where: { id: deliveryId },
        data: updateData,
      });
      if (delivery.orderId) {
        await tx.order.update({
          where: { id: delivery.orderId },
          data: { status: orderStatus },
        });
      } else if (delivery.stockDispatchId && status === "DELIVERING") {
        await tx.stockDispatch.update({
          where: { id: delivery.stockDispatchId },
          data: {
            status: DispatchStatus.DISPATCHED,
            driverId: courierId,
            dispatchedAt: new Date(),
          },
        });
      } else if (delivery.stockDispatchId && status === "COMPLETED") {
        const dispatch = await tx.stockDispatch.findUnique({
          where: { id: delivery.stockDispatchId },
          include: { request: { include: { items: true } } },
        });
        if (!dispatch) throw new Error("Агуулахын илгээмж олдсонгүй");
        await transferStockToVendor(
          tx,
          {
            organizationId: dispatch.request.organizationId,
            requestNumber: dispatch.request.requestNumber,
          },
          dispatch.request.items,
        );
        await tx.warehouseStockRequest.update({
          where: { id: dispatch.requestId },
          data: {
            status: StockRequestStatus.COMPLETED,
            completedAt: new Date(),
          },
        });
        await tx.stockDispatch.update({
          where: { id: dispatch.id },
          data: {
            status: DispatchStatus.DELIVERED,
            driverId: courierId,
            deliveredAt: new Date(),
          },
        });
      }
      return nextDelivery;
    });

    res.json(updated);
  } catch (error) {
    console.error("Update delivery status error", error);
    res
      .status(500)
      .json({ message: "Хүргэлтийн статус шинэчлэхэд алдаа гарлаа" });
  }
};

router.post(
  "/deliveries/:id/status",
  requireAuth,
  requireDeliveryDriver,
  updateStatusHandler,
);
router.patch(
  "/deliveries/:id/status",
  requireAuth,
  requireDeliveryDriver,
  updateStatusHandler,
);

// ── POST /driver/location — submit courier real-time GPS location
router.post(
  "/driver/location",
  requireAuth,
  requireDeliveryDriver,
  async (req, res) => {
    try {
      const { lat, lng } = req.body;
      const userId = (req as any).user.userId;

      if (typeof lat !== "number" || typeof lng !== "number") {
        res.status(400).json({ message: "Буруу координат" });
        return;
      }

      const location = await prisma.courierLocationHistory.create({
        data: {
          userId,
          lat,
          lng,
        },
      });

      res.status(201).json(location);
    } catch (error) {
      console.error("POST /driver/location error", error);
      res.status(500).json({ message: "Байршил хадгалахад алдаа гарлаа" });
    }
  },
);

export default router;
