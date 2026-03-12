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

    const categoryMap = new Map(activeCategories.map(c => [c.slug, c.name]));

    const grouped: Record<
      string,
      {
        category: string;
        label: string;
        partners: { id: string; name: string; slug: string; logoUrl: string | null }[];
      }
    > = {};

    for (const partner of partners) {
      const catSlug = partner.businessCategory || "other";
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
      address: partner.address,
      createdAt: partner.createdAt,
      stats: {
        users: partner._count.users,
        products: partner._count.products,
        branches: partner._count.branches,
        orders: partner._count.orders,
      },
    }));

    res.json(result);
  } catch (error) {
    console.error("get partners error", error);
    res.status(500).json({
      message: "Түншүүдийг авахад алдаа гарлаа",
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
    res.status(500).json({ message: "BusinessCategory шинэчлэхэд алдаа гарлаа" });
  }
});

export default router;
