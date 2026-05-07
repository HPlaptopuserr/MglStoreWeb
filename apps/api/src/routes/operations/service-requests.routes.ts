import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import { Permission, hasPlatformPermission, isFullAdmin } from "@mgl/types";
import { requireAuth } from "../../middleware/auth";
import { assertOrgPermission, requireOrgPermission } from "../../services/permission.service";

const router: ExpressRouter = Router();

const SERVICE_TYPE_LABELS: Record<string, string> = {
  POSTER_DESIGN: "Poster хийлгэх",
  PRODUCT_PHOTOSHOOT: "Бараа зураг авалт",
  LEGAL_CONSULTATION: "Хуульч дуудлага",
  TRAINING: "Сургалт авах",
  HR_SERVICE: "Хүний нөөцийн үйлчилгээ",
  MARKETING: "Маркетинг үйлчилгээ",
  OTHER: "Бусад",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Хүлээгдэж буй",
  IN_PROGRESS: "Хийгдэж буй",
  COMPLETED: "Дууссан",
  CANCELLED: "Цуцлагдсан",
};

// Get all service requests (Admin)
router.get("/service-requests", async (req, res) => {
  try {
    const { status, type, organizationId, search } = req.query;

    const where: any = {
      servicePostId: null,
      NOT: {
        description: {
          contains: "Web үйлчилгээний постоос ирсэн хүсэлт",
          mode: "insensitive",
        },
      },
    };

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (type && type !== "ALL") {
      where.type = type;
    }

    if (organizationId) {
      where.organizationId = organizationId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: "insensitive" } },
        { description: { contains: search as string, mode: "insensitive" } },
        { organization: { name: { contains: search as string, mode: "insensitive" } } },
      ];
    }

    const requests = await prisma.serviceRequest.findMany({
      where,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            email: true,
            phone: true,
          },
        },
        requestedBy: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                fullName: true,
                phoneNumber: true,
              },
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                fullName: true,
                phoneNumber: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const result = requests.map((r: (typeof requests)[number]) => ({
      ...r,
      typeLabel: SERVICE_TYPE_LABELS[r.type] || r.type,
      statusLabel: STATUS_LABELS[r.status] || r.status,
      estimatedPrice: r.estimatedPrice ? Number(r.estimatedPrice) : null,
      finalPrice: r.finalPrice ? Number(r.finalPrice) : null,
    }));

    res.json(result);
  } catch (error) {
    console.error("get service requests error", error);
    res.status(500).json({
      message: "Үйлчилгээний хүсэлтүүдийг авахад алдаа гарлаа",
    });
  }
});

// Get service requests for vendor (by organizationId)
router.get("/service-requests/organization/:orgId", requireAuth, requireOrgPermission({ from: "params", field: "orgId" }, Permission.VIEW_ORG_DASHBOARD), async (req, res) => {
  try {
    const { orgId } = req.params;
    const { status, servicePostId } = req.query;

    const where: any = {
      organizationId: orgId,
    };

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (servicePostId && servicePostId !== "ALL") {
      where.servicePostId = servicePostId;
    }

    const requests = await prisma.serviceRequest.findMany({
      where,
      include: {
        servicePost: {
          select: {
            id: true,
            title: true,
          },
        },
        requestedBy: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                fullName: true,
                phoneNumber: true,
              },
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const result = requests.map((r: (typeof requests)[number]) => ({
      ...r,
      typeLabel: SERVICE_TYPE_LABELS[r.type] || r.type,
      statusLabel: STATUS_LABELS[r.status] || r.status,
      estimatedPrice: r.estimatedPrice ? Number(r.estimatedPrice) : null,
      finalPrice: r.finalPrice ? Number(r.finalPrice) : null,
    }));

    res.json(result);
  } catch (error) {
    console.error("get vendor service requests error", error);
    res.status(500).json({
      message: "Үйлчилгээний хүсэлтүүдийг авахад алдаа гарлаа",
    });
  }
});

// Create service request (Vendor)
router.post("/service-requests", requireAuth, requireOrgPermission({ from: "body" }, Permission.MANAGE_SERVICES), async (req, res) => {
  try {
    const { organizationId, requestedById, type, title, description, servicePostId } = req.body;

    if (!organizationId || !requestedById || !type || !title) {
      return res.status(400).json({
        message: "organizationId, requestedById, type, title шаардлагатай",
      });
    }

    const validTypes = [
      "POSTER_DESIGN",
      "PRODUCT_PHOTOSHOOT",
      "LEGAL_CONSULTATION",
      "TRAINING",
      "HR_SERVICE",
      "MARKETING",
      "OTHER",
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        message: "Буруу төрөл",
      });
    }

    if (servicePostId) {
      const post = await prisma.servicePost.findFirst({
        where: { id: servicePostId, organizationId, deletedAt: null },
        select: { id: true },
      });
      if (!post) {
        return res.status(400).json({ message: "Үйлчилгээний пост олдсонгүй" });
      }
    }

    const request = await prisma.serviceRequest.create({
      data: {
        organizationId,
        servicePostId: servicePostId || null,
        requestedById,
        type,
        title,
        description,
        status: "PENDING",
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        requestedBy: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json({
      ...request,
      typeLabel: SERVICE_TYPE_LABELS[request.type] || request.type,
      statusLabel: STATUS_LABELS[request.status] || request.status,
    });
  } catch (error) {
    console.error("create service request error", error);
    res.status(500).json({
      message: "Үйлчилгээний хүсэлт үүсгэхэд алдаа гарлаа",
    });
  }
});

// Update service request status (Admin or owning vendor)
router.patch("/service-requests/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote, assignedToId, estimatedPrice, finalPrice } = req.body;

    const existing = await prisma.serviceRequest.findUnique({
      where: { id },
      select: { organizationId: true },
    });

    if (!existing) {
      return res.status(404).json({ message: "Үйлчилгээний хүсэлт олдсонгүй" });
    }

    const user = (req as any).user;
    const canManagePlatformServices =
      Boolean(user?.role && (isFullAdmin(user.role) || hasPlatformPermission(user.role, Permission.MANAGE_SERVICES)));

    if (!canManagePlatformServices) {
      const perm = await assertOrgPermission(req, res, existing.organizationId, Permission.MANAGE_SERVICES);
      if (!perm) return;
    }

    const updateData: any = {};

    if (status) {
      updateData.status = status;
      if (status === "COMPLETED") {
        updateData.completedAt = new Date();
      }
      if (status === "CANCELLED") {
        updateData.cancelledAt = new Date();
      }
    }

    if (adminNote !== undefined) updateData.adminNote = adminNote;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId || null;
    if (estimatedPrice !== undefined) updateData.estimatedPrice = estimatedPrice;
    if (finalPrice !== undefined) updateData.finalPrice = finalPrice;

    const updated = await prisma.serviceRequest.update({
      where: { id },
      data: updateData,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        requestedBy: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                fullName: true,
              },
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
    });

    res.json({
      ...updated,
      typeLabel: SERVICE_TYPE_LABELS[updated.type] || updated.type,
      statusLabel: STATUS_LABELS[updated.status] || updated.status,
      estimatedPrice: updated.estimatedPrice ? Number(updated.estimatedPrice) : null,
      finalPrice: updated.finalPrice ? Number(updated.finalPrice) : null,
    });
  } catch (error) {
    console.error("update service request error", error);
    res.status(500).json({
      message: "Үйлчилгээний хүсэлт шинэчлэхэд алдаа гарлаа",
    });
  }
});

// Delete completed service request (Admin or owning vendor)
router.delete("/service-requests/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.serviceRequest.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        status: true,
      },
    });

    if (!existing) {
      return res.status(404).json({ message: "Үйлчилгээний хүсэлт олдсонгүй" });
    }

    if (existing.status !== "COMPLETED") {
      return res.status(400).json({ message: "Зөвхөн дууссан хүсэлтийг устгах боломжтой" });
    }

    const user = (req as any).user;
    const canManagePlatformServices =
      Boolean(user?.role && (isFullAdmin(user.role) || hasPlatformPermission(user.role, Permission.MANAGE_SERVICES)));

    if (!canManagePlatformServices) {
      const perm = await assertOrgPermission(req, res, existing.organizationId, Permission.MANAGE_SERVICES);
      if (!perm) return;
    }

    await prisma.serviceRequest.delete({ where: { id } });

    res.json({ message: "Хүсэлт устгагдлаа" });
  } catch (error) {
    console.error("delete service request error", error);
    res.status(500).json({
      message: "Үйлчилгээний хүсэлт устгахад алдаа гарлаа",
    });
  }
});

// Get service request types
router.get("/service-request-types", async (_req, res) => {
  const types = Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));
  res.json(types);
});

export default router;
