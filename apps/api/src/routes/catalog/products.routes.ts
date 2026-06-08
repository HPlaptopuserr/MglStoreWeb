import { Router, type Router as ExpressRouter } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import crypto from "crypto";
import path from "path";
import JSZip from "jszip";
import { InventoryReason, prisma } from "@mgl/database";
import type { PrismaClient } from "@prisma/client";
import { Permission } from "@mgl/types";
import { optionalAuth, requireAuth } from "../../middleware/auth";
import { requireOrgPermission, assertOrgPermission } from "../../services/permission.service";
import { getSupabase, PRODUCT_IMAGES_BUCKET } from "../../lib/supabase";
import { requireActivePlan, checkProductLimit, checkImportLimit } from "../../middleware/plan-guard";
import {
  canBypassAllWebProductsVisibility,
  canBypassWebProductsVisibility,
  getWebProductsEnabledOrganizationIds,
  isOrgWebProductsEnabled,
} from "../../services/product-visibility.service";
import {
  extractExcelImages,
  uploadBufferToSupabase,
  PRODUCT_COL_MAP,
  normalizeExcelRow,
  resolveCol,
} from "../../lib/excel-import";

const router: ExpressRouter = Router();

type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

const normalizeSupplyType = (value: unknown) =>
  String(value || "").trim().toUpperCase() === "CHINA_PREORDER" ? "CHINA_PREORDER" : "IN_STOCK";

const normalizePreorderLeadTimeDays = (value: unknown) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 365) return undefined;
  return parsed;
};

const PREORDER_PRODUCTS_FEATURE_KEY = "preorder-products-enabled";
const TRUE_VALUES = new Set(["1", "true", "on", "yes"]);

const getExpirySortValue = (value?: Date | string | null) => {
  if (!value) return Number.POSITIVE_INFINITY;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
};

const getStartOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const isTruthyQueryValue = (value: unknown) =>
  TRUE_VALUES.has(String(value ?? "").trim().toLowerCase());

const getInventoryExpiryFilter = (includeExpired: boolean) =>
  includeExpired ? { not: null } : { gte: getStartOfToday() };

const parseOptionalExpiryDate = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const date = new Date(String(value));
  return Number.isFinite(date.getTime()) ? date : undefined;
};

async function resolveProductInventoryWarehouseId(
  tx: Tx,
  organizationId: string,
  productId: string,
  createdById?: string | null,
) {
  const existingInventory = await tx.warehouseInventory.findFirst({
    where: { productId },
    orderBy: { updatedAt: "desc" },
    select: { warehouseId: true },
  });
  if (existingInventory) return existingInventory.warehouseId;

  const assignment = await tx.warehouseOrganization.findFirst({
    where: {
      organizationId,
      warehouse: { deletedAt: null, isActive: true },
    },
    orderBy: { assignedAt: "asc" },
    select: { warehouseId: true },
  });

  if (assignment) return assignment.warehouseId;

  const organization = await tx.organization.findFirst({
    where: { id: organizationId, deletedAt: null },
    select: { name: true, address: true },
  });
  if (!organization) return null;

  const warehouse = await tx.warehouse.create({
    data: {
      name: `${organization.name} - Үндсэн агуулах`,
      address: organization.address || "Vendor барааны үндсэн агуулах",
      capacity: 0,
      createdById: createdById ?? null,
      isActive: true,
      organizations: {
        create: {
          organizationId,
          assignedById: createdById ?? null,
        },
      },
    },
    select: { id: true },
  });

  return warehouse.id;
}

async function syncProductStock(tx: Tx, productId: string) {
  const result = await tx.warehouseInventory.aggregate({
    where: { productId },
    _sum: { quantity: true },
  });

  await tx.product.update({
    where: { id: productId },
    data: { stock: result._sum.quantity ?? 0 },
  });
}

async function findProductExpiryDate(tx: Tx, productId: string, includeExpired = true) {
  const inventory = await tx.warehouseInventory.findFirst({
    where: {
      productId,
      quantity: { gt: 0 },
      expiryDate: getInventoryExpiryFilter(includeExpired),
    },
    select: { expiryDate: true },
    orderBy: { expiryDate: "asc" },
  });

  return inventory?.expiryDate ?? null;
}

async function upsertVendorProductInventory(
  tx: Tx,
  input: {
    organizationId: string;
    productId: string;
    stock?: number;
    stockProvided: boolean;
    expiryDate?: Date | null;
    expiryDateProvided: boolean;
    createdById?: string | null;
  },
) {
  if (!input.stockProvided && !input.expiryDateProvided) return;

  const warehouseId = await resolveProductInventoryWarehouseId(
    tx,
    input.organizationId,
    input.productId,
    input.createdById,
  );

  if (!warehouseId) return;

  const existing = await tx.warehouseInventory.findUnique({
    where: { warehouseId_productId: { warehouseId, productId: input.productId } },
    select: { quantity: true },
  });
  const oldQuantity = existing?.quantity ?? 0;
  const nextQuantity = input.stockProvided ? input.stock ?? 0 : oldQuantity;

  if (!existing && nextQuantity <= 0 && !input.expiryDateProvided) return;

  if (existing) {
    await tx.warehouseInventory.update({
      where: { warehouseId_productId: { warehouseId, productId: input.productId } },
      data: {
        ...(input.stockProvided ? { quantity: nextQuantity } : {}),
        ...(input.expiryDateProvided ? { expiryDate: input.expiryDate ?? null } : {}),
        ...(input.stockProvided && nextQuantity > oldQuantity
          ? { lastRestockedAt: new Date() }
          : {}),
      },
    });
  } else {
    await tx.warehouseInventory.create({
      data: {
        warehouseId,
        productId: input.productId,
        quantity: nextQuantity,
        expiryDate: input.expiryDateProvided ? input.expiryDate ?? null : null,
        lastRestockedAt: nextQuantity > 0 ? new Date() : null,
      },
    });
  }

  const diff = nextQuantity - oldQuantity;
  if (input.stockProvided && diff !== 0) {
    await tx.inventoryLedger.create({
      data: {
        productId: input.productId,
        change: diff,
        reason: existing ? InventoryReason.RESTOCK : InventoryReason.INITIAL_STOCK,
        note: "Vendor барааны нөөц шинэчилсэн",
        createdById: input.createdById ?? null,
      },
    });
  }

  if (input.stockProvided) {
    await syncProductStock(tx, input.productId);
  }
}

async function isOrgFeatureEnabled(
  organizationId: string,
  featureKey: string,
  defaultEnabled = false,
) {
  const setting = await prisma.siteSetting.findUnique({
    where: { key: `${featureKey}-${organizationId}` },
    select: { value: true },
  });
  const raw = setting?.value;
  if (raw === undefined || raw === null || raw === "") return defaultEnabled;
  return TRUE_VALUES.has(String(raw).trim().toLowerCase());
}

/* ─── GET /products/health — check env config ───────────────────────── */
router.get("/products/health", (_req, res) => {
  return res.json({
    supabaseUrl: process.env.SUPABASE_URL ? "set" : "MISSING",
    supabaseKey: process.env.SUPABASE_SERVICE_KEY ? "set" : "MISSING",
    nodeEnv: process.env.NODE_ENV || "not set",
  });
});

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
router.get("/products", optionalAuth, async (req, res) => {
  try {
    const { organizationId, businessCategoryId } = req.query as Record<string, string>;
    const search = String(req.query.search ?? req.query.q ?? "").trim();
    const includeExpiredInventory = isTruthyQueryValue(req.query.includeExpiredInventory);
    const includeInactive = isTruthyQueryValue(req.query.includeInactive)
      && canBypassAllWebProductsVisibility(req);
    const requestedOrganizationId = organizationId ? String(organizationId) : "";
    const rawLimit = parseInt(String(req.query.limit || ""), 10);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(100, rawLimit)
      : 0;

    const where: any = {
      deletedAt: null,
      organization: { deletedAt: null, status: "ACTIVE" },
    };
    if (!includeInactive) where.isActive = true;
    if (organizationId) where.organizationId = organizationId;
    if (businessCategoryId) where.businessCategoryId = businessCategoryId;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { barcode: { contains: search, mode: "insensitive" } },
        { organization: { name: { contains: search, mode: "insensitive" } } },
        {
          businessCategory: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { slug: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    if (!canBypassAllWebProductsVisibility(req)) {
      const canBypassRequestedOrg = requestedOrganizationId
        ? await canBypassWebProductsVisibility(req, requestedOrganizationId)
        : false;

      if (!canBypassRequestedOrg) {
        const visibleOrganizationIds = await getWebProductsEnabledOrganizationIds();
        if (requestedOrganizationId) {
          if (!visibleOrganizationIds.includes(requestedOrganizationId)) {
            return res.json([]);
          }
        } else {
          where.organizationId = { in: visibleOrganizationIds };
        }
      }
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

    const productIds = products.map((product) => product.id);
    const inventoryExpiries = productIds.length
      ? await prisma.warehouseInventory.findMany({
          where: {
            productId: { in: productIds },
            quantity: { gt: 0 },
            expiryDate: getInventoryExpiryFilter(includeExpiredInventory),
          },
          select: {
            productId: true,
            expiryDate: true,
          },
          orderBy: {
            expiryDate: "asc",
          },
        })
      : [];

    const expiryByProductId = new Map<string, Date>();
    for (const item of inventoryExpiries) {
      if (!expiryByProductId.has(item.productId) && item.expiryDate) {
        expiryByProductId.set(item.productId, item.expiryDate);
      }
    }

    let response = products
      .map((product) => {
        const expiryDate = expiryByProductId.get(product.id) ?? null;
        return {
          ...product,
          expiryDate: expiryDate?.toISOString() ?? null,
        };
      })
      .sort((a, b) => {
        const expiryDiff = getExpirySortValue(a.expiryDate) - getExpirySortValue(b.expiryDate);
        if (expiryDiff !== 0) return expiryDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    if (limit > 0) {
      response = response.slice(0, limit);
    }

    return res.json(response);
  } catch (error) {
    console.error("get products error", error);
    return res.status(500).json({ message: "Бараа авахад алдаа гарлаа", error: String(error) });
  }
});

/* ─── GET /products/import-template ──────────────────────────────────── */
router.get("/products/import-template", (req, res) => {
  try {
    const mode = String(req.query.mode || req.query.type || "").trim().toLowerCase();
    const isPreorderTemplate = mode === "preorder";
    const templateData = [
      {
        "Зураг": "(зургаа энд оруулна)",
        "Нэр (name)": isPreorderTemplate ? "Жишээ захиалгын бараа 1" : "Жишээ бараа 1",
        "SKU (sku)": isPreorderTemplate ? "PRE-001" : "SKU-001",
        "Үнэ (price)": 25000,
        "Өртөг (costPrice)": 15000,
        "Нөөц (stock)": isPreorderTemplate ? 0 : 100,
        "Тайлбар (description)": "Барааны тайлбар энд бичнэ",
        ...(isPreorderTemplate
          ? {
              "Ирэх хоног (preorderLeadTimeDays)": 14,
              "Захиалгын тайлбар (preorderNote)": "Хятадаас захиалгаар 14 хоногт ирнэ",
            }
          : {}),
      },
      {
        "Зураг": "(зургаа энд оруулна)",
        "Нэр (name)": isPreorderTemplate ? "Жишээ захиалгын бараа 2" : "Жишээ бараа 2",
        "SKU (sku)": isPreorderTemplate ? "PRE-002" : "SKU-002",
        "Үнэ (price)": 50000,
        "Өртөг (costPrice)": 30000,
        "Нөөц (stock)": isPreorderTemplate ? 0 : 50,
        "Тайлбар (description)": "",
        ...(isPreorderTemplate
          ? {
              "Ирэх хоног (preorderLeadTimeDays)": 21,
              "Захиалгын тайлбар (preorderNote)": "",
            }
          : {}),
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    ws["!cols"] = [
      { wch: 18 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 35 },
      ...(isPreorderTemplate ? [{ wch: 24 }, { wch: 36 }] : []),
    ];
    // Make image column rows taller for pasting images
    ws["!rows"] = [{ hpt: 20 }, { hpt: 60 }, { hpt: 60 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Бараа");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${isPreorderTemplate ? "preorder_product_import_template" : "product_import_template"}.xlsx"`,
    );
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    return res.send(Buffer.from(buf));
  } catch (error) {
    console.error("template download error", error);
    return res.status(500).json({ message: "Template татахад алдаа гарлаа" });
  }
});

/* ─── POST /products/import ─────────────────────────────────────────── */
type ProductImportErrorRow = {
  rowNumber: number;
  error: string;
  name: string;
  sku: string;
  price: string;
  costPrice: string;
  stock: string;
  preorderLeadTimeDays: string;
  preorderNote: string;
  description: string;
};

function importRowValue(row: Record<string, unknown>, keys: string[]): string {
  const value = resolveCol(row, keys);
  return value === undefined || value === null ? "" : String(value);
}

function toProductImportErrorRow(
  row: Record<string, unknown>,
  rowNumber: number,
  error: string,
  colMap: typeof PRODUCT_COL_MAP,
): ProductImportErrorRow {
  return {
    rowNumber,
    error,
    name: importRowValue(row, colMap.name),
    sku: importRowValue(row, colMap.sku),
    price: importRowValue(row, colMap.price),
    costPrice: importRowValue(row, colMap.costPrice),
    stock: importRowValue(row, colMap.stock),
    preorderLeadTimeDays: importRowValue(row, colMap.preorderLeadTimeDays),
    preorderNote: importRowValue(row, colMap.preorderNote),
    description: importRowValue(row, colMap.description),
  };
}

router.post(
  "/products/import",
  requireAuth,
  requireActivePlan("body"),
  checkImportLimit(),
  upload.single("file"),
  async (req, res) => {
    try {
      const organizationId = req.body.organizationId;
      if (!organizationId) {
        return res.status(400).json({ message: "organizationId шаардлагатай" });
      }

      const perm = await assertOrgPermission(req, res, organizationId, Permission.MANAGE_PRODUCTS);
      if (!perm) return;

      const importMode = String(req.body.mode || req.body.type || req.query.mode || req.query.type || "")
        .trim()
        .toLowerCase();
      const isPreorderImport = importMode === "preorder";

      // Auto-resolve businessCategoryId from organization's businessCategory string
      let orgBusinessCategoryId: string | null = null;
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { businessCategory: true },
      });
      if (org?.businessCategory) {
        const matched = await prisma.businessCategory.findFirst({
          where: { slug: { equals: org.businessCategory, mode: "insensitive" } },
          select: { id: true },
        });
        if (matched) orgBusinessCategoryId = matched.id;
      }

      let rows: Record<string, unknown>[] = [];
      let embeddedImages = new Map<number, Buffer[]>();
      let mediaFileCount = 0;
      let hasRichData = false;
      let hasDrawings = false;

      if (req.file) {
        const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          return res.status(400).json({ message: "Excel файл хоосон байна" });
        }

        rows = XLSX.utils
          .sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName])
          .map(normalizeExcelRow);

        // Extract embedded images from xlsx (row → image buffers)
        embeddedImages = await extractExcelImages(req.file.buffer);
        console.log("[import] Embedded images map has", embeddedImages.size, "rows with images");

        // Count media files and detect structure for debug
        try {
          const z = await JSZip.loadAsync(req.file.buffer);
          const files = Object.keys(z.files);
          mediaFileCount = files.filter((f) => f.startsWith("xl/media/")).length;
          hasRichData = files.some((f) => f.includes("richData/richValueRel.xml"));
          hasDrawings = files.some((f) => /xl\/drawings\/drawing\d+\.xml$/.test(f));
        } catch { /* ignore */ }
      } else if (req.body.rows) {
        let parsedRows: unknown;
        try {
          parsedRows = typeof req.body.rows === "string" ? JSON.parse(req.body.rows) : req.body.rows;
        } catch {
          return res.status(400).json({ message: "rows JSON буруу байна" });
        }
        if (!Array.isArray(parsedRows)) {
          return res.status(400).json({ message: "rows талбар буруу байна" });
        }
        rows = parsedRows.map((row) => normalizeExcelRow(row as Record<string, unknown>));
      } else {
        return res.status(400).json({ message: "Excel файл эсвэл зассан мөр шаардлагатай" });
      }

      if (!rows.length) {
        return res.status(400).json({ message: "Excel файлд мэдээлэл олдсонгүй" });
      }

      if (rows.length > 1000) {
        return res.status(400).json({ message: "Нэг удаад 1000-аас олон бараа оруулах боломжгүй" });
      }

      // Enforce plan product limit during import
      const remainingSlots: number | undefined = (req as any).remainingProductSlots;
      if (remainingSlots !== undefined && rows.length > remainingSlots) {
        return res.status(400).json({
          message: `Таны планд ${remainingSlots} бараа нэмэх зай үлдсэн байна. Файлд ${rows.length} бараа байна.`,
          code: "PRODUCT_LIMIT_WOULD_EXCEED",
          remaining: remainingSlots,
        });
      }

      // Column name mapping — supports both Mongolian & English headers
      const colMap = PRODUCT_COL_MAP;

      const results: {
        created: number;
        updated: number;
        skipped: number;
        errors: string[];
        errorRows: ProductImportErrorRow[];
        products: Array<{ id: string; name: string; sku: string | null; price: number; stock: number }>;
        _debug?: { embeddedImageRows: number; mediaFiles: number };
      } = { created: 0, updated: 0, skipped: 0, errors: [], errorRows: [], products: [] };

      // Pre-scan: detect duplicate SKUs within the file
      const skusInFile = new Map<string, number>();
      const duplicateSkuRows = new Set<number>();
      for (let i = 0; i < rows.length; i++) {
        const sku = resolveCol(rows[i], colMap.sku);
        if (sku) {
          const normalized = String(sku).trim().toLowerCase();
          if (skusInFile.has(normalized)) {
            const message = `Мөр ${i + 2}: SKU "${String(sku).trim()}" файл дотор давхардсан (мөр ${skusInFile.get(normalized)})`;
            results.errors.push(message);
            results.errorRows.push(toProductImportErrorRow(rows[i], i + 2, message, colMap));
            results.skipped++;
            duplicateSkuRows.add(i);
          } else {
            skusInFile.set(normalized, i + 2);
          }
        }
      }

      for (let i = 0; i < rows.length; i++) {
        // Skip rows already flagged as duplicates in pre-scan
        if (duplicateSkuRows.has(i)) continue;

        const row = rows[i];
        const rowNum = i + 2;

        const name = resolveCol(row, colMap.name);
        const sku = resolveCol(row, colMap.sku);
        const price = resolveCol(row, colMap.price);
        const costPrice = resolveCol(row, colMap.costPrice);
        const stock = resolveCol(row, colMap.stock);
        const description = resolveCol(row, colMap.description);
        const preorderLeadTimeDays = resolveCol(row, colMap.preorderLeadTimeDays);
        const preorderNote = resolveCol(row, colMap.preorderNote);
        const imagesRaw = resolveCol(row, colMap.images);

        if (!name || price === undefined) {
          const message = `Мөр ${rowNum}: Нэр болон үнэ заавал шаардлагатай`;
          results.errors.push(message);
          results.errorRows.push(toProductImportErrorRow(row, rowNum, message, colMap));
          results.skipped++;
          continue;
        }

        const priceNum = parseFloat(String(price));
        if (isNaN(priceNum) || priceNum < 0) {
          const message = `Мөр ${rowNum}: Үнэ буруу — "${price}"`;
          results.errors.push(message);
          results.errorRows.push(toProductImportErrorRow(row, rowNum, message, colMap));
          results.skipped++;
          continue;
        }

        const costPriceNum = costPrice !== undefined ? parseFloat(String(costPrice)) : null;
        if (costPriceNum !== null && (isNaN(costPriceNum) || costPriceNum < 0)) {
          const message = `Мөр ${rowNum}: Өртөг үнэ буруу — "${costPrice}"`;
          results.errors.push(message);
          results.errorRows.push(toProductImportErrorRow(row, rowNum, message, colMap));
          results.skipped++;
          continue;
        }

        const stockNum = stock !== undefined ? parseInt(String(stock)) : 0;
        if (isNaN(stockNum) || stockNum < 0 || stockNum > 2_147_483_647) {
          const message = `Мөр ${rowNum}: Нөөц буруу — "${stock}"`;
          results.errors.push(message);
          results.errorRows.push(toProductImportErrorRow(row, rowNum, message, colMap));
          results.skipped++;
          continue;
        }

        const normalizedLeadTimeDays = isPreorderImport
          ? normalizePreorderLeadTimeDays(preorderLeadTimeDays ?? 14)
          : null;
        if (normalizedLeadTimeDays === undefined) {
          const message = `Мөр ${rowNum}: Ирэх хоног 0-365 хооронд байх ёстой`;
          results.errors.push(message);
          results.errorRows.push(toProductImportErrorRow(row, rowNum, message, colMap));
          results.skipped++;
          continue;
        }

        const normalizedSku = sku ? String(sku).trim() : null;

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

          const productData = {
              name: String(name).trim(),
              description: description ? String(description).trim() : null,
              price: priceNum,
              costPrice: costPriceNum,
              stock: isPreorderImport ? 0 : stockNum,
              supplyType: isPreorderImport ? "CHINA_PREORDER" as const : "IN_STOCK" as const,
              preorderLeadTimeDays: isPreorderImport ? normalizedLeadTimeDays : null,
              preorderNote:
                isPreorderImport && preorderNote
                  ? String(preorderNote).trim()
                  : null,
              businessCategoryId: orgBusinessCategoryId,
              isActive: true,
          };

          let product;
          let wasUpdate = false;
          if (normalizedSku) {
            // Free up SKU from any soft-deleted product first
            await prisma.product.updateMany({
              where: { organizationId, sku: normalizedSku, deletedAt: { not: null } },
              data: { sku: null },
            });
            // Check if active product with this SKU already exists
            const existing = await prisma.product.findUnique({
              where: { organizationId_sku: { organizationId, sku: normalizedSku } },
              select: { id: true },
            });
            wasUpdate = !!existing;
            // Upsert: update if SKU exists, create if not
            product = await prisma.product.upsert({
              where: {
                organizationId_sku: { organizationId, sku: normalizedSku },
              },
              update: {
                ...productData,
                deletedAt: null,
                ...(imageUrls.length > 0 && {
                  images: { deleteMany: {}, create: imageUrls.map((url) => ({ url })) },
                }),
              },
              create: {
                organizationId,
                sku: normalizedSku,
                ...productData,
                ...(imageUrls.length > 0 && {
                  images: { create: imageUrls.map((url) => ({ url })) },
                }),
              },
              select: { id: true, name: true, sku: true, price: true, stock: true },
            });
          } else {
            product = await prisma.product.create({
              data: {
                organizationId,
                sku: null,
                ...productData,
                ...(imageUrls.length > 0 && {
                  images: { create: imageUrls.map((url) => ({ url })) },
                }),
              },
              select: { id: true, name: true, sku: true, price: true, stock: true },
            });
          }
          results.products.push({
            id: product.id,
            name: product.name,
            sku: product.sku,
            price: Number(product.price),
            stock: product.stock,
          });
          if (wasUpdate) {
            results.updated++;
          } else {
            results.created++;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          const message = `Мөр ${rowNum}: ${msg}`;
          results.errors.push(message);
          results.errorRows.push(toProductImportErrorRow(row, rowNum, message, colMap));
          results.skipped++;
        }
      }

      return res.json({
        message: `${results.created} бараа шинээр, ${results.updated} бараа шинэчлэгдлээ${results.skipped > 0 ? `, ${results.skipped} алгасав` : ""}`,
        total: rows.length,
        ...results,
        _debug: { embeddedImageRows: embeddedImages.size, mediaFiles: mediaFileCount, hasRichData, hasDrawings },
      });
    } catch (error) {
      console.error("import products error", error);
      return res.status(500).json({ message: "Excel импорт хийхэд алдаа гарлаа", error: String(error) });
    }
  }
);

/* ─── GET /products/:id ─────────────────────────────────────────────── */
router.get("/products/:id", optionalAuth, async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id, deletedAt: null },
      include: {
        images: { select: { id: true, url: true } },
        businessCategory: { select: { id: true, name: true, slug: true } },
        organization: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            status: true,
            deletedAt: true,
          },
        },
        discounts: {
          where: { isActive: true, validUntil: { gte: new Date() } },
          select: { percent: true, validUntil: true },
          take: 1,
        },
      },
    });
    if (!product) return res.status(404).json({ message: "Бараа олдсонгүй" });
    const canBypassVisibility = await canBypassWebProductsVisibility(req, product.organizationId);
    const isPubliclyVisible =
      product.isActive &&
      product.organization.deletedAt === null &&
      product.organization.status === "ACTIVE" &&
      (await isOrgWebProductsEnabled(product.organizationId));

    if (!canBypassVisibility && !isPubliclyVisible) {
      return res.status(404).json({ message: "Бараа олдсонгүй" });
    }

    const { organization, ...safeProduct } = product;
    return res.json({
      ...safeProduct,
      organization: {
        id: organization.id,
        name: organization.name,
        logoUrl: organization.logoUrl,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Алдаа гарлаа", error: String(error) });
  }
});

/* ─── POST /products ────────────────────────────────────────────────── */
router.post(
  "/products",
  requireAuth,
  requireOrgPermission({ from: "body" }, Permission.MANAGE_PRODUCTS),
  requireActivePlan("body"),
  checkProductLimit(1),
  async (req, res) => {
  try {
    const {
      organizationId,
      name,
      description,
      sku,
      barcode,
      price,
      costPrice,
      stock,
      expiryDate,
      supplyType,
      preorderLeadTimeDays,
      preorderNote,
      businessCategoryId: inputCategoryId,
      images, // string[] — base64 or URL
    } = req.body;

    let businessCategoryId = inputCategoryId;

    if (!organizationId || !name || price === undefined) {
      return res.status(400).json({ message: "organizationId, name, price шаардлагатай" });
    }

    // Auto-resolve businessCategoryId from organization if not provided
    if (!businessCategoryId) {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { businessCategory: true },
      });
      if (org?.businessCategory) {
        const matched = await prisma.businessCategory.findFirst({
          where: { slug: { equals: org.businessCategory, mode: "insensitive" } },
          select: { id: true },
        });
        if (matched) businessCategoryId = matched.id;
      }
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

    const normalizedSupplyType = normalizeSupplyType(supplyType);
    const parsedExpiryDate =
      normalizedSupplyType === "CHINA_PREORDER" ? null : parseOptionalExpiryDate(expiryDate);
    if (expiryDate !== undefined && parsedExpiryDate === undefined) {
      return res.status(400).json({ message: "Дуусах хугацаа буруу байна" });
    }
    if (
      normalizedSupplyType === "CHINA_PREORDER" &&
      !(await isOrgFeatureEnabled(organizationId, PREORDER_PRODUCTS_FEATURE_KEY))
    ) {
      return res.status(403).json({ message: "Захиалгын бараа бүртгэх эрх нээгдээгүй байна" });
    }
    const normalizedLeadTimeDays = normalizePreorderLeadTimeDays(preorderLeadTimeDays);
    if (normalizedLeadTimeDays === undefined) {
      return res.status(400).json({ message: "Ирэх хоног 0-365 хооронд байх ёстой" });
    }

    const normalizedSku = sku ? String(sku).trim() : null;
    const normalizedBarcode = barcode ? String(barcode).trim() : null;
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
    const actorId = (req as any).user?.userId ?? null;

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          organizationId,
          name: String(name).trim(),
          description: description ? String(description).trim() : null,
          sku: normalizedSku,
          barcode: normalizedBarcode,
          price: priceNum,
          costPrice: costPriceNum,
          stock: stockNum,
          supplyType: normalizedSupplyType,
          preorderLeadTimeDays: normalizedSupplyType === "CHINA_PREORDER" ? normalizedLeadTimeDays : null,
          preorderNote:
            normalizedSupplyType === "CHINA_PREORDER" && preorderNote
              ? String(preorderNote).trim()
              : null,
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

      await upsertVendorProductInventory(tx, {
        organizationId,
        productId: created.id,
        stock: stockNum,
        stockProvided: normalizedSupplyType !== "CHINA_PREORDER" || stockNum > 0,
        expiryDate: parsedExpiryDate,
        expiryDateProvided: expiryDate !== undefined && normalizedSupplyType !== "CHINA_PREORDER",
        createdById: actorId,
      });

      const currentExpiryDate = await findProductExpiryDate(tx, created.id);
      return {
        ...created,
        expiryDate: currentExpiryDate?.toISOString() ?? null,
      };
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
  }
);

/* ─── PATCH /products/:id ───────────────────────────────────────────── */
router.patch("/products/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id as string;
    const {
      name,
      description,
      sku,
      barcode,
      price,
      costPrice,
      stock,
      expiryDate,
      supplyType,
      preorderLeadTimeDays,
      preorderNote,
      businessCategoryId,
      isActive,
      images, // full replacement: string[]
    } = req.body;

    const existing = await prisma.product.findUnique({ where: { id, deletedAt: null } });
    if (!existing) return res.status(404).json({ message: "Бараа олдсонгүй" });

    const perm = await assertOrgPermission(req, res, existing.organizationId, Permission.MANAGE_PRODUCTS);
    if (!perm) return;

    const nextSupplyType =
      supplyType !== undefined ? normalizeSupplyType(supplyType) : existing.supplyType;
    const parsedExpiryDate =
      nextSupplyType === "CHINA_PREORDER" ? null : parseOptionalExpiryDate(expiryDate);
    if (expiryDate !== undefined && parsedExpiryDate === undefined) {
      return res.status(400).json({ message: "Дуусах хугацаа буруу байна" });
    }

    const data: Record<string, unknown> = {};
    let stockNumForInventory: number | undefined;
    if (name !== undefined) data.name = String(name).trim();
    if (description !== undefined) data.description = description ? String(description).trim() : null;
    if (sku !== undefined) data.sku = sku ? String(sku).trim() : null;
    if (barcode !== undefined) data.barcode = barcode ? String(barcode).trim() : null;
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
      stockNumForInventory = s;
    }
    if (supplyType !== undefined) {
      if (
        nextSupplyType === "CHINA_PREORDER" &&
        !(await isOrgFeatureEnabled(existing.organizationId, PREORDER_PRODUCTS_FEATURE_KEY))
      ) {
        return res.status(403).json({ message: "Захиалгын бараа бүртгэх эрх нээгдээгүй байна" });
      }
      data.supplyType = nextSupplyType;
      if (nextSupplyType !== "CHINA_PREORDER") {
        data.preorderLeadTimeDays = null;
        data.preorderNote = null;
      }
    }
    if (preorderLeadTimeDays !== undefined) {
      const leadTimeDays = normalizePreorderLeadTimeDays(preorderLeadTimeDays);
      if (leadTimeDays === undefined) {
        return res.status(400).json({ message: "Ирэх хоног 0-365 хооронд байх ёстой" });
      }
      data.preorderLeadTimeDays = leadTimeDays;
    }
    if (preorderNote !== undefined) data.preorderNote = preorderNote ? String(preorderNote).trim() : null;
    if (businessCategoryId !== undefined) data.businessCategoryId = businessCategoryId || null;
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const actorId = (req as any).user?.userId ?? null;
    const product = await prisma.$transaction(async (tx) => {
      if (Array.isArray(images)) {
        const imageUrls = images.slice(0, 5);
        await tx.productImage.deleteMany({ where: { productId: id } });
        data.images = { create: imageUrls.map((url: string) => ({ url })) };
      }

      const updated = await tx.product.update({
        where: { id },
        data,
        include: {
          images: { select: { id: true, url: true } },
          businessCategory: { select: { id: true, name: true, slug: true } },
        },
      });

      await upsertVendorProductInventory(tx, {
        organizationId: existing.organizationId,
        productId: id,
        stock: stockNumForInventory,
        stockProvided: stockNumForInventory !== undefined,
        expiryDate: parsedExpiryDate,
        expiryDateProvided: expiryDate !== undefined,
        createdById: actorId,
      });

      const currentExpiryDate = await findProductExpiryDate(tx, id);
      return {
        ...updated,
        expiryDate: currentExpiryDate?.toISOString() ?? null,
      };
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

    // Check env vars before attempting upload
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      console.error("upload-image: Missing SUPABASE env vars!", {
        hasUrl: !!process.env.SUPABASE_URL,
        hasKey: !!process.env.SUPABASE_SERVICE_KEY,
      });
      return res.status(500).json({
        message: "Supabase тохиргоо хийгдээгүй байна",
        debug: { hasUrl: !!process.env.SUPABASE_URL, hasKey: !!process.env.SUPABASE_SERVICE_KEY },
      });
    }

    const ext = path.extname(req.file.originalname).toLowerCase() || ".jpg";
    const fileName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
    const filePath = `products/${fileName}`;

    console.log("upload-image: uploading", filePath, "size:", req.file.size, "type:", req.file.mimetype);

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

    console.log("upload-image: success", publicUrlData.publicUrl);
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
      data: { deletedAt: new Date(), isActive: false, sku: null },
    });

    return res.json({ message: "Бараа устгагдлаа" });
  } catch (error) {
    return res.status(500).json({ message: "Бараа устгахад алдаа гарлаа", error: String(error) });
  }
});

export default router;
