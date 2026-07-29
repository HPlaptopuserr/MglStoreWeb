import {
  Router,
  type NextFunction,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
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
import { notifyAssignedOrderDelivery } from "../../services/delivery-routing.service";
import { transferStockToVendor } from "../../services/stock-transfer.service";

const router: ExpressRouter = Router();
const driverDocumentsDir = path.resolve(
  __dirname,
  "../../../uploads/delivery-drivers",
);
fs.mkdirSync(driverDocumentsDir, { recursive: true });

const driverDocumentUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, driverDocumentsDir),
    filename: (req, file, callback) => {
      const userId = String(
        (req as DeliveryRequest).user?.userId || "driver",
      ).replace(/[^a-zA-Z0-9_-]/g, "");
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `${userId}-${Date.now()}${extension}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowed = new Set([
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
    if (allowed.has(file.mimetype)) callback(null, true);
    else callback(new Error("PDF, JPG, PNG эсвэл WEBP файл сонгоно уу"));
  },
});
const deliveryProofsDir = path.resolve(
  __dirname,
  "../../../uploads/delivery-proofs",
);
fs.mkdirSync(deliveryProofsDir, { recursive: true });
const deliveryProofUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, deliveryProofsDir),
    filename: (req, file, callback) => {
      const userId = String(
        (req as DeliveryRequest).user?.userId || "driver",
      ).replace(/[^a-zA-Z0-9_-]/g, "");
      const extension = path.extname(file.originalname).toLowerCase() || ".jpg";
      callback(null, `${userId}-${Date.now()}${extension}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new Error("JPG, PNG эсвэл WEBP зураг сонгоно уу"));
    }
  },
});
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
      warehouse: {
        select: { id: true, name: true, address: true, phone: true },
      },
      organization: {
        select: { id: true, name: true, phone: true, address: true },
      },
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
      await notifyAssignedOrderDelivery({
        courierId,
        deliveryId: updated.id,
        orderNumber:
          updated.order?.orderNumber ??
          updated.stockDispatch?.dispatchNumber ??
          updated.trackingCode ??
          updated.id,
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

const requireDeliveryDriver = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authenticated = req as DeliveryRequest;
  const user = authenticated.user;
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: user.userId,
      ...(user.organizationId ? { organizationId: user.organizationId } : {}),
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
  authenticated.deliveryOrganizationId = membership.organizationId;
  return next();
};

router.get(
  "/delivery-driver/documents/:fileName",
  requireAuth,
  requireDeliveryDriver,
  (req, res) => {
    const fileName = path.basename(req.params.fileName);
    return res.sendFile(path.join(driverDocumentsDir, fileName));
  },
);

router.get("/delivery-proofs/:fileName", requireAuth, (req, res) => {
  return res.sendFile(
    path.join(deliveryProofsDir, path.basename(req.params.fileName)),
  );
});

router.get(
  "/delivery-driver/profile",
  requireAuth,
  requireDeliveryDriver,
  async (req, res) => {
    try {
      const userId = (req as DeliveryRequest).user.userId;
      const profile = await prisma.deliveryDriverProfile.findUnique({
        where: { userId },
      });
      return res.json(profile ?? { userId });
    } catch (error) {
      console.error("GET /delivery-driver/profile error", error);
      return res
        .status(500)
        .json({ message: "Жолоочийн мэдээлэл авахад алдаа гарлаа" });
    }
  },
);

router.put(
  "/delivery-driver/profile",
  requireAuth,
  requireDeliveryDriver,
  async (req, res) => {
    try {
      const userId = (req as DeliveryRequest).user.userId;
      const stringValue = (value: unknown) =>
        typeof value === "string" && value.trim().length > 0
          ? value.trim()
          : null;
      const expiryValue = stringValue(req.body.insuranceExpiresAt);
      const insuranceExpiresAt = expiryValue ? new Date(expiryValue) : null;
      const hasExpiry = Object.prototype.hasOwnProperty.call(
        req.body,
        "insuranceExpiresAt",
      );
      if (
        hasExpiry &&
        insuranceExpiresAt &&
        Number.isNaN(insuranceExpiresAt.getTime())
      ) {
        return res
          .status(400)
          .json({ message: "Даатгалын дуусах огноо буруу байна" });
      }
      const optionalString = (field: string) =>
        Object.prototype.hasOwnProperty.call(req.body, field)
          ? { [field]: stringValue(req.body[field]) }
          : {};
      const data = {
        ...optionalString("nationalId"),
        ...optionalString("emergencyContactName"),
        ...optionalString("emergencyContactPhone"),
        ...optionalString("vehicleMake"),
        ...optionalString("vehicleModel"),
        ...optionalString("vehiclePlateNumber"),
        ...optionalString("vehicleCategory"),
        ...optionalString("driverLicenseNumber"),
        ...optionalString("insuranceProvider"),
        ...optionalString("insurancePolicyNumber"),
        ...(hasExpiry ? { insuranceExpiresAt } : {}),
      };
      const profile = await prisma.deliveryDriverProfile.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
      });
      return res.json(profile);
    } catch (error) {
      console.error("PUT /delivery-driver/profile error", error);
      return res
        .status(500)
        .json({ message: "Жолоочийн мэдээлэл хадгалахад алдаа гарлаа" });
    }
  },
);

router.post(
  "/delivery-driver/profile/document",
  requireAuth,
  requireDeliveryDriver,
  driverDocumentUpload.single("document"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Файл сонгоно уу" });
      }
      const kind = typeof req.body.kind === "string" ? req.body.kind : "";
      const fieldByKind = {
        driverLicense: "driverLicenseDocumentUrl",
        vehicle: "vehicleDocumentUrl",
        insurance: "insuranceDocumentUrl",
      } as const;
      const field = fieldByKind[kind as keyof typeof fieldByKind];
      if (!field) {
        fs.unlink(req.file.path, () => undefined);
        return res.status(400).json({ message: "Файлын төрөл буруу байна" });
      }
      const userId = (req as DeliveryRequest).user.userId;
      const documentUrl = `/api/delivery-driver/documents/${req.file.filename}`;
      const profile = await prisma.deliveryDriverProfile.upsert({
        where: { userId },
        create: { userId, [field]: documentUrl },
        update: { [field]: documentUrl },
      });
      return res.json({ documentUrl, profile });
    } catch (error) {
      console.error("POST /delivery-driver/profile/document error", error);
      return res
        .status(500)
        .json({ message: "Баримт файл хадгалахад алдаа гарлаа" });
    }
  },
);

// ── GET /deliveries — courier's assigned delivery jobs
router.get(
  "/deliveries",
  requireAuth,
  requireDeliveryDriver,
  async (req, res) => {
    try {
      const courierId = (req as DeliveryRequest).user.userId;
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
          courierId: (req as DeliveryRequest).user.userId,
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

router.post(
  "/deliveries/:id/proof",
  requireAuth,
  requireDeliveryDriver,
  deliveryProofUpload.single("proof"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ message: "Баталгаажуулах зураг шаардлагатай" });
      }
      const delivery = await prisma.delivery.findFirst({
        where: {
          id: req.params.id,
          courierId: (req as DeliveryRequest).user.userId,
          status: DeliveryStatus.DELIVERING,
        },
        select: { id: true },
      });
      if (!delivery) {
        fs.unlink(req.file.path, () => undefined);
        return res.status(409).json({
          message: "Зөвхөн хүргэж буй ажлын баталгаажуулах зураг оруулна",
        });
      }
      const proofImage = `/api/delivery-proofs/${req.file.filename}`;
      await prisma.delivery.update({
        where: { id: delivery.id },
        data: { proofImage },
      });
      return res.json({ proofImage });
    } catch (error) {
      console.error("POST /deliveries/:id/proof error", error);
      return res
        .status(500)
        .json({ message: "Баталгаажуулах зураг хадгалахад алдаа гарлаа" });
    }
  },
);

// ── POST/PATCH /deliveries/:id/status — update delivery status
const updateStatusHandler = async (req: Request, res: Response) => {
  try {
    const authenticated = req as DeliveryRequest;
    const status = typeof req.body.status === "string" ? req.body.status : "";
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
      const completedProof = delivery.proofImage;
      if (!completedProof) {
        return res.status(400).json({
          message: "Барааг хүлээлгэн өгсөн зураг оруулсны дараа дуусгана уу",
        });
      }
      updateData.deliveredAt = new Date();
      updateData.proofImage = completedProof;
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
      const userId = (req as DeliveryRequest).user.userId;

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
