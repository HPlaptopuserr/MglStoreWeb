import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";

const router: ExpressRouter = Router();

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

export default router;
