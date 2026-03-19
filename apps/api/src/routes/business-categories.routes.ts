import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";

const router: ExpressRouter = Router();

// Public: get active categories (supports ?level=0 to filter by level)
router.get("/business-categories", async (req, res) => {
  try {
    const where: { isActive: boolean; level?: number } = { isActive: true };
    if (req.query.level !== undefined) {
      where.level = Number(req.query.level);
    }
    const categories = await prisma.businessCategory.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        icon: true,
        sortOrder: true,
        parentId: true,
        level: true,
      },
    });
    // Return flat list — frontend builds tree if needed
    res.json(categories);
  } catch (error) {
    console.error("get business-categories error", error);
    res.status(500).json({ message: "Ангиллуудыг авахад алдаа гарлаа" });
  }
});

// Public: get categories as nested tree
router.get("/business-categories/tree", async (_req, res) => {
  try {
    const all = await prisma.businessCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        icon: true,
        sortOrder: true,
        parentId: true,
        level: true,
      },
    });

    // Build tree: level 0 → level 1 → level 2
    const roots = all.filter((c) => !c.parentId);
    const buildTree = (parentId: string): any[] => {
      return all
        .filter((c) => c.parentId === parentId)
        .map((c) => ({ ...c, children: buildTree(c.id) }));
    };

    const tree = roots.map((r) => ({ ...r, children: buildTree(r.id) }));
    res.json(tree);
  } catch (error) {
    console.error("get business-categories tree error", error);
    res.status(500).json({ message: "Ангиллуудыг авахад алдаа гарлаа" });
  }
});

// Admin: get ALL categories (including inactive) as flat list
router.get("/admin/business-categories-all", async (_req, res) => {
  try {
    const categories = await prisma.businessCategory.findMany({
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    });
    res.json(categories);
  } catch (error) {
    console.error("get all business-categories error", error);
    res.status(500).json({ message: "Бүх ангиллыг авахад алдаа гарлаа" });
  }
});

// Admin: create category
router.post("/admin/business-categories", async (req, res) => {
  try {
    const { slug, name, icon, sortOrder, parentId } = req.body;

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

    // Determine level from parent
    let level = 0;
    if (parentId) {
      const parent = await prisma.businessCategory.findUnique({
        where: { id: parentId },
      });
      if (!parent) {
        return res.status(400).json({ message: "Эцэг ангилал олдсонгүй" });
      }
      if (parent.level >= 2) {
        return res
          .status(400)
          .json({ message: "3-аас дээш түвшин нэмэх боломжгүй" });
      }
      level = parent.level + 1;
    }

    const category = await prisma.businessCategory.create({
      data: {
        slug: slug.trim().toLowerCase(),
        name: name.trim(),
        icon: icon?.trim() || null,
        sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
        parentId: parentId || null,
        level,
      },
    });

    res.status(201).json(category);
  } catch (error) {
    console.error("create business-category error", error);
    res.status(500).json({ message: "Ангилал үүсгэхэд алдаа гарлаа" });
  }
});

// Admin: update category
router.patch("/admin/business-categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon, sortOrder, isActive, parentId } = req.body;

    // If parentId is being changed, recalculate level
    let level: number | undefined;
    if (parentId !== undefined) {
      if (parentId === null) {
        level = 0;
      } else {
        const parent = await prisma.businessCategory.findUnique({
          where: { id: parentId },
        });
        if (!parent) {
          return res.status(400).json({ message: "Эцэг ангилал олдсонгүй" });
        }
        if (parent.level >= 2) {
          return res
            .status(400)
            .json({ message: "3-аас дээш түвшин нэмэх боломжгүй" });
        }
        level = parent.level + 1;
      }
    }

    const updated = await prisma.businessCategory.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(icon !== undefined && { icon: icon?.trim() || null }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
        ...(parentId !== undefined && { parentId: parentId || null }),
        ...(level !== undefined && { level }),
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

// Admin: soft delete
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
