import { Router, type Router as ExpressRouter } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import crypto from "crypto";
import path from "path";
import JSZip from "jszip";
import { prisma } from "@mgl/database";
import { Permission } from "@mgl/types";
import { requireAuth } from "../../middleware/auth";
import { requireOrgPermission, assertOrgPermission } from "../../services/permission.service";
import { getSupabase, PRODUCT_IMAGES_BUCKET } from "../../lib/supabase";

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

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per image
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Зөвхөн JPG, PNG, WebP, GIF зурагнууд зөвшөөрөгдөнө"));
    }
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
        "Зураг": "(зургаа энд оруулна)",
        "Нэр (name)": "Жишээ бараа 1",
        "SKU (sku)": "SKU-001",
        "Үнэ (price)": 25000,
        "Өртөг (costPrice)": 15000,
        "Нөөц (stock)": 100,
        "Тайлбар (description)": "Барааны тайлбар энд бичнэ",
      },
      {
        "Зураг": "(зургаа энд оруулна)",
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
      { wch: 18 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 35 },
    ];
    // Make image column rows taller for pasting images
    ws["!rows"] = [{ hpt: 20 }, { hpt: 60 }, { hpt: 60 }];
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

/* ─── Extract embedded images from xlsx ──────────────────────────────── */
async function extractExcelImages(buffer: Buffer): Promise<Map<number, Buffer[]>> {
  const rowImages = new Map<number, Buffer[]>();
  try {
    const zip = await JSZip.loadAsync(buffer);
    const allFiles = Object.keys(zip.files);
    const mediaFiles = allFiles.filter((f) => f.startsWith("xl/media/"));
    console.log("[excel-images] Total files:", allFiles.length, "Media files:", mediaFiles.length);

    if (mediaFiles.length === 0) {
      console.log("[excel-images] No media files found in xlsx");
      return rowImages;
    }

    // Strategy 1: Try drawing-based extraction (floating images / "Place over Cells")
    const relsMap = new Map<string, string>();
    const drawingRelsFiles = allFiles.filter(
      (f) => /xl\/drawings\/_rels\/drawing\d+\.xml\.rels/.test(f)
    );

    for (const relsFile of drawingRelsFiles) {
      const relsXml = await zip.file(relsFile)!.async("text");
      const relMatches = relsXml.matchAll(/Id="(rId\d+)"[^>]*Target="([^"]+)"/g);
      for (const m of relMatches) {
        const target = m[2].startsWith("../") ? m[2].replace("../", "xl/") : `xl/drawings/${m[2]}`;
        relsMap.set(m[1], target);
      }
    }

    const drawingFiles = allFiles.filter(
      (f) => /xl\/drawings\/drawing\d+\.xml$/.test(f)
    );

    let drawingImagesFound = false;
    for (const drawingFile of drawingFiles) {
      const xml = await zip.file(drawingFile)!.async("text");
      const anchorBlocks = xml.matchAll(/<xdr:(?:twoCellAnchor|oneCellAnchor)[^>]*>([\s\S]*?)<\/xdr:(?:twoCellAnchor|oneCellAnchor)>/g);
      for (const block of anchorBlocks) {
        const content = block[1];
        const rowMatch = content.match(/<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/);
        const embedMatch = content.match(/r:embed="(rId\d+)"/);

        if (rowMatch && embedMatch) {
          const row = parseInt(rowMatch[1]);
          const mediaPath = relsMap.get(embedMatch[1]);
          if (mediaPath) {
            const mediaFile = zip.file(mediaPath);
            if (mediaFile) {
              const imgBuffer = Buffer.from(await mediaFile.async("arraybuffer"));
              const existing = rowImages.get(row) || [];
              existing.push(imgBuffer);
              rowImages.set(row, existing);
              drawingImagesFound = true;
            }
          }
        }
      }
    }

    if (drawingImagesFound) {
      console.log("[excel-images] Drawing strategy: found images for rows:", [...rowImages.keys()]);
      return rowImages;
    }

    // Strategy 2: If no drawing images found, try sequential assignment
    // (images are in xl/media/ but placed in cells or as "Place in Cell")
    // Sort media files by name (image1, image2, ...) and assign to rows sequentially
    console.log("[excel-images] No drawing-placed images. Trying sequential media assignment...");
    const sortedMedia = mediaFiles.sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || "0");
      const numB = parseInt(b.match(/\d+/)?.[0] || "0");
      return numA - numB;
    });

    // Read the sheet to find how many data rows exist
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const rows = sheetName ? XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) : [];
    const dataRowCount = rows.length;

    console.log("[excel-images] Media files:", sortedMedia.length, "Data rows:", dataRowCount);

    // Assign images to rows 1..N (row 0 is header)
    // If image count matches data row count, assign 1:1
    if (sortedMedia.length > 0 && sortedMedia.length <= dataRowCount * 5) {
      const imagesPerRow = Math.ceil(sortedMedia.length / dataRowCount);
      for (let i = 0; i < sortedMedia.length; i++) {
        const mediaFile = zip.file(sortedMedia[i]);
        if (mediaFile) {
          const imgBuffer = Buffer.from(await mediaFile.async("arraybuffer"));
          // row index: 0-based, row 0 = header, row 1 = first data row
          const rowIdx = Math.floor(i / imagesPerRow) + 1;
          const existing = rowImages.get(rowIdx) || [];
          if (existing.length < 5) {
            existing.push(imgBuffer);
            rowImages.set(rowIdx, existing);
          }
        }
      }
      console.log("[excel-images] Sequential strategy: assigned images to rows:", [...rowImages.keys()]);
    }
  } catch (err) {
    console.error("extractExcelImages error:", err);
  }
  return rowImages;
}

function getImageMimeType(buf: Buffer): string {
  if (buf[0] === 0xFF && buf[1] === 0xD8) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf[0] === 0x47 && buf[1] === 0x49) return "image/gif";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return "image/png"; // fallback
}

function getImageExt(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg", "image/png": ".png",
    "image/gif": ".gif", "image/webp": ".webp",
  };
  return map[mime] || ".png";
}

async function uploadBufferToSupabase(buf: Buffer): Promise<string | null> {
  try {
    const mime = getImageMimeType(buf);
    const ext = getImageExt(mime);
    const fileName = `products/${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;

    const { error } = await getSupabase().storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(fileName, buf, { contentType: mime, upsert: false });

    if (error) {
      console.error("supabase upload error", error);
      return null;
    }

    const { data } = getSupabase().storage
      .from(PRODUCT_IMAGES_BUCKET)
      .getPublicUrl(fileName);

    return data.publicUrl;
  } catch (err) {
    console.error("uploadBufferToSupabase error", err);
    return null;
  }
}

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

      // Extract embedded images from xlsx (row → image buffers)
      const embeddedImages = await extractExcelImages(req.file.buffer);
      console.log("[import] Embedded images map has", embeddedImages.size, "rows with images");

      // Count media files for debug
      let mediaFileCount = 0;
      try {
        const z = await JSZip.loadAsync(req.file.buffer);
        mediaFileCount = Object.keys(z.files).filter((f) => f.startsWith("xl/media/")).length;
      } catch { /* ignore */ }

      // Column name mapping — supports both Mongolian & English headers
      const colMap = {
        name:        ["name", "Нэр", "нэр", "Нэр (name)", "Барааны нэр"],
        sku:         ["sku", "SKU", "Код", "код", "SKU (sku)", "№"],
        price:       ["price", "Үнэ", "үнэ", "Үнэ (price)", "Ф50", "Ф100"],
        costPrice:   ["costPrice", "Өртөг", "өртөг", "Өртөг (costPrice)", "Өртөг үнэ"],
        stock:       ["stock", "Нөөц", "нөөц", "Нөөц (stock)", "Тоо ширхэг"],
        description: ["description", "Тайлбар", "тайлбар", "Тайлбар (description)"],
        images:      ["images", "Зураг", "зураг", "Зураг URL", "Зураг URL (images)", "Image", "image"],
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
        _debug?: { embeddedImageRows: number; mediaFiles: number };
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
        const imagesRaw = resolveCol(row, colMap.images);

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
          // Parse image URLs (comma-separated) from text column
          let imageUrls: string[] = imagesRaw
            ? String(imagesRaw).split(",").map((u) => u.trim()).filter((u) => u.startsWith("http")).slice(0, 5)
            : [];

          // If no URL images, check for embedded images in this row
          // Row index in drawing is 0-based: row 0 = header, row 1 = first data row (i=0)
          if (imageUrls.length === 0) {
            const rowBuffers = embeddedImages.get(i + 1); // i+1 because row 0 is header
            console.log(`[import] Row ${i+1}: embedded buffers = ${rowBuffers?.length ?? 0}`);
            if (rowBuffers && rowBuffers.length > 0) {
              const uploadPromises = rowBuffers.slice(0, 5).map((buf) => uploadBufferToSupabase(buf));
              const uploaded = await Promise.all(uploadPromises);
              imageUrls = uploaded.filter((u): u is string => u !== null);
              console.log(`[import] Row ${i+1}: uploaded ${imageUrls.length} images`);
            }
          }

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
              ...(imageUrls.length > 0 && {
                images: { create: imageUrls.map((url) => ({ url })) },
              }),
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
        _debug: { embeddedImageRows: embeddedImages.size, mediaFiles: mediaFileCount },
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

/* ─── POST /products/upload-image ────────────────────────────────────── */
router.post("/products/upload-image", requireAuth, imageUpload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Зураг файл шаардлагатай" });
    }

    const ext = path.extname(req.file.originalname).toLowerCase() || ".jpg";
    const fileName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
    const filePath = `products/${fileName}`;

    const { error } = await getSupabase().storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error("supabase upload error", error);
      return res.status(500).json({ message: "Зураг upload хийхэд алдаа гарлаа", error: error.message });
    }

    const { data: publicUrlData } = getSupabase().storage
      .from(PRODUCT_IMAGES_BUCKET)
      .getPublicUrl(filePath);

    return res.json({ url: publicUrlData.publicUrl });
  } catch (error) {
    console.error("upload image error", error);
    return res.status(500).json({ message: "Зураг upload хийхэд алдаа гарлаа", error: String(error) });
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
