import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";

const router: ExpressRouter = Router();

router.get("/business-categories", async (_req, res) => {
  try {
    const categories = await prisma.businessCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        icon: true,
        sortOrder: true,
      },
    });
    res.json(categories);
  } catch (error) {
    console.error("get business-categories error", error);
    res.status(500).json({ message: "Ангиллуудыг авахад алдаа гарлаа" });
  }
});

router.get("/admin/business-categories-all", async (_req, res) => {
  try {
    const categories = await prisma.businessCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    res.json(categories);
  } catch (error) {
    console.error("get all business-categories error", error);
    res.status(500).json({ message: "Бүх ангиллыг авахад алдаа гарлаа" });
  }
});

router.post("/admin/business-categories", async (req, res) => {
  try {
    const { slug, name, icon, sortOrder } = req.body;

    if (!slug?.trim() || !name?.trim()) {
      return res.status(400).json({ message: "slug болон name шаардлагатай" });
    }

    const existing = await prisma.businessCategory.findUnique({
      where: { slug },
    });
    if (existing) {
      return res
        .status(409)
        .json({ message: "Ийм slug-тай ангилал аль хэдийн байна" });
    }

    const category = await prisma.businessCategory.create({
      data: {
        slug: slug.trim().toLowerCase(),
        name: name.trim(),
        icon: icon?.trim() || null,
        sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      },
    });

    res.status(201).json(category);
  } catch (error) {
    console.error("create business-category error", error);
    res.status(500).json({ message: "Ангилал үүсгэхэд алдаа гарлаа" });
  }
});

router.patch("/admin/business-categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon, sortOrder, isActive } = req.body;

    const updated = await prisma.businessCategory.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(icon !== undefined && { icon: icon?.trim() || null }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json(updated);
  } catch (error: any) {
    if (error?.code === "P2025") {
      return res.status(404).json({ message: "Ангилал олдсонгүй" });
    }
    console.error("update business-category error", error);
    res.status(500).json({ message: "Ангилал засахад алдаа гарлаа" });
  }
});

router.delete("/admin/business-categories/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.businessCategory.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: "Ангилал идэвхгүй болгогдлоо" });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return res.status(404).json({ message: "Ангилал олдсонгүй" });
    }
    console.error("delete business-category error", error);
    res.status(500).json({ message: "Ангилал устгахад алдаа гарлаа" });
  }
});

export default router;
