import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";

const router: ExpressRouter = Router();

const categoryLabels: Record<string, string> = {
  retail: "Худалдаа",
  service: "Үйлчилгээ",
  food: "Хоол үйлдвэрлэл",
  other: "Бусад",
};

// Grouped by businessCategory (must be before /partners to avoid Express matching issues)
router.get("/partners/grouped", async (req, res) => {
  try {
    const partners = await prisma.organization.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        businessCategory: true,
      },
    });

    const activeCategories = await prisma.businessCategory.findMany({
      where: { isActive: true },
    });

    const categoryMap = new Map(activeCategories.map((c) => [c.slug, c.name]));

    const grouped: Record<
      string,
      {
        category: string;
        label: string;
        partners: {
          id: string;
          name: string;
          slug: string;
          logoUrl: string | null;
        }[];
      }
    > = {};

    for (const partner of partners) {
      const catSlugs = partner.businessCategory
        ? partner.businessCategory.split(",").filter(Boolean)
        : ["other"];
      for (const catSlug of catSlugs) {
        if (!grouped[catSlug]) {
          grouped[catSlug] = {
            category: catSlug,
            label: categoryMap.get(catSlug) || catSlug,
            partners: [],
          };
        }
        grouped[catSlug].partners.push({
          id: partner.id,
          name: partner.name,
          slug: partner.slug,
          logoUrl: partner.logoUrl,
        });
      }
    }

    res.json(Object.values(grouped));
  } catch (error) {
    console.error("get grouped partners error", error);
    res.status(500).json({
      message: "Бүлэглэсэн түншүүдийг авахад алдаа гарлаа",
    });
  }
});

router.get("/partners", async (req, res) => {
  try {
    const partners = await prisma.organization.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            users: true,
            products: true,
            branches: true,
            orders: true,
          },
        },
        products: {
          where: {
            isActive: true,
            deletedAt: null,
          },
          include: {
            images: true,
            category: true,
          },
          take: 20,
        },
      },
    });

    const result = partners.map((partner: any) => ({
      id: partner.id,
      name: partner.name,
      slug: partner.slug,
      taxId: partner.taxId,
      type: partner.type,
      status: partner.status,
      isVerified: partner.isVerified,
      businessCategory: partner.businessCategory,
      email: partner.email,
      phone: partner.phone,
      logoUrl: partner.logoUrl,
      bannerUrl: partner.bannerUrl,
      address: partner.address,
      description: partner.description,
      shortDescription: partner.shortDescription,
      openingHours: partner.openingHours,
      deliveryText: partner.deliveryText,
      deliveryPrice: partner.deliveryPrice,
      rating: partner.rating,
      reviewCount: partner.reviewCount,
      customers: partner.customerCount,
      years: partner.operatingYears,
      createdAt: partner.createdAt,
      stats: {
        users: partner._count.users,
        products: partner._count.products,
        branches: partner._count.branches,
        orders: partner._count.orders,
      },
      products: partner.products.map((p: any) => ({
        id: p.id,
        name: p.name,
        title: p.name,
        description: p.description,
        price: Number(p.price),
        originalPrice: p.costPrice ? Number(p.costPrice) : undefined,
        stock: p.stock,
        category: p.category?.name,
        image: p.images?.[0]?.url,
        images: p.images?.map((img: any) => img.url),
      })),
    }));

    res.json(result);
  } catch (error) {
    console.error("get partners error", error);
    res.status(500).json({
      message: "Түншүүдийг авахад алдаа гарлаа",
    });
  }
});

// Get single partner by slug or id
router.get("/partners/:slugOrId", async (req, res) => {
  try {
    const { slugOrId } = req.params;

    const partner = await prisma.organization.findFirst({
      where: {
        OR: [{ slug: slugOrId }, { id: slugOrId }],
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            users: true,
            products: true,
            branches: true,
            orders: true,
          },
        },
        products: {
          where: {
            isActive: true,
            deletedAt: null,
          },
          include: {
            images: true,
            category: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!partner) {
      return res.status(404).json({ message: "Түнш олдсонгүй" });
    }

    const result = {
      id: partner.id,
      name: partner.name,
      slug: partner.slug,
      taxId: partner.taxId,
      type: partner.type,
      status: partner.status,
      isVerified: partner.isVerified,
      businessCategory: partner.businessCategory,
      email: partner.email,
      phone: partner.phone,
      logoUrl: partner.logoUrl,
      bannerUrl: partner.bannerUrl,
      address: partner.address,
      description: partner.description,
      shortDescription: partner.shortDescription,
      openingHours: partner.openingHours,
      deliveryText: partner.deliveryText,
      deliveryPrice: partner.deliveryPrice,
      rating: partner.rating,
      reviewCount: partner.reviewCount,
      customers: partner.customerCount,
      years: partner.operatingYears,
      createdAt: partner.createdAt,
      stats: {
        users: partner._count.users,
        products: partner._count.products,
        branches: partner._count.branches,
        orders: partner._count.orders,
      },
      products: partner.products.map((p: any) => ({
        id: p.id,
        name: p.name,
        title: p.name,
        description: p.description,
        price: Number(p.price),
        originalPrice: p.costPrice ? Number(p.costPrice) : undefined,
        stock: p.stock,
        category: p.category?.name,
        image: p.images?.[0]?.url,
        images: p.images?.map((img: any) => img.url),
      })),
    };

    res.json(result);
  } catch (error) {
    console.error("get partner detail error", error);
    res.status(500).json({
      message: "Түншийн мэдээлэл авахад алдаа гарлаа",
    });
  }
});

router.patch("/partners/:id/category", async (req, res) => {
  try {
    const { id } = req.params;
    const { businessCategory } = req.body;

    const updated = await prisma.organization.update({
      where: { id },
      data: { businessCategory: businessCategory || null },
      select: { id: true, name: true, businessCategory: true },
    });

    res.json(updated);
  } catch (error) {
    console.error("update businessCategory error", error);
    res
      .status(500)
      .json({ message: "BusinessCategory шинэчлэхэд алдаа гарлаа" });
  }
});

// Update partner profile
router.patch("/partners/:id/profile", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      phone,
      email,
      address,
      logoUrl,
      bannerUrl,
      description,
      shortDescription,
      openingHours,
      deliveryText,
      deliveryPrice,
      operatingYears,
    } = req.body;

    const updateData: Record<string, any> = {};

    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (address !== undefined) updateData.address = address;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (bannerUrl !== undefined) updateData.bannerUrl = bannerUrl;
    if (description !== undefined) updateData.description = description;
    if (shortDescription !== undefined)
      updateData.shortDescription = shortDescription;
    if (openingHours !== undefined) updateData.openingHours = openingHours;
    if (deliveryText !== undefined) updateData.deliveryText = deliveryText;
    if (deliveryPrice !== undefined) updateData.deliveryPrice = deliveryPrice;
    if (operatingYears !== undefined)
      updateData.operatingYears = operatingYears;

    const updated = await prisma.organization.update({
      where: { id },
      data: updateData,
    });

    res.json({
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      phone: updated.phone,
      email: updated.email,
      address: updated.address,
      logoUrl: updated.logoUrl,
      bannerUrl: updated.bannerUrl,
      description: updated.description,
      shortDescription: updated.shortDescription,
      openingHours: updated.openingHours,
      deliveryText: updated.deliveryText,
      deliveryPrice: updated.deliveryPrice,
      operatingYears: updated.operatingYears,
    });
  } catch (error) {
    console.error("update partner profile error", error);
    res.status(500).json({ message: "Профайл шинэчлэхэд алдаа гарлаа" });
  }
});

// Get deleted organizations (trash)
router.get("/partners/deleted/list", async (req, res) => {
  try {
    const deletedOrgs = await prisma.organization.findMany({
      where: {
        deletedAt: { not: null },
      },
      orderBy: {
        deletedAt: "desc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        deletedAt: true,
        deletionReason: true,
        deletedBy: true,
        scheduledPermanentDeletionAt: true,
        _count: {
          select: {
            users: true,
            products: true,
            orders: true,
          },
        },
      },
    });

    res.json(deletedOrgs);
  } catch (error) {
    console.error("get deleted organizations error", error);
    res
      .status(500)
      .json({ message: "Устгасан байгууллагуудыг авахад алдаа гарлаа" });
  }
});

// Delete organization (soft delete with reason, 30 days retention)
router.delete("/partners/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, deletedBy } = req.body;

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({
        message: "Устгах шалтгааныг дор хаяж 5 тэмдэгтээр бичнэ үү",
      });
    }

    // Check if organization exists
    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orders: true,
            products: true,
            users: true,
          },
        },
      },
    });

    if (!org) {
      return res.status(404).json({ message: "Байгууллага олдсонгүй" });
    }

    // Calculate 30 days from now for permanent deletion
    const scheduledPermanentDeletionAt = new Date();
    scheduledPermanentDeletionAt.setDate(
      scheduledPermanentDeletionAt.getDate() + 30,
    );

    // Soft delete - set deletedAt timestamp
    await prisma.organization.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletionReason: reason.trim(),
        deletedBy: deletedBy || "admin",
        scheduledPermanentDeletionAt,
        status: "SUSPENDED",
      },
    });

    // Also deactivate all users of this organization
    await prisma.user.updateMany({
      where: { organizationId: id },
      data: {
        deletedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message:
        "Байгууллага амжилттай устгагдлаа. 30 хоногийн дараа бүрмөсөн устгагдана.",
      deletedOrg: {
        id: org.id,
        name: org.name,
        scheduledPermanentDeletionAt,
      },
    });
  } catch (error) {
    console.error("delete organization error", error);
    res.status(500).json({ message: "Байгууллага устгахад алдаа гарлаа" });
  }
});

// Restore deleted organization
router.post("/partners/:id/restore", async (req, res) => {
  try {
    const { id } = req.params;

    const org = await prisma.organization.findUnique({
      where: { id },
    });

    if (!org) {
      return res.status(404).json({ message: "Байгууллага олдсонгүй" });
    }

    if (!org.deletedAt) {
      return res
        .status(400)
        .json({ message: "Энэ байгууллага устгагдаагүй байна" });
    }

    // Restore organization
    await prisma.organization.update({
      where: { id },
      data: {
        deletedAt: null,
        deletionReason: null,
        deletedBy: null,
        scheduledPermanentDeletionAt: null,
        status: "ACTIVE",
      },
    });

    // Restore users
    await prisma.user.updateMany({
      where: { organizationId: id },
      data: {
        deletedAt: null,
      },
    });

    res.json({
      success: true,
      message: "Байгууллага амжилттай сэргээгдлээ",
      restoredOrg: {
        id: org.id,
        name: org.name,
      },
    });
  } catch (error) {
    console.error("restore organization error", error);
    res.status(500).json({ message: "Байгууллага сэргээхэд алдаа гарлаа" });
  }
});

// Permanently delete organization (only after 30 days or by force)
router.delete("/partners/:id/permanent", async (req, res) => {
  try {
    const { id } = req.params;
    const { force } = req.body;

    const org = await prisma.organization.findUnique({
      where: { id },
    });

    if (!org) {
      return res.status(404).json({ message: "Байгууллага олдсонгүй" });
    }

    if (!org.deletedAt) {
      return res.status(400).json({
        message: "Зөвхөн устгагдсан байгууллагыг бүрмөсөн устгах боломжтой",
      });
    }

    // Check if 30 days have passed (unless force is true)
    if (
      !force &&
      org.scheduledPermanentDeletionAt &&
      new Date() < org.scheduledPermanentDeletionAt
    ) {
      const daysLeft = Math.ceil(
        (org.scheduledPermanentDeletionAt.getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      );
      return res.status(400).json({
        message: `Бүрмөсөн устгах хугацаа болоогүй байна. ${daysLeft} хоног үлдсэн.`,
      });
    }

    // Permanently delete (cascade will handle related records based on schema)
    await prisma.organization.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Байгууллага бүрмөсөн устгагдлаа",
    });
  } catch (error) {
    console.error("permanent delete organization error", error);
    res
      .status(500)
      .json({ message: "Байгууллага бүрмөсөн устгахад алдаа гарлаа" });
  }
});

export default router;
