import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";

const router: ExpressRouter = Router();

/* ─── GET /products ─────────────────────────────────────────────────── */
router.get("/products", async (req, res) => {
  try {
    const { organizationId, businessCategoryId, search } = req.query as Record<string, string>;

    const where: Record<string, unknown> = { deletedAt: null };
    if (organizationId) where.organizationId = organizationId;
    if (businessCategoryId) where.businessCategoryId = businessCategoryId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        images: { select: { id: true, url: true } },
        businessCategory: { select: { id: true, name: true, slug: true } },
        organization: { select: { id: true, name: true, logoUrl: true } },
        discounts: {
          where: { isActive: true, validUntil: { gte: new Date() } },
          select: { percent: true, validUntil: true },
          take: 1,
        },
      },
    });

    return res.json(products);
  } catch (error) {
    console.error("get products error", error);
    return res.status(500).json({ message: "Бараа авахад алдаа гарлаа", error: String(error) });
  }
});

/* ─── GET /products/:id ─────────────────────────────────────────────── */
router.get("/products/:id", async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id, deletedAt: null },
      include: {
        images: { select: { id: true, url: true } },
        businessCategory: { select: { id: true, name: true, slug: true } },
        organization: { select: { id: true, name: true, logoUrl: true } },
        discounts: {
          where: { isActive: true, validUntil: { gte: new Date() } },
          select: { percent: true, validUntil: true },
          take: 1,
        },
      },
    });
    if (!product) return res.status(404).json({ message: "Бараа олдсонгүй" });
    return res.json(product);
  } catch (error) {
    return res.status(500).json({ message: "Алдаа гарлаа", error: String(error) });
  }
});

/* ─── POST /products ────────────────────────────────────────────────── */
router.post("/products", async (req, res) => {
  try {
    const {
      organizationId,
      name,
      description,
      sku,
      price,
      costPrice,
      stock,
      businessCategoryId,
      images, // string[] — base64 or URL
    } = req.body;

    if (!organizationId || !name || price === undefined) {
      return res.status(400).json({ message: "organizationId, name, price шаардлагатай" });
    }

    const priceNum = parseFloat(String(price));
    if (isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({ message: "Үнэ буруу байна" });
    }

    const stockNum = stock ? parseInt(String(stock)) : 0;
    if (isNaN(stockNum) || stockNum < 0 || stockNum > 2_147_483_647) {
      return res.status(400).json({ message: "Нөөц 0-2,147,483,647 хооронд байх ёстой" });
    }

    // Validate max 5 images
    const imageUrls: string[] = Array.isArray(images) ? images.slice(0, 5) : [];

    const product = await prisma.product.create({
      data: {
        organizationId,
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
        sku: sku ? String(sku).trim() : null,
        price: priceNum,
        costPrice: costPrice ? parseFloat(String(costPrice)) : null,
        stock: stockNum,
        businessCategoryId: businessCategoryId || null,
        isActive: true,
        images: {
          create: imageUrls.map((url) => ({ url })),
        },
      },
      include: {
        images: { select: { id: true, url: true } },
        businessCategory: { select: { id: true, name: true, slug: true } },
      },
    });

    return res.status(201).json(product);
  } catch (error) {
    console.error("create product error", error);
    return res.status(500).json({ message: "Бараа үүсгэхэд алдаа гарлаа", error: String(error) });
  }
});

/* ─── PATCH /products/:id ───────────────────────────────────────────── */
router.patch("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      sku,
      price,
      costPrice,
      stock,
      businessCategoryId,
      isActive,
      images, // full replacement: string[]
    } = req.body;

    const existing = await prisma.product.findUnique({ where: { id, deletedAt: null } });
    if (!existing) return res.status(404).json({ message: "Бараа олдсонгүй" });

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = String(name).trim();
    if (description !== undefined) data.description = description ? String(description).trim() : null;
    if (sku !== undefined) data.sku = sku ? String(sku).trim() : null;
    if (price !== undefined) {
      const p = parseFloat(String(price));
      if (isNaN(p) || p < 0) return res.status(400).json({ message: "Үнэ буруу байна" });
      data.price = p;
    }
    if (costPrice !== undefined) data.costPrice = costPrice ? parseFloat(String(costPrice)) : null;
    if (stock !== undefined) {
      const s = parseInt(String(stock));
      if (isNaN(s) || s < 0 || s > 2_147_483_647) return res.status(400).json({ message: "Нөөц 0-2,147,483,647 хооронд байх ёстой" });
      data.stock = s;
    }
    if (businessCategoryId !== undefined) data.businessCategoryId = businessCategoryId || null;
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    // Replace images if provided
    if (Array.isArray(images)) {
      const imageUrls = images.slice(0, 5);
      await prisma.productImage.deleteMany({ where: { productId: id } });
      data.images = { create: imageUrls.map((url: string) => ({ url })) };
    }

    const product = await prisma.product.update({
      where: { id },
      data,
      include: {
        images: { select: { id: true, url: true } },
        businessCategory: { select: { id: true, name: true, slug: true } },
      },
    });

    return res.json(product);
  } catch (error) {
    console.error("update product error", error);
    return res.status(500).json({ message: "Бараа засахад алдаа гарлаа", error: String(error) });
  }
});

/* ─── DELETE /products/:id ──────────────────────────────────────────── */
router.delete("/products/:id", async (req, res) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id, deletedAt: null } });
    if (!existing) return res.status(404).json({ message: "Бараа олдсонгүй" });

    await prisma.product.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date(), isActive: false },
    });

    return res.json({ message: "Бараа устгагдлаа" });
  } catch (error) {
    return res.status(500).json({ message: "Бараа устгахад алдаа гарлаа", error: String(error) });
  }
});

export default router;
