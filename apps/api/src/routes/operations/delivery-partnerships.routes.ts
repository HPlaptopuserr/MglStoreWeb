import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import {
  Capability,
  DeliveryPartnershipStatus,
  OrgRole,
  prisma,
} from "@mgl/database";
import { requireAuth, type AuthPayload } from "../../middleware/auth";
import { sendPushToUsers } from "../../services/push-notification.service";
import { hasWarehouseAccess } from "../../services/warehouse-access.service";

const router: ExpressRouter = Router();

type AuthenticatedRequest = Request & { user: AuthPayload };

function actor(req: Request) {
  return (req as AuthenticatedRequest).user;
}

async function canManageOrganization(user: AuthPayload, organizationId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: user.userId,
      organizationId,
      isActive: true,
      deletedAt: null,
      role: { in: [OrgRole.OWNER, OrgRole.ADMIN] },
    },
    select: { id: true },
  });
  return Boolean(membership);
}

async function organizationManagerIds(organizationId: string) {
  const members = await prisma.organizationMember.findMany({
    where: {
      organizationId,
      isActive: true,
      deletedAt: null,
      role: { in: [OrgRole.OWNER, OrgRole.ADMIN] },
    },
    select: { userId: true },
  });
  return members.map((member) => member.userId);
}

async function notifyUsers(input: Parameters<typeof sendPushToUsers>[0]) {
  try {
    await sendPushToUsers(input);
  } catch (error) {
    console.error("Delivery partnership push notification error", error);
  }
}

async function canRequestForScope(
  user: AuthPayload,
  organizationId: string | null | undefined,
  warehouseId?: string,
) {
  if (organizationId && (await canManageOrganization(user, organizationId))) {
    return true;
  }
  if (!warehouseId) return false;
  if (!(await hasWarehouseAccess(user, warehouseId))) return false;
  if (!organizationId) return true;
  const assignment = await prisma.warehouseOrganization.findUnique({
    where: {
      warehouseId_organizationId: { warehouseId, organizationId },
    },
    select: { id: true },
  });
  return Boolean(assignment);
}

const organizationSummary = {
  id: true,
  name: true,
  logoUrl: true,
  phone: true,
  email: true,
  address: true,
  rating: true,
} as const;

const partnershipInclude = {
  requesterOrganization: { select: organizationSummary },
  providerOrganization: { select: organizationSummary },
  warehouse: { select: { id: true, name: true, address: true } },
  requestedBy: {
    select: { id: true, email: true, profile: { select: { fullName: true } } },
  },
  respondedBy: {
    select: { id: true, email: true, profile: { select: { fullName: true } } },
  },
  _count: { select: { courierAssignments: true } },
} as const;

router.get("/delivery-providers", requireAuth, async (req, res) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const providers = await prisma.organization.findMany({
      where: {
        businessDeliveryEnabled: true,
        status: "ACTIVE",
        deletedAt: null,
        ...(search
          ? { name: { contains: search, mode: "insensitive" as const } }
          : {}),
        members: {
          some: {
            isActive: true,
            deletedAt: null,
            capabilities: { has: Capability.DELIVERY_DRIVER },
          },
        },
      },
      select: {
        ...organizationSummary,
        deliveryPrice: true,
        deliveryText: true,
        _count: {
          select: {
            members: {
              where: {
                isActive: true,
                deletedAt: null,
                capabilities: { has: Capability.DELIVERY_DRIVER },
              },
            },
          },
        },
      },
      orderBy: [{ rating: "desc" }, { name: "asc" }],
    });
    return res.json(providers);
  } catch (error) {
    console.error("GET /delivery-providers error", error);
    return res.status(500).json({ message: "Хүргэлтийн байгууллагуудыг авахад алдаа гарлаа" });
  }
});

router.get("/delivery-partnerships", requireAuth, async (req, res) => {
  try {
    const user = actor(req);
    const organizationId =
      typeof req.query.organizationId === "string"
        ? req.query.organizationId
        : user.organizationId || "";
    const warehouseId =
      typeof req.query.warehouseId === "string" ? req.query.warehouseId : undefined;

    const providerManager = organizationId
      ? await canManageOrganization(user, organizationId)
      : false;
    const requesterAllowed = await canRequestForScope(
      user,
      organizationId || null,
      warehouseId,
    );
    if (!providerManager && !requesterAllowed) {
      return res.status(403).json({ message: "Хамтын ажиллагааны хүсэлт харах эрхгүй байна" });
    }

    const partnerships = await prisma.deliveryPartnership.findMany({
      where: {
        ...(warehouseId ? { warehouseId } : {}),
        ...(organizationId
          ? {
              OR: [
                { requesterOrganizationId: organizationId },
                { providerOrganizationId: organizationId },
              ],
            }
          : {}),
      },
      include: partnershipInclude,
      orderBy: { createdAt: "desc" },
    });
    return res.json(partnerships);
  } catch (error) {
    console.error("GET /delivery-partnerships error", error);
    return res.status(500).json({ message: "Хамтын ажиллагааны хүсэлт авахад алдаа гарлаа" });
  }
});

router.post("/delivery-partnerships", requireAuth, async (req, res) => {
  try {
    const user = actor(req);
    const { requesterOrganizationId, providerOrganizationId, warehouseId, message } =
      req.body as {
        requesterOrganizationId?: string;
        providerOrganizationId?: string;
        warehouseId?: string;
        message?: string;
      };
    if (!providerOrganizationId || (!requesterOrganizationId && !warehouseId)) {
      return res.status(400).json({ message: "Агуулах эсвэл хүсэлт гаргагч байгууллага, хүргэлтийн байгууллага шаардлагатай" });
    }
    if (requesterOrganizationId === providerOrganizationId) {
      return res.status(400).json({ message: "Өөрийн байгууллага руу хүсэлт илгээх боломжгүй" });
    }
    if (
      !(await canRequestForScope(
        user,
        requesterOrganizationId || null,
        warehouseId,
      ))
    ) {
      return res.status(403).json({ message: "Хүсэлт илгээх эрхгүй байна" });
    }

    const provider = await prisma.organization.findFirst({
      where: {
        id: providerOrganizationId,
        businessDeliveryEnabled: true,
        status: "ACTIVE",
        deletedAt: null,
        members: {
          some: {
            isActive: true,
            deletedAt: null,
            capabilities: { has: Capability.DELIVERY_DRIVER },
          },
        },
      },
      select: { id: true },
    });
    if (!provider) {
      return res.status(400).json({ message: "Сонгосон байгууллага хүргэлтийн үйлчилгээ идэвхжүүлээгүй байна" });
    }

    const duplicate = await prisma.deliveryPartnership.findFirst({
      where: {
        requesterOrganizationId: requesterOrganizationId || null,
        providerOrganizationId,
        warehouseId: warehouseId || null,
        status: { in: [DeliveryPartnershipStatus.PENDING, DeliveryPartnershipStatus.ACCEPTED] },
      },
      select: { id: true, status: true },
    });
    if (duplicate) {
      return res.status(409).json({
        message:
          duplicate.status === DeliveryPartnershipStatus.ACCEPTED
            ? "Энэ байгууллагатай хамтын ажиллагаа аль хэдийн идэвхтэй байна"
            : "Хүсэлт аль хэдийн илгээгдсэн байна",
      });
    }

    const partnership = await prisma.deliveryPartnership.create({
      data: {
        requesterOrganizationId: requesterOrganizationId || null,
        providerOrganizationId,
        warehouseId: warehouseId || null,
        message: message?.trim() || null,
        requestedById: user.userId,
      },
      include: partnershipInclude,
    });
    const managerIds = await organizationManagerIds(providerOrganizationId);
    const requesterName =
      partnership.warehouse?.name ||
      partnership.requesterOrganization?.name ||
      "Байгууллага";
    await notifyUsers({
      userIds: managerIds,
      title: "Хүргэлтийн хамтын ажиллагааны хүсэлт",
      body: `${requesterName} хүргэлтийн үйлчилгээ авах хүсэлт илгээлээ.`,
      data: {
        type: "delivery_partnership_request",
        partnershipId: partnership.id,
        providerOrganizationId,
        sourceType: partnership.warehouseId ? "WAREHOUSE" : "VENDOR",
      },
    });
    return res.status(201).json(partnership);
  } catch (error) {
    console.error("POST /delivery-partnerships error", error);
    return res.status(500).json({ message: "Хамтын ажиллагааны хүсэлт илгээхэд алдаа гарлаа" });
  }
});

router.patch("/delivery-partnerships/:id/respond", requireAuth, async (req, res) => {
  try {
    const user = actor(req);
    const { action, reason } = req.body as {
      action?: "ACCEPT" | "REJECT";
      reason?: string;
    };
    if (action !== "ACCEPT" && action !== "REJECT") {
      return res.status(400).json({ message: "ACCEPT эсвэл REJECT үйлдэл шаардлагатай" });
    }
    const existing = await prisma.deliveryPartnership.findUnique({
      where: { id: req.params.id },
      select: { providerOrganizationId: true, status: true },
    });
    if (!existing) return res.status(404).json({ message: "Хүсэлт олдсонгүй" });
    if (!(await canManageOrganization(user, existing.providerOrganizationId))) {
      return res.status(403).json({ message: "Хүсэлт шийдвэрлэх эрхгүй байна" });
    }
    if (existing.status !== DeliveryPartnershipStatus.PENDING) {
      return res.status(409).json({ message: "Энэ хүсэлтийг өмнө нь шийдвэрлэсэн байна" });
    }

    const partnership = await prisma.$transaction(async (tx) => {
      const updated = await tx.deliveryPartnership.update({
        where: { id: req.params.id },
        data: {
          status:
            action === "ACCEPT"
              ? DeliveryPartnershipStatus.ACCEPTED
              : DeliveryPartnershipStatus.REJECTED,
          rejectionReason: action === "REJECT" ? reason?.trim() || null : null,
          respondedById: user.userId,
          respondedAt: new Date(),
        },
        include: partnershipInclude,
      });
      if (action === "ACCEPT") {
        await tx.delivery.updateMany({
          where: {
            providerOrganizationId: null,
            status: "WAITING",
            ...(updated.warehouseId
              ? { warehouseId: updated.warehouseId }
              : {
                  requesterOrganizationId:
                    updated.requesterOrganizationId || undefined,
                }),
          },
          data: {
            providerOrganizationId: updated.providerOrganizationId,
            partnershipId: updated.id,
          },
        });
      }
      return updated;
    });
    let requesterManagerIds: string[] = [];
    if (partnership.requesterOrganizationId) {
      requesterManagerIds = await organizationManagerIds(
        partnership.requesterOrganizationId,
      );
    } else if (partnership.warehouse?.id) {
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: partnership.warehouse.id },
        select: {
          createdById: true,
          organizations: {
            select: {
              organization: {
                select: {
                  members: {
                    where: {
                      isActive: true,
                      deletedAt: null,
                      role: { in: [OrgRole.OWNER, OrgRole.ADMIN] },
                    },
                    select: { userId: true },
                  },
                },
              },
            },
          },
        },
      });
      requesterManagerIds = [
        ...(warehouse?.createdById ? [warehouse.createdById] : []),
        ...(warehouse?.organizations.flatMap((item) =>
          item.organization.members.map((member) => member.userId),
        ) ?? []),
      ];
    }
    const requesterIds = Array.from(
      new Set([
        ...requesterManagerIds,
        partnership.requestedBy.id,
      ]),
    );
    await notifyUsers({
      userIds: requesterIds,
      title:
        action === "ACCEPT"
          ? "Хүргэлтийн хүсэлт зөвшөөрөгдлөө"
          : "Хүргэлтийн хүсэлт татгалзагдлаа",
      body:
        action === "ACCEPT"
          ? `${partnership.providerOrganization.name} хамтын ажиллагааны хүсэлтийг зөвшөөрлөө.`
          : `${partnership.providerOrganization.name} хүсэлтийг татгалзлаа.`,
      data: {
        type: "delivery_partnership_response",
        partnershipId: partnership.id,
        status: partnership.status,
      },
    });
    return res.json(partnership);
  } catch (error) {
    console.error("PATCH /delivery-partnerships/:id/respond error", error);
    return res.status(500).json({ message: "Хүсэлт шийдвэрлэхэд алдаа гарлаа" });
  }
});

router.get("/delivery-partnerships/:id/couriers", requireAuth, async (req, res) => {
  try {
    const user = actor(req);
    const partnership = await prisma.deliveryPartnership.findUnique({
      where: { id: req.params.id },
      select: {
        status: true,
        requesterOrganizationId: true,
        providerOrganizationId: true,
        warehouseId: true,
      },
    });
    if (!partnership) return res.status(404).json({ message: "Хамтын ажиллагаа олдсонгүй" });
    const allowed =
      (await canManageOrganization(user, partnership.providerOrganizationId)) ||
      (await canRequestForScope(
        user,
        partnership.requesterOrganizationId,
        partnership.warehouseId || undefined,
      ));
    if (!allowed) return res.status(403).json({ message: "Жолоочдын мэдээлэл харах эрхгүй байна" });
    if (partnership.status !== DeliveryPartnershipStatus.ACCEPTED) {
      return res.status(409).json({ message: "Хамтын ажиллагаа идэвхжээгүй байна" });
    }

    const couriers = await prisma.organizationMember.findMany({
      where: {
        organizationId: partnership.providerOrganizationId,
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
              select: { fullName: true, phoneNumber: true, avatarUrl: true },
            },
            warehouseCourierAssignments: partnership.warehouseId
              ? {
                  where: {
                    warehouseId: partnership.warehouseId,
                    isActive: true,
                  },
                  select: { id: true },
                }
              : false,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return res.json(
      couriers.map(({ user: courier }) => ({
        ...courier,
        isRegistered:
          "warehouseCourierAssignments" in courier &&
          courier.warehouseCourierAssignments.length > 0,
        ...("warehouseCourierAssignments" in courier
          ? { warehouseCourierAssignments: undefined }
          : {}),
      })),
    );
  } catch (error) {
    console.error("GET /delivery-partnerships/:id/couriers error", error);
    return res.status(500).json({ message: "Жолоочдын жагсаалт авахад алдаа гарлаа" });
  }
});

router.post("/delivery-partnerships/:id/courier-assignments", requireAuth, async (req, res) => {
  try {
    const user = actor(req);
    const { courierId } = req.body as { courierId?: string };
    if (!courierId) return res.status(400).json({ message: "Жолооч сонгоно уу" });
    const partnership = await prisma.deliveryPartnership.findUnique({
      where: { id: req.params.id },
      select: {
        status: true,
        requesterOrganizationId: true,
        providerOrganizationId: true,
        warehouseId: true,
      },
    });
    if (!partnership?.warehouseId) {
      return res.status(400).json({ message: "Энэ хамтын ажиллагаанд агуулах сонгогдоогүй байна" });
    }
    if (partnership.status !== DeliveryPartnershipStatus.ACCEPTED) {
      return res.status(409).json({ message: "Хамтын ажиллагаа идэвхжээгүй байна" });
    }
    if (
      !(await canRequestForScope(
        user,
        partnership.requesterOrganizationId,
        partnership.warehouseId,
      ))
    ) {
      return res.status(403).json({ message: "Жолооч агуулахад бүртгэх эрхгүй байна" });
    }
    const driver = await prisma.organizationMember.findFirst({
      where: {
        userId: courierId,
        organizationId: partnership.providerOrganizationId,
        isActive: true,
        deletedAt: null,
        capabilities: { has: Capability.DELIVERY_DRIVER },
      },
      select: { id: true },
    });
    if (!driver) return res.status(400).json({ message: "Сонгосон хэрэглэгч жолоочийн идэвхтэй эрхгүй байна" });

    const assignment = await prisma.warehouseCourierAssignment.upsert({
      where: {
        warehouseId_courierId: {
          warehouseId: partnership.warehouseId,
          courierId,
        },
      },
      create: {
        warehouseId: partnership.warehouseId,
        providerOrganizationId: partnership.providerOrganizationId,
        partnershipId: req.params.id,
        courierId,
        assignedById: user.userId,
      },
      update: {
        providerOrganizationId: partnership.providerOrganizationId,
        partnershipId: req.params.id,
        assignedById: user.userId,
        isActive: true,
      },
      include: {
        courier: {
          select: {
            id: true,
            email: true,
            profile: { select: { fullName: true, phoneNumber: true, avatarUrl: true } },
          },
        },
      },
    });
    return res.status(201).json(assignment);
  } catch (error) {
    console.error("POST /delivery-partnerships/:id/courier-assignments error", error);
    return res.status(500).json({ message: "Жолоочийг агуулахад бүртгэхэд алдаа гарлаа" });
  }
});

export default router;
