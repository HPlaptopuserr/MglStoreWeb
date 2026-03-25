import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import bcrypt from "bcryptjs";

const router: ExpressRouter = Router();

const categoryLabels: Record<string, string> = {
  retail: "Худалдаа",
  service: "Үйлчилгээ",
  food: "Хоол үйлдвэрлэл",
  other: "Бусад",
};

const MIN_BRANCH_DISTANCE_METERS = 500;

function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

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

// Toggle investor role for a partner
router.patch("/partners/:id/investor", async (req, res) => {
  try {
    const { id } = req.params;
    const { isInvestor, investmentAmount, addAmount } = req.body;

    const org = await prisma.organization.findUnique({
      where: { id },
      include: { investorProfile: true },
    });

    if (!org) {
      return res.status(404).json({ message: "Байгууллага олдсонгүй" });
    }

    if (isInvestor) {
      if (org.investorProfile) {
        let newLevel = org.investorProfile.investmentLevel;
        if (addAmount && investmentAmount) {
          const current = Number(org.investorProfile.investmentLevel) || 0;
          newLevel = String(current + Number(investmentAmount));
        } else if (investmentAmount) {
          newLevel = String(investmentAmount);
        }
        await prisma.investorProfile.update({
          where: { organizationId: id },
          data: { investmentLevel: newLevel },
        });
      } else {
        // Create investor profile
        await prisma.investorProfile.create({
          data: {
            organizationId: id,
            investmentLevel: investmentAmount ? String(investmentAmount) : null,
          },
        });
      }
    } else {
      // Remove investor profile
      if (org.investorProfile) {
        await prisma.investorProfile.delete({
          where: { organizationId: id },
        });
      }
    }

    const updated = await prisma.organization.findUnique({
      where: { id },
      include: {
        investorProfile: true,
        _count: { select: { users: true, products: true, branches: true, orders: true } },
      },
    });

    res.json({
      id: updated!.id,
      name: updated!.name,
      isInvestor: !!updated!.investorProfile,
      investmentAmount: updated!.investorProfile?.investmentLevel ? Number(updated!.investorProfile.investmentLevel) : null,
    });
  } catch (error) {
    console.error("toggle investor error", error);
    res.status(500).json({ message: "Хөрөнгө оруулагч төлөв өөрчлөхөд алдаа гарлаа" });
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
        investorProfile: {
          select: {
            id: true,
            tier: true,
            featured: true,
            investmentLevel: true,
            publiclyVisible: true,
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
      isInvestor: !!partner.investorProfile,
      investorTier: partner.investorProfile?.tier || null,
      investmentAmount: partner.investorProfile?.investmentLevel ? Number(partner.investorProfile.investmentLevel) : null,
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

    // Sort: investors first (by investmentAmount desc), then regular partners by createdAt
    result.sort((a: any, b: any) => {
      if (a.isInvestor && !b.isInvestor) return -1;
      if (!a.isInvestor && b.isInvestor) return 1;
      if (a.isInvestor && b.isInvestor) {
        return (b.investmentAmount || 0) - (a.investmentAmount || 0);
      }
      return 0; // keep createdAt desc from DB
    });

    res.json(result);
  } catch (error) {
    console.error("get partners error", error);
    res.status(500).json({
      message: "Түншүүдийг авахад алдаа гарлаа",
    });
  }
});

router.get("/branches/map", async (_req, res) => {
  try {
    const branches = await prisma.branch.findMany({
      where: {
        deletedAt: null,
        lat: { not: null },
        lng: { not: null },
        organization: {
          deletedAt: null,
          status: "ACTIVE",
        },
      },
      orderBy: [{ organizationId: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        address: true,
        lat: true,
        lng: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
      },
    });

    res.json(branches);
  } catch (error) {
    console.error("get branch map data error", error);
    res.status(500).json({ message: "Салбарын байршлын мэдээлэл авахад алдаа гарлаа" });
  }
});

router.post("/partners/:id/branches", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, lat, lng } = req.body as {
      name?: string;
      address?: string;
      lat?: number | string;
      lng?: number | string;
    };

    if (!name?.trim() || !address?.trim()) {
      return res.status(400).json({ message: "Салбарын нэр болон хаяг заавал шаардлагатай" });
    }

    const organization = await prisma.organization.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!organization) {
      return res.status(404).json({ message: "Байгууллага олдсонгүй" });
    }

    const parsedLat = lat === undefined || lat === null || lat === "" ? null : Number(lat);
    const parsedLng = lng === undefined || lng === null || lng === "" ? null : Number(lng);

    if ((parsedLat !== null && Number.isNaN(parsedLat)) || (parsedLng !== null && Number.isNaN(parsedLng))) {
      return res.status(400).json({ message: "Өргөрөг/уртраг зөв тоо байх ёстой" });
    }

    if (parsedLat !== null && parsedLng !== null) {
      const existingBranches = await prisma.branch.findMany({
        where: {
          deletedAt: null,
          lat: { not: null },
          lng: { not: null },
        },
        select: {
          id: true,
          name: true,
          address: true,
          lat: true,
          lng: true,
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      let nearestConflict: {
        id: string;
        name: string;
        address: string;
        distanceMeters: number;
        organization: { id: string; name: string };
      } | null = null;

      for (const branch of existingBranches) {
        if (branch.lat === null || branch.lng === null) continue;

        const distanceMeters = haversineDistanceMeters(
          parsedLat,
          parsedLng,
          branch.lat,
          branch.lng,
        );

        if (distanceMeters < MIN_BRANCH_DISTANCE_METERS) {
          if (!nearestConflict || distanceMeters < nearestConflict.distanceMeters) {
            nearestConflict = {
              id: branch.id,
              name: branch.name,
              address: branch.address,
              distanceMeters,
              organization: branch.organization,
            };
          }
        }
      }

      if (nearestConflict) {
        return res.status(409).json({
          message:
            "500м радиус дотор өөр салбар байна. 500м-ээс хол байршил сонгоно уу.",
          conflict: nearestConflict,
          minimumDistanceMeters: MIN_BRANCH_DISTANCE_METERS,
        });
      }
    }

    const created = await prisma.branch.create({
      data: {
        organizationId: id,
        name: name.trim(),
        address: address.trim(),
        lat: parsedLat,
        lng: parsedLng,
      },
      select: {
        id: true,
        name: true,
        address: true,
        lat: true,
        lng: true,
        createdAt: true,
      },
    });

    res.status(201).json(created);
  } catch (error) {
    console.error("create branch error", error);
    res.status(500).json({ message: "Салбар үүсгэхэд алдаа гарлаа" });
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
        investorProfile: {
          select: {
            id: true,
            tier: true,
            featured: true,
            investmentLevel: true,
            publiclyVisible: true,
          },
        },
        members: {
          where: { isActive: true },
          select: {
            id: true,
            role: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                email: true,
                isActive: true,
                lastLoginAt: true,
                profile: { select: { fullName: true } },
              },
            },
          },
          orderBy: { createdAt: "asc" },
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
        branches: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            address: true,
            lat: true,
            lng: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
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
      isInvestor: !!partner.investorProfile,
      investorTier: partner.investorProfile?.tier || null,
      investmentAmount: partner.investorProfile?.investmentLevel ? Number(partner.investorProfile.investmentLevel) : null,
      stats: {
        users: partner._count.users,
        products: partner._count.products,
        branches: partner._count.branches,
        orders: partner._count.orders,
      },
      members: partner.members.map((m: any) => ({
        id: m.id,
        role: m.role,
        createdAt: m.createdAt,
        userId: m.user.id,
        email: m.user.email,
        fullName: m.user.profile?.fullName || null,
        isActive: m.user.isActive,
        lastLoginAt: m.user.lastLoginAt,
      })),
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
      branches: partner.branches.map((b: any) => ({
        id: b.id,
        name: b.name,
        address: b.address,
        lat: b.lat,
        lng: b.lng,
        createdAt: b.createdAt,
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

/* ─── POST /partners/:id/members/:userId/reset-password ─────────────── */
router.post("/partners/:id/members/:userId/reset-password", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "Хэрэглэгч олдсонгүй" });

    // Generate an 8-char temporary password: letters + digits
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    const tempPassword = Array.from({ length: 8 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");

    const hash = await bcrypt.hash(tempPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hash },
    });

    return res.json({ tempPassword });
  } catch (error) {
    console.error("reset password error", error);
    return res.status(500).json({ message: "Нууц үг шинэчлэхэд алдаа гарлаа" });
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
