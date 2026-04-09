import { Router, type Router as ExpressRouter } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { prisma } from "@mgl/database";
import { Permission } from "@mgl/types";
import { requireAuth } from "../../middleware/auth";
import { requireOrgPermission, assertOrgPermission } from "../../services/permission.service";

const router: ExpressRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    cb(null, allowed.includes(file.mimetype) || file.originalname.endsWith(".xlsx") || file.originalname.endsWith(".xls"));
  },
});

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

/* ─── GET /products/import-template ──────────────────────────────────── */
router.get("/products/import-template", (_req, res) => {
  try {
    const templateData = [
      {
        "Нэр (name)": "Жишээ бараа 1",
        "SKU (sku)": "SKU-001",
        "Үнэ (price)": 25000,
        "Өртөг (costPrice)": 15000,
        "Нөөц (stock)": 100,
        "Тайлбар (description)": "Барааны тайлбар энд бичнэ",
      },
      {
        "Нэр (name)": "Жишээ бараа 2",
        "SKU (sku)": "SKU-002",
        "Үнэ (price)": 50000,
        "Өртөг (costPrice)": 30000,
        "Нөөц (stock)": 50,
        "Тайлбар (description)": "",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    ws["!cols"] = [
      { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 35 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Бараа");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", 'attachment; filename="product_import_template.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    return res.send(Buffer.from(buf));
  } catch (error) {
    console.error("template download error", error);
    return res.status(500).json({ message: "Template татахад алдаа гарлаа" });
  }
});

/* ─── POST /products/import ─────────────────────────────────────────── */
router.post(
  "/products/import",
  requireAuth,
  upload.single("file"),
  async (req, res) => {
    try {
      const organizationId = req.body.organizationId;
      if (!organizationId) {
        return res.status(400).json({ message: "organizationId шаардлагатай" });
      }

      const perm = await assertOrgPermission(req, res, organizationId, Permission.MANAGE_PRODUCTS);
      if (!perm) return;

      if (!req.file) {
        return res.status(400).json({ message: "Excel файл шаардлагатай (.xlsx, .xls)" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return res.status(400).json({ message: "Excel файл хоосон байна" });
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName]);
      if (!rows.length) {
        return res.status(400).json({ message: "Excel файлд мэдээлэл олдсонгүй" });
      }

      if (rows.length > 1000) {
        return res.status(400).json({ message: "Нэг удаад 1000-аас олон бараа оруулах боломжгүй" });
      }

      // Column name mapping — supports both Mongolian & English headers
      const colMap = {
        name:        ["name", "Нэр", "нэр", "Нэр (name)", "Барааны нэр"],
        sku:         ["sku", "SKU", "Код", "код", "SKU (sku)"],
        price:       ["price", "Үнэ", "үнэ", "Үнэ (price)"],
        costPrice:   ["costPrice", "Өртөг", "өртөг", "Өртөг (costPrice)", "Өртөг үнэ"],
        stock:       ["stock", "Нөөц", "нөөц", "Нөөц (stock)", "Тоо ширхэг"],
        description: ["description", "Тайлбар", "тайлбар", "Тайлбар (description)"],
      };

      const resolveCol = (row: Record<string, unknown>, keys: string[]): unknown => {
        for (const key of keys) {
          if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
        }
        return undefined;
      };

      const results: {
        created: number;
        skipped: number;
        errors: string[];
        products: Array<{ id: string; name: string; sku: string | null; price: number; stock: number }>;
      } = { created: 0, skipped: 0, errors: [], products: [] };

      // Collect all SKUs in advance for batch duplicate check
      const skusInFile = new Map<string, number>();
      for (let i = 0; i < rows.length; i++) {
        const sku = resolveCol(rows[i], colMap.sku);
        if (sku) {
          const normalized = String(sku).trim().toLowerCase();
          if (skusInFile.has(normalized)) {
            results.errors.push(`Мөр ${i + 2}: SKU "${String(sku).trim()}" файл дотор давхардсан (мөр ${skusInFile.get(normalized)})`);
          } else {
            skusInFile.set(normalized, i + 2);
          }
        }
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;

        const name = resolveCol(row, colMap.name);
        const sku = resolveCol(row, colMap.sku);
        const price = resolveCol(row, colMap.price);
        const costPrice = resolveCol(row, colMap.costPrice);
        const stock = resolveCol(row, colMap.stock);
        const description = resolveCol(row, colMap.description);

        if (!name || price === undefined) {
          results.errors.push(`Мөр ${rowNum}: Нэр болон үнэ заавал шаардлагатай`);
          results.skipped++;
          continue;
        }

        const priceNum = parseFloat(String(price));
        if (isNaN(priceNum) || priceNum < 0) {
          results.errors.push(`Мөр ${rowNum}: Үнэ буруу — "${price}"`);
          results.skipped++;
          continue;
        }

        const costPriceNum = costPrice !== undefined ? parseFloat(String(costPrice)) : null;
        if (costPriceNum !== null && (isNaN(costPriceNum) || costPriceNum < 0)) {
          results.errors.push(`Мөр ${rowNum}: Өртөг үнэ буруу — "${costPrice}"`);
          results.skipped++;
          continue;
        }

        const stockNum = stock !== undefined ? parseInt(String(stock)) : 0;
        if (isNaN(stockNum) || stockNum < 0 || stockNum > 2_147_483_647) {
          results.errors.push(`Мөр ${rowNum}: Нөөц буруу — "${stock}"`);
          results.skipped++;
          continue;
        }

        const normalizedSku = sku ? String(sku).trim() : null;
        if (normalizedSku) {
          const existing = await prisma.product.findFirst({
            where: { organizationId, sku: normalizedSku, deletedAt: null },
            select: { id: true },
          });
          if (existing) {
            results.errors.push(`Мөр ${rowNum}: SKU "${normalizedSku}" аль хэдийн бүртгэлтэй`);
            results.skipped++;
            continue;
          }
        }

        try {
          const product = await prisma.product.create({
            data: {
              organizationId,
              name: String(name).trim(),
              description: description ? String(description).trim() : null,
              sku: normalizedSku,
              price: priceNum,
              costPrice: costPriceNum,
              stock: stockNum,
              isActive: true,
            },
            select: { id: true, name: true, sku: true, price: true, stock: true },
          });
          results.products.push({
            id: product.id,
            name: product.name,
            sku: product.sku,
            price: Number(product.price),
            stock: product.stock,
          });
          results.created++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          results.errors.push(`Мөр ${rowNum}: ${msg}`);
          results.skipped++;
        }
      }

      return res.json({
        message: `${results.created} бараа амжилттай бүртгэгдлээ`,
        total: rows.length,
        ...results,
      });
    } catch (error) {
      console.error("import products error", error);
      return res.status(500).json({ message: "Excel импорт хийхэд алдаа гарлаа", error: String(error) });
    }
  }
);

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
router.post("/products", requireAuth, requireOrgPermission({ from: "body" }, Permission.MANAGE_PRODUCTS), async (req, res) => {
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

    const costPriceNum =
      costPrice === undefined || costPrice === null || costPrice === ""
        ? null
        : parseFloat(String(costPrice));
    if (costPriceNum !== null && (isNaN(costPriceNum) || costPriceNum < 0)) {
      return res.status(400).json({ message: "Өртөг үнэ буруу байна" });
    }

    const stockNum = stock ? parseInt(String(stock)) : 0;
    if (isNaN(stockNum) || stockNum < 0 || stockNum > 2_147_483_647) {
      return res.status(400).json({ message: "Нөөц 0-2,147,483,647 хооронд байх ёстой" });
    }

    const normalizedSku = sku ? String(sku).trim() : null;
    if (normalizedSku) {
      const existingSku = await prisma.product.findFirst({
        where: {
          organizationId,
          sku: normalizedSku,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (existingSku) {
        return res.status(409).json({ message: "Ижил SKU-тэй бараа аль хэдийн бүртгэлтэй байна" });
      }
    }

    if (businessCategoryId) {
      const category = await prisma.businessCategory.findUnique({
        where: { id: String(businessCategoryId) },
        select: { id: true },
      });
      if (!category) {
        return res.status(400).json({ message: "Сонгосон ангилал олдсонгүй" });
      }
    }

    // Validate max 5 images
    const imageUrls: string[] = Array.isArray(images) ? images.slice(0, 5) : [];

    const product = await prisma.product.create({
      data: {
        organizationId,
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
        sku: normalizedSku,
        price: priceNum,
        costPrice: costPriceNum,
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
    const maybePrisma = error as { code?: string; meta?: { target?: unknown } };
    if (maybePrisma?.code === "P2002") {
      const target = Array.isArray(maybePrisma.meta?.target)
        ? maybePrisma.meta?.target.join(",")
        : String(maybePrisma.meta?.target || "");
      if (target.includes("organizationId") && target.includes("sku")) {
        return res.status(409).json({ message: "Ижил SKU-тэй бараа аль хэдийн бүртгэлтэй байна" });
      }
      return res.status(409).json({
        message: target
          ? `Давхардсан утга байна (${target})`
          : "Давхардсан утга байна",
      });
    }
    if (maybePrisma?.code === "P2003") {
      return res.status(400).json({ message: "Холбоотой өгөгдөл буруу байна (ангилал/байгууллага шалгана уу)" });
    }
    console.error("create product error", error);
    return res.status(500).json({ message: "Бараа үүсгэхэд алдаа гарлаа", error: String(error) });
  }
});

/* ─── PATCH /products/:id ───────────────────────────────────────────── */
router.patch("/products/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id as string;
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

    const perm = await assertOrgPermission(req, res, existing.organizationId, Permission.MANAGE_PRODUCTS);
    if (!perm) return;

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

/* ─── PATCH /products/:id/images ────────────────────────────────────── */
router.patch("/products/:id/images", requireAuth, async (req, res) => {
  try {
    const id = req.params.id as string;
    const { images } = req.body;

    if (!Array.isArray(images)) {
      return res.status(400).json({ message: "images талбар шаардлагатай (string[])" });
    }

    const existing = await prisma.product.findUnique({ where: { id, deletedAt: null } });
    if (!existing) return res.status(404).json({ message: "Бараа олдсонгүй" });

    const perm = await assertOrgPermission(req, res, existing.organizationId, Permission.MANAGE_PRODUCTS);
    if (!perm) return;

    const imageUrls = images.slice(0, 5);
    await prisma.productImage.deleteMany({ where: { productId: id } });

    const product = await prisma.product.update({
      where: { id },
      data: {
        images: { create: imageUrls.map((url: string) => ({ url })) },
      },
      include: {
        images: { select: { id: true, url: true } },
      },
    });

    return res.json(product);
  } catch (error) {
    console.error("update product images error", error);
    return res.status(500).json({ message: "Зураг шинэчлэхэд алдаа гарлаа", error: String(error) });
  }
});

/* ─── DELETE /products/:id ──────────────────────────────────────────── */
router.delete("/products/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.product.findUnique({ where: { id, deletedAt: null } });
    if (!existing) return res.status(404).json({ message: "Бараа олдсонгүй" });

    const perm = await assertOrgPermission(req, res, existing.organizationId, Permission.MANAGE_PRODUCTS);
    if (!perm) return;

    await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    return res.json({ message: "Бараа устгагдлаа" });
  } catch (error) {
    return res.status(500).json({ message: "Бараа устгахад алдаа гарлаа", error: String(error) });
  }
});

export default router;
