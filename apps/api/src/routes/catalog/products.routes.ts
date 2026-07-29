import { Router, type Router as ExpressRouter } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import crypto from "crypto";
import path from "path";
import JSZip from "jszip";
import { InventoryReason, WarehouseType, prisma } from "@mgl/database";
import type { PrismaClient } from "@prisma/client";
import { Permission, hasPlatformPermission, isFullAdmin } from "@mgl/types";
import { optionalAuth, requireAuth } from "../../middleware/auth";
import {
  requireOrgPermission,
  assertOrgPermission,
} from "../../services/permission.service";
import { getSupabase, PRODUCT_IMAGES_BUCKET } from "../../lib/supabase";
import {
  areWebProductsGloballyEnabled,
  canBypassAllWebProductsVisibility,
  canBypassWebProductsVisibility,
  getWebProductsEnabledOrganizationIds,
  isOrgWebProductsEnabled,
} from "../../services/product-visibility.service";
import {
  getReviewStatusForVendorMutation,
  isApprovedVendorContent,
} from "../../services/vendor-content-review.service";
import {
  buildProductSearchWhere,
  scoreProductSimilarity,
  scoreProductForSearch,
} from "../../services/product-discovery.service";
import {
  getProductInterestProfile,
  ProductInteractionType,
  recordProductInteraction,
  scoreProductForInterest,
} from "../../services/product-personalization.service";
import {
  addMasterProductAlias,
  normalizeMasterBarcode,
  normalizeMasterName,
  resolveMasterProduct,
} from "../../services/master-product.service";
import {
  extractExcelImages,
  uploadBufferToSupabase,
  PRODUCT_COL_MAP,
  PRODUCT_IMPORT_FILE_SIZE_LIMIT_BYTES,
  normalizeExcelRow,
  getExcelRowIndex,
  resolveCol,
  addCategoryDropdownToWorkbook,
  buildBusinessCategoryChoices,
  resolveBusinessCategoryIdFromChoices,
} from "../../lib/excel-import";

const router: ExpressRouter = Router();

function canAccessMasterCatalogAdmin(req: Parameters<typeof requireAuth>[0]) {
  const role = (req as typeof req & { user?: { role?: string } }).user?.role;
  return Boolean(
    role &&
    (isFullAdmin(role) ||
      hasPlatformPermission(role, Permission.MANAGE_SITE_SETTINGS) ||
      hasPlatformPermission(role, Permission.MANAGE_WAREHOUSES)),
  );
}

async function buildMasterCatalogDataset(search = "", take?: number) {
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const normalizedSearch = normalizeMasterName(search);
  const masters = await prisma.masterProduct.findMany({
    where: {
      status: "ACTIVE",
      ...(normalizedSearch
        ? {
            OR: [
              { normalizedName: { contains: normalizedSearch } },
              { barcode: { contains: search.trim() } },
              {
                aliases: {
                  some: { normalizedValue: { contains: normalizedSearch } },
                },
              },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      canonicalName: true,
      barcode: true,
      brand: true,
      unit: true,
      categoryName: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      products: {
        where: { deletedAt: null },
        select: { id: true, organizationId: true, isActive: true },
      },
      aliases: { select: { value: true }, take: 20 },
    },
    orderBy: { canonicalName: "asc" },
    ...(take ? { take } : {}),
  });
  const productToMaster = new Map<string, string>();
  masters.forEach((master) =>
    master.products.forEach((product) =>
      productToMaster.set(product.id, master.id),
    ),
  );
  const productIds = [...productToMaster.keys()];
  const [onlineSales, posSales, stockRequests, inventory] = productIds.length
    ? await Promise.all([
        prisma.orderItem.groupBy({
          by: ["productId"],
          where: {
            productId: { in: productIds },
            order: {
              status: { not: "CANCELLED" },
              deletedAt: null,
              createdAt: { gte: since },
            },
          },
          _sum: { quantity: true },
        }),
        prisma.posSaleLine.groupBy({
          by: ["productId"],
          where: {
            productId: { in: productIds },
            sale: { status: "COMPLETED", createdAt: { gte: since } },
          },
          _sum: { qty: true },
        }),
        prisma.warehouseStockRequestItem.groupBy({
          by: ["productId"],
          where: {
            productId: { in: productIds },
            request: {
              status: { notIn: ["CANCELLED", "REJECTED"] },
              createdAt: { gte: since },
            },
          },
          _sum: { quantity: true },
        }),
        prisma.warehouseInventory.groupBy({
          by: ["productId"],
          where: { productId: { in: productIds } },
          _sum: { quantity: true },
        }),
      ])
    : [[], [], [], []];
  const aggregate = (rows: Array<{ productId: string; quantity: number }>) => {
    const totals = new Map<string, number>();
    rows.forEach((row) => {
      const masterId = productToMaster.get(row.productId);
      if (masterId)
        totals.set(masterId, (totals.get(masterId) || 0) + row.quantity);
    });
    return totals;
  };
  const sales = aggregate([
    ...onlineSales.map((row) => ({
      productId: row.productId,
      quantity: row._sum.quantity || 0,
    })),
    ...posSales.map((row) => ({
      productId: row.productId,
      quantity: row._sum.qty || 0,
    })),
  ]);
  const requests = aggregate(
    stockRequests.map((row) => ({
      productId: row.productId,
      quantity: row._sum.quantity || 0,
    })),
  );
  const stock = aggregate(
    inventory.map((row) => ({
      productId: row.productId,
      quantity: row._sum.quantity || 0,
    })),
  );

  return masters.map((master) => ({
    id: master.id,
    canonicalName: master.canonicalName,
    barcode: master.barcode,
    brand: master.brand,
    unit: master.unit,
    categoryName: master.categoryName,
    aliases: master.aliases.map((alias) => alias.value),
    linkedProductCount: master.products.length,
    organizationCount: new Set(
      master.products.map((product) => product.organizationId),
    ).size,
    activeProductCount: master.products.filter((product) => product.isActive)
      .length,
    systemSoldQuantity90d: sales.get(master.id) || 0,
    systemRequestedQuantity90d: requests.get(master.id) || 0,
    systemStock: stock.get(master.id) || 0,
    createdAt: master.createdAt.toISOString(),
    updatedAt: master.updatedAt.toISOString(),
  }));
}

async function assertProductMutationPermission(
  req: Parameters<typeof assertOrgPermission>[0],
  res: Parameters<typeof assertOrgPermission>[1],
  product: { organizationId: string; managedByWarehouseId: string | null },
) {
  if (!product.managedByWarehouseId) {
    return assertOrgPermission(
      req,
      res,
      product.organizationId,
      Permission.MANAGE_PRODUCTS,
    );
  }

  const user = (
    req as typeof req & {
      user?: { userId?: string; role?: string };
    }
  ).user;
  const platformAllowed =
    Boolean(user?.role) &&
    (isFullAdmin(user!.role!) ||
      hasPlatformPermission(user!.role!, Permission.MANAGE_WAREHOUSES));
  const operatorAllowed = user?.userId
    ? Boolean(
        await prisma.warehouseSetupToken.findFirst({
          where: {
            userId: user.userId,
            warehouseId: product.managedByWarehouseId,
            usedAt: { not: null },
          },
          select: { id: true },
        }),
      )
    : false;

  if (!platformAllowed && !operatorAllowed) {
    res.status(403).json({
      code: "WAREHOUSE_MANAGED_PRODUCT",
      message: "Энэ барааг зөвхөн бүртгэсэн агуулах өөрчлөх боломжтой",
    });
    return null;
  }
  return { warehouseManaged: true };
}

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

const normalizeSupplyType = (value: unknown) =>
  String(value || "")
    .trim()
    .toUpperCase() === "CHINA_PREORDER"
    ? "CHINA_PREORDER"
    : "IN_STOCK";

const normalizePreorderLeadTimeDays = (value: unknown) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 365) return undefined;
  return parsed;
};

const PREORDER_PRODUCTS_FEATURE_KEY = "preorder-products-enabled";
const TRUE_VALUES = new Set(["1", "true", "on", "yes"]);
const TAX_TYPES = new Set(["VAT_ABLE", "VAT_FREE", "VAT_ZERO", "NOT_VAT"]);
const RESTAURANT_MENU_CATEGORIES = new Set([
  "HOT",
  "COLD",
  "SOUP",
  "GRILL",
  "APPETIZER",
  "DESSERT",
  "DRINK",
]);
const KITCHEN_STATIONS = new Set(["HOT_KITCHEN", "COLD_KITCHEN", "BAR"]);

const normalizeTaxType = (value: unknown) => {
  const normalized = String(value || "VAT_ABLE")
    .trim()
    .toUpperCase();
  return TAX_TYPES.has(normalized) ? normalized : "VAT_ABLE";
};

const normalizePercent = (value: unknown, fallback = 0) => {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return undefined;
  return parsed;
};

const normalizeClassificationCode = (value: unknown) =>
  String(value || "4711000").trim() || "4711000";

const normalizeOptionalText = (value: unknown) => {
  const text = String(value ?? "").trim();
  return text || null;
};

const normalizeRestaurantMenuCategory = (value: unknown) => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  return RESTAURANT_MENU_CATEGORIES.has(normalized) ? normalized : null;
};

const normalizeKitchenStation = (value: unknown) => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  return KITCHEN_STATIONS.has(normalized) ? normalized : null;
};

const normalizePreparationMinutes = (value: unknown) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 1440) {
    return undefined;
  }
  return parsed;
};

function emptyProductInterestProfile() {
  return {
    productScores: new Map<string, number>(),
    categoryScores: new Map<string, number>(),
    organizationScores: new Map<string, number>(),
    keywordScores: new Map<string, number>(),
    hasSignals: false,
  };
}

async function getSafeProductInterestProfile(input: {
  userId?: string | null;
  visitorId?: string | null;
}) {
  try {
    return await getProductInterestProfile(input);
  } catch (error) {
    console.warn("[products] personalization skipped", error);
    return emptyProductInterestProfile();
  }
}

const getExpirySortValue = (value?: Date | string | null) => {
  if (!value) return Number.POSITIVE_INFINITY;
  const time =
    value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
};

function deterministicRecommendationNoise(seed: string, productId: string) {
  const digest = crypto
    .createHash("sha256")
    .update(`${seed}:${productId}`)
    .digest();
  return digest.readUInt32BE(0) / 0xffffffff;
}

function productRecommendationScore(
  product: {
    id: string;
    marketplacePriority?: number | null;
    createdAt: Date | string;
    stock?: number | null;
    supplyType?: string | null;
    interestScore?: number;
    discounts?: Array<{ percent: number }>;
    organization?: {
      rating?: number | null;
      reviewCount?: number | null;
    } | null;
  },
  signals: { purchasedQuantity: number; recentInteractions: number },
  seed: string,
) {
  const ageDays = Math.max(
    0,
    (Date.now() - new Date(product.createdAt).getTime()) / 86_400_000,
  );
  const priorityScore = Math.min(
    40,
    Math.log1p(product.marketplacePriority || 0) * 6,
  );
  const interestScore = Math.min(
    45,
    Math.log1p(Math.max(0, product.interestScore || 0)) * 9,
  );
  const purchaseScore = Math.min(
    18,
    Math.log1p(signals.purchasedQuantity) * 5.5,
  );
  const trendingScore = Math.min(
    16,
    Math.log1p(signals.recentInteractions) * 5,
  );
  const freshnessScore = Math.max(0, 12 * (1 - ageDays / 45));
  const discountScore = Math.min(
    10,
    Math.max(0, product.discounts?.[0]?.percent || 0) / 5,
  );
  const rating = product.organization?.rating ?? 5;
  const ratingScore =
    Math.max(0, rating - 3.5) * 4 +
    Math.min(3, Math.log1p(product.organization?.reviewCount || 0) * 0.45);
  const availabilityScore =
    product.supplyType === "CHINA_PREORDER" || (product.stock || 0) > 0 ? 2 : 0;
  const explorationScore =
    deterministicRecommendationNoise(seed, product.id) * 7;

  return (
    priorityScore +
    interestScore +
    purchaseScore +
    trendingScore +
    freshnessScore +
    discountScore +
    ratingScore +
    availabilityScore +
    explorationScore
  );
}

function normalizeMarketplacePriority(value: unknown, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 1_000_000) {
    return undefined;
  }
  return parsed;
}

const getStartOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const isTruthyQueryValue = (value: unknown) =>
  TRUE_VALUES.has(
    String(value ?? "")
      .trim()
      .toLowerCase(),
  );

const getInventoryExpiryFilter = (includeExpired: boolean) =>
  includeExpired ? { not: null } : { gte: getStartOfToday() };

const isOversizedInlineImage = (url: string) =>
  url.startsWith("data:") && url.length > 12_000;

const parseOptionalExpiryDate = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const date = new Date(String(value));
  return Number.isFinite(date.getTime()) ? date : undefined;
};

async function getImportBusinessCategoryChoices() {
  const categories = await prisma.businessCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, parentId: true },
  });
  return buildBusinessCategoryChoices(categories);
}

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
      warehouse: {
        deletedAt: null,
        isActive: true,
        type: WarehouseType.VENDOR_INTERNAL,
      },
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
      type: WarehouseType.VENDOR_INTERNAL,
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

async function findProductExpiryDate(
  tx: Tx,
  productId: string,
  includeExpired = true,
) {
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
    where: {
      warehouseId_productId: { warehouseId, productId: input.productId },
    },
    select: { quantity: true },
  });
  const oldQuantity = existing?.quantity ?? 0;
  const nextQuantity = input.stockProvided ? (input.stock ?? 0) : oldQuantity;

  if (!existing && nextQuantity <= 0 && !input.expiryDateProvided) return;

  if (existing) {
    await tx.warehouseInventory.update({
      where: {
        warehouseId_productId: { warehouseId, productId: input.productId },
      },
      data: {
        ...(input.stockProvided ? { quantity: nextQuantity } : {}),
        ...(input.expiryDateProvided
          ? { expiryDate: input.expiryDate ?? null }
          : {}),
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
        expiryDate: input.expiryDateProvided
          ? (input.expiryDate ?? null)
          : null,
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
        reason: existing
          ? InventoryReason.RESTOCK
          : InventoryReason.INITIAL_STOCK,
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
  limits: { fileSize: PRODUCT_IMPORT_FILE_SIZE_LIMIT_BYTES },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    cb(
      null,
      allowed.includes(file.mimetype) ||
        file.originalname.endsWith(".xlsx") ||
        file.originalname.endsWith(".xls"),
    );
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

async function resolveBusinessCategoryFilter(categoryIdOrSlug: string) {
  const category = await prisma.businessCategory.findFirst({
    where: {
      OR: [{ id: categoryIdOrSlug }, { slug: categoryIdOrSlug }],
      isActive: true,
    },
    select: { id: true },
  });
  if (!category) return [categoryIdOrSlug];

  const allCategories = await prisma.businessCategory.findMany({
    where: { isActive: true },
    select: { id: true, parentId: true },
  });
  const byParent = new Map<string, string[]>();
  for (const item of allCategories) {
    if (!item.parentId) continue;
    byParent.set(item.parentId, [
      ...(byParent.get(item.parentId) || []),
      item.id,
    ]);
  }

  const ids = new Set<string>([category.id]);
  const visit = (parentId: string) => {
    for (const childId of byParent.get(parentId) || []) {
      if (ids.has(childId)) continue;
      ids.add(childId);
      visit(childId);
    }
  };
  visit(category.id);
  return [...ids];
}

/* ─── GET /products ─────────────────────────────────────────────────── */
router.get("/products", optionalAuth, async (req, res) => {
  try {
    const { organizationId, businessCategoryId } = req.query as Record<
      string,
      string
    >;
    const restaurantMenuOnly = isTruthyQueryValue(req.query.restaurantMenu);
    const search = String(req.query.search ?? req.query.q ?? "").trim();
    const supplyType = String(
      req.query.type || req.query.supplyType || "",
    ).trim();
    const sort = String(req.query.sort || "newest").trim();
    const recommendationSeed =
      String(req.query.recommendationSeed || "")
        .trim()
        .slice(0, 128) || new Date().toISOString().slice(0, 10);
    const stockFilter = String(req.query.stock || "").trim();
    const discountOnly = isTruthyQueryValue(req.query.discount);
    const priceMin = Number(req.query.priceMin);
    const priceMax = Number(req.query.priceMax);
    const visitorId = String(req.query.visitorId || "").trim();
    const includeExpiredInventory = isTruthyQueryValue(
      req.query.includeExpiredInventory,
    );
    const requestedOrganizationId = organizationId
      ? String(organizationId)
      : "";
    const rawLimit = parseInt(String(req.query.limit || ""), 10);
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(100, rawLimit) : 0;
    const rawOffset = parseInt(String(req.query.offset || ""), 10);
    const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? rawOffset : 0;
    const includeMeta = isTruthyQueryValue(req.query.meta);
    const webEligibleOnly = isTruthyQueryValue(req.query.webEligibleOnly);
    const canBypassAllVisibility = canBypassAllWebProductsVisibility(req);
    const canBypassRequestedOrg = requestedOrganizationId
      ? await canBypassWebProductsVisibility(req, requestedOrganizationId)
      : false;
    const isOwnOrganizationCatalog =
      Boolean(requestedOrganizationId) && canBypassRequestedOrg;
    const includeInactive =
      isTruthyQueryValue(req.query.includeInactive) &&
      (canBypassAllVisibility || canBypassRequestedOrg);

    const where: any = {
      deletedAt: null,
      organization: { deletedAt: null, status: "ACTIVE" },
    };
    if (!isOwnOrganizationCatalog && !includeInactive) {
      where.isActive = true;
      where.reviewStatus = "APPROVED";
    }
    if (organizationId) where.organizationId = organizationId;
    if (restaurantMenuOnly) where.isRestaurantMenuItem = true;
    if (supplyType === "stock") where.supplyType = { not: "CHINA_PREORDER" };
    if (supplyType === "preorder") where.supplyType = "CHINA_PREORDER";
    if (Number.isFinite(priceMin) || Number.isFinite(priceMax)) {
      where.price = {
        ...(Number.isFinite(priceMin) ? { gte: priceMin } : {}),
        ...(Number.isFinite(priceMax) ? { lte: priceMax } : {}),
      };
    }
    if (stockFilter === "in_stock") {
      where.OR = [
        ...(Array.isArray(where.OR) ? where.OR : []),
        { supplyType: "CHINA_PREORDER" },
        { stock: { gt: 0 } },
      ];
    } else if (stockFilter === "low_stock") {
      where.supplyType = { not: "CHINA_PREORDER" };
      where.stock = { gt: 0, lte: 5 };
    } else if (stockFilter === "sold_out") {
      where.supplyType = { not: "CHINA_PREORDER" };
      where.stock = { lte: 0 };
    }
    if (discountOnly) {
      where.discounts = {
        some: { isActive: true, validUntil: { gte: new Date() } },
      };
    }
    if (businessCategoryId) {
      where.businessCategoryId = {
        in: await resolveBusinessCategoryFilter(businessCategoryId),
      };
    }

    if (search) {
      const searchWhere = buildProductSearchWhere(search);
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        { OR: searchWhere },
      ];
    }

    if (
      !canBypassAllVisibility &&
      !canBypassRequestedOrg &&
      !(await areWebProductsGloballyEnabled())
    ) {
      return res.json([]);
    }

    if (!canBypassAllVisibility || webEligibleOnly) {
      if (!canBypassRequestedOrg) {
        const visibleOrganizationIds =
          await getWebProductsEnabledOrganizationIds();
        if (requestedOrganizationId) {
          if (!visibleOrganizationIds.includes(requestedOrganizationId)) {
            return res.json([]);
          }
        } else {
          where.organizationId = { in: visibleOrganizationIds };
        }
      }
    }

    const totalCountPromise = includeMeta
      ? prisma.product.count({ where })
      : null;
    const useRecommendationRanking = sort === "recommended" && !search;
    const useDatabasePagination =
      limit > 0 && !search && !useRecommendationRanking;
    const productCandidateLimit =
      limit > 0
        ? useDatabasePagination
          ? limit
          : search
            ? Math.min(Math.max(offset + limit, limit * 3), 240)
            : useRecommendationRanking
              ? Math.min(Math.max(offset + limit * 6, 120), 600)
              : offset + limit
        : 0;

    const products = await prisma.product.findMany({
      where,
      orderBy:
        sort === "price_asc"
          ? [{ marketplacePriority: "desc" }, { price: "asc" }]
          : sort === "price_desc"
            ? [{ marketplacePriority: "desc" }, { price: "desc" }]
            : sort === "name_asc"
              ? [{ marketplacePriority: "desc" }, { name: "asc" }]
              : sort === "discount"
                ? [
                    { marketplacePriority: "desc" },
                    { discounts: { _count: "desc" } },
                    { createdAt: "desc" },
                  ]
                : [{ marketplacePriority: "desc" }, { createdAt: "desc" }],
      ...(useDatabasePagination ? { skip: offset } : {}),
      ...(productCandidateLimit > 0 ? { take: productCandidateLimit } : {}),
      include: {
        images: { select: { id: true, url: true }, take: 1 },
        businessCategory: {
          select: {
            id: true,
            name: true,
            slug: true,
            parent: { select: { id: true, name: true, slug: true } },
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            rating: true,
            reviewCount: true,
          },
        },
        discounts: {
          where: { isActive: true, validUntil: { gte: new Date() } },
          select: { percent: true, validUntil: true },
          take: 1,
        },
      },
    });

    const productIds = products.map((product) => product.id);
    const [inventoryExpiries, purchasedProducts, recentProductInteractions] =
      productIds.length
        ? await Promise.all([
            prisma.warehouseInventory.findMany({
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
            }),
            useRecommendationRanking
              ? prisma.orderItem.groupBy({
                  by: ["productId"],
                  where: {
                    productId: { in: productIds },
                    order: { deletedAt: null, status: { not: "CANCELLED" } },
                  },
                  _sum: { quantity: true },
                })
              : Promise.resolve([]),
            useRecommendationRanking
              ? prisma.productInteraction.groupBy({
                  by: ["productId"],
                  where: {
                    productId: { in: productIds },
                    createdAt: {
                      gte: new Date(Date.now() - 30 * 86_400_000),
                    },
                  },
                  _count: { _all: true },
                })
              : Promise.resolve([]),
          ])
        : [[], [], []];

    const purchasedQuantityByProductId = new Map(
      purchasedProducts.map((item) => [
        item.productId,
        item._sum.quantity || 0,
      ]),
    );
    const recentInteractionsByProductId = new Map(
      recentProductInteractions.map((item) => [
        item.productId || "",
        item._count._all,
      ]),
    );

    const expiryByProductId = new Map<string, Date>();
    for (const item of inventoryExpiries) {
      if (!expiryByProductId.has(item.productId) && item.expiryDate) {
        expiryByProductId.set(item.productId, item.expiryDate);
      }
    }

    const interestProfile = await getSafeProductInterestProfile({
      userId: (req as any).user?.userId,
      visitorId,
    });

    let response = products
      .map((product) => {
        const expiryDate = expiryByProductId.get(product.id) ?? null;
        return {
          ...product,
          images: product.images.filter(
            (image) => !isOversizedInlineImage(image.url),
          ),
          expiryDate: expiryDate?.toISOString() ?? null,
          searchScore: search ? scoreProductForSearch(product, search) : 0,
          interestScore: scoreProductForInterest(product, interestProfile),
        };
      })
      .filter((product) => !search || product.searchScore > 0)
      .sort((a, b) => {
        if (useRecommendationRanking) {
          const scoreA = productRecommendationScore(
            a,
            {
              purchasedQuantity: purchasedQuantityByProductId.get(a.id) || 0,
              recentInteractions: recentInteractionsByProductId.get(a.id) || 0,
            },
            recommendationSeed,
          );
          const scoreB = productRecommendationScore(
            b,
            {
              purchasedQuantity: purchasedQuantityByProductId.get(b.id) || 0,
              recentInteractions: recentInteractionsByProductId.get(b.id) || 0,
            },
            recommendationSeed,
          );
          if (scoreB !== scoreA) return scoreB - scoreA;
          return a.id.localeCompare(b.id);
        }
        if (!search) return 0;
        const priorityDiff =
          (b.marketplacePriority || 0) - (a.marketplacePriority || 0);
        if (priorityDiff !== 0) return priorityDiff;
        const combinedA = a.searchScore + (a.interestScore || 0) * 0.18;
        const combinedB = b.searchScore + (b.interestScore || 0) * 0.18;
        if (combinedB !== combinedA) return combinedB - combinedA;
        if (b.searchScore !== a.searchScore) {
          return b.searchScore - a.searchScore;
        }
        const expiryDiff =
          getExpirySortValue(a.expiryDate) - getExpirySortValue(b.expiryDate);
        if (expiryDiff !== 0) return expiryDiff;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });

    if (limit > 0 && !useDatabasePagination) {
      response = response.slice(offset, offset + limit);
    } else if (offset > 0 && !useDatabasePagination) {
      response = response.slice(offset);
    }

    if (includeMeta) {
      const totalCount = await totalCountPromise;
      return res.json({
        products: response,
        total: totalCount ?? response.length,
        limit,
        offset,
        hasMore:
          limit > 0
            ? offset + response.length < (totalCount ?? response.length)
            : false,
      });
    }

    return res.json(response);
  } catch (error) {
    console.error("get products error", error);
    return res
      .status(500)
      .json({ message: "Бараа авахад алдаа гарлаа", error: String(error) });
  }
});

router.post("/products/events", optionalAuth, async (req, res) => {
  try {
    const rawType = String(req.body?.type || "")
      .trim()
      .toUpperCase();
    if (!(rawType in ProductInteractionType)) {
      return res
        .status(400)
        .json({ message: "Дэмжигдэхгүй event төрөл байна" });
    }

    await recordProductInteraction({
      userId: (req as any).user?.userId,
      visitorId: req.body?.visitorId,
      type: ProductInteractionType[
        rawType as keyof typeof ProductInteractionType
      ],
      productId: req.body?.productId,
      businessCategoryId: req.body?.businessCategoryId,
      organizationId: req.body?.organizationId,
      searchQuery: req.body?.searchQuery,
      source: req.body?.source,
      metadata: req.body?.metadata,
    });

    return res.status(202).json({ ok: true });
  } catch (error) {
    console.error("record product event error", error);
    return res.status(500).json({ message: "Event хадгалахад алдаа гарлаа" });
  }
});

router.get(
  "/products/recommendations/personalized",
  optionalAuth,
  async (req, res) => {
    try {
      const rawLimit = parseInt(String(req.query.limit || ""), 10);
      const limit =
        Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(40, rawLimit) : 16;
      const visitorId = String(req.query.visitorId || "").trim();
      const interestProfile = await getSafeProductInterestProfile({
        userId: (req as any).user?.userId,
        visitorId,
      });

      const candidateWhere: any = {
        deletedAt: null,
        organization: { deletedAt: null, status: "ACTIVE" },
        isActive: true,
        reviewStatus: "APPROVED",
      };

      if (!canBypassAllWebProductsVisibility(req)) {
        const visibleOrganizationIds =
          await getWebProductsEnabledOrganizationIds();
        candidateWhere.organizationId = { in: visibleOrganizationIds };
      }

      const candidates = await prisma.product.findMany({
        where: candidateWhere,
        take: 180,
        orderBy: { createdAt: "desc" },
        include: {
          images: { select: { id: true, url: true } },
          businessCategory: {
            select: {
              id: true,
              name: true,
              slug: true,
              parent: { select: { id: true, name: true, slug: true } },
            },
          },
          organization: { select: { id: true, name: true, logoUrl: true } },
          discounts: {
            where: { isActive: true, validUntil: { gte: new Date() } },
            select: { percent: true, validUntil: true },
            take: 1,
          },
        },
      });

      const ranked = candidates
        .map((product) => ({
          ...product,
          interestScore: scoreProductForInterest(product, interestProfile),
        }))
        .sort((a, b) => {
          if (
            interestProfile.hasSignals &&
            b.interestScore !== a.interestScore
          ) {
            return b.interestScore - a.interestScore;
          }
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        })
        .slice(0, limit);

      return res.json({
        products: ranked,
        personalized: interestProfile.hasSignals,
      });
    } catch (error) {
      console.error("get personalized recommendations error", error);
      return res
        .status(500)
        .json({ message: "Хувийн санал болгох бараа авахад алдаа гарлаа" });
    }
  },
);

router.get("/products/trending", optionalAuth, async (req, res) => {
  try {
    const rawLimit = parseInt(String(req.query.limit || ""), 10);
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(18, rawLimit) : 6;
    const categoryId = String(req.query.businessCategoryId || "").trim();
    const period = String(req.query.period || "1d")
      .trim()
      .toLowerCase();
    const periodDays = period === "1m" ? 30 : period === "1w" ? 7 : 1;
    const since = new Date(Date.now() - periodDays * 86_400_000);

    const productWhere: any = {
      deletedAt: null,
      organization: { deletedAt: null, status: "ACTIVE" },
      isActive: true,
      reviewStatus: "APPROVED",
    };

    if (categoryId) {
      productWhere.businessCategoryId = {
        in: await resolveBusinessCategoryFilter(categoryId),
      };
    }

    if (!canBypassAllWebProductsVisibility(req)) {
      const visibleOrganizationIds =
        await getWebProductsEnabledOrganizationIds();
      productWhere.organizationId = { in: visibleOrganizationIds };
    }

    const trendingProductInclude = {
      images: { select: { id: true, url: true }, take: 1 },
      businessCategory: {
        select: {
          id: true,
          name: true,
          slug: true,
          parent: { select: { id: true, name: true, slug: true } },
        },
      },
      organization: { select: { id: true, name: true, logoUrl: true } },
      discounts: {
        where: { isActive: true, validUntil: { gte: new Date() } },
        select: { percent: true, validUntil: true },
        take: 1,
      },
    } as const;

    const viewedGroups = await prisma.productInteraction.groupBy({
      by: ["productId"],
      where: {
        productId: { not: null },
        type: "VIEW",
        createdAt: { gte: since },
        product: productWhere,
      },
      _sum: { weight: true },
      _count: { productId: true },
      orderBy: [{ _count: { productId: "desc" } }],
      take: limit,
    });

    const popularIds = viewedGroups
      .map((item) => item.productId)
      .filter((id): id is string => Boolean(id));
    const popularWeightById = new Map(
      viewedGroups
        .filter((item) => item.productId)
        .map((item) => [
          item.productId as string,
          (item._sum.weight || 0) + item._count.productId,
        ]),
    );

    const popularProducts = popularIds.length
      ? await prisma.product.findMany({
          where: { ...productWhere, id: { in: popularIds } },
          include: trendingProductInclude,
        })
      : [];

    const popularById = new Map(
      popularProducts.map((product) => [product.id, product]),
    );
    const rankedProducts = popularIds
      .map((id) => popularById.get(id))
      .filter((product): product is (typeof popularProducts)[number] =>
        Boolean(product),
      );

    const fallbackProducts =
      rankedProducts.length >= limit
        ? []
        : await prisma.product.findMany({
            where: {
              ...productWhere,
              ...(popularIds.length ? { id: { notIn: popularIds } } : {}),
            },
            orderBy: [{ marketplacePriority: "desc" }, { createdAt: "desc" }],
            take: limit - rankedProducts.length,
            include: trendingProductInclude,
          });

    const products = [...rankedProducts, ...fallbackProducts].map(
      (product) => ({
        ...product,
        images: product.images.filter(
          (image) => !isOversizedInlineImage(image.url),
        ),
        trendScore: popularWeightById.get(product.id) || 0,
      }),
    );

    return res.json({ products, period, categoryId: categoryId || null });
  } catch (error) {
    console.error("get trending products error", error);
    return res
      .status(500)
      .json({ message: "Их үзсэн бараа авахад алдаа гарлаа" });
  }
});

/* ─── GET /products/import-template ──────────────────────────────────── */
router.get("/products/import-template", async (req, res) => {
  try {
    const mode = String(req.query.mode || req.query.type || "")
      .trim()
      .toLowerCase();
    const isPreorderTemplate = mode === "preorder";
    const categoryChoices = await getImportBusinessCategoryChoices();
    const templateData = [
      {
        Зураг: "(зургаа энд оруулна)",
        "Нэр (name)": isPreorderTemplate
          ? "Жишээ захиалгын бараа 1"
          : "Жишээ бараа 1",
        "SKU (sku)": isPreorderTemplate ? "PRE-001" : "SKU-001",
        Ангилал: categoryChoices[0]?.label || "",
        "Үнэ (price)": 25000,
        "Өртөг (costPrice)": 15000,
        "Нөөц (stock)": isPreorderTemplate ? 0 : 100,
        "Тайлбар (description)": "Барааны тайлбар энд бичнэ",
        ...(isPreorderTemplate
          ? {
              "Ирэх хоног (preorderLeadTimeDays)": 14,
              "Захиалгын тайлбар (preorderNote)":
                "Хятадаас захиалгаар 14 хоногт ирнэ",
            }
          : {}),
      },
      {
        Зураг: "(зургаа энд оруулна)",
        "Нэр (name)": isPreorderTemplate
          ? "Жишээ захиалгын бараа 2"
          : "Жишээ бараа 2",
        "SKU (sku)": isPreorderTemplate ? "PRE-002" : "SKU-002",
        Ангилал: categoryChoices[1]?.label || categoryChoices[0]?.label || "",
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
      { wch: 18 },
      { wch: 25 },
      { wch: 15 },
      { wch: 28 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 35 },
      ...(isPreorderTemplate ? [{ wch: 24 }, { wch: 36 }] : []),
    ];
    // Make image column rows taller for pasting images
    ws["!rows"] = [{ hpt: 20 }, { hpt: 60 }, { hpt: 60 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Бараа");
    const categorySheet = XLSX.utils.json_to_sheet(
      categoryChoices.map((choice) => ({
        Ангилал: choice.label,
        Нэр: choice.name,
        Slug: choice.slug,
        ID: choice.id,
      })),
    );
    categorySheet["!cols"] = [
      { wch: 36 },
      { wch: 24 },
      { wch: 24 },
      { wch: 38 },
    ];
    XLSX.utils.book_append_sheet(wb, categorySheet, "Ангиллууд");

    const buf = await addCategoryDropdownToWorkbook(
      Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" })),
      categoryChoices.length,
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${isPreorderTemplate ? "preorder_product_import_template" : "product_import_template"}.xlsx"`,
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    return res.send(buf);
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
  businessCategory: string;
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
    businessCategory: importRowValue(row, colMap.businessCategory),
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
  upload.single("file"),
  async (req, res) => {
    try {
      const organizationId = req.body.organizationId;
      if (!organizationId) {
        return res.status(400).json({ message: "organizationId шаардлагатай" });
      }

      const perm = await assertOrgPermission(
        req,
        res,
        organizationId,
        Permission.MANAGE_PRODUCTS,
      );
      if (!perm) return;

      const importMode = String(
        req.body.mode ||
          req.body.type ||
          req.query.mode ||
          req.query.type ||
          "",
      )
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
          where: {
            slug: { equals: org.businessCategory, mode: "insensitive" },
          },
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
        console.log(
          "[import] Embedded images map has",
          embeddedImages.size,
          "rows with images",
        );

        // Count media files and detect structure for debug
        try {
          const z = await JSZip.loadAsync(req.file.buffer);
          const files = Object.keys(z.files);
          mediaFileCount = files.filter((f) =>
            f.startsWith("xl/media/"),
          ).length;
          hasRichData = files.some((f) =>
            f.includes("richData/richValueRel.xml"),
          );
          hasDrawings = files.some((f) =>
            /xl\/drawings\/drawing\d+\.xml$/.test(f),
          );
        } catch {
          /* ignore */
        }
      } else if (req.body.rows) {
        let parsedRows: unknown;
        try {
          parsedRows =
            typeof req.body.rows === "string"
              ? JSON.parse(req.body.rows)
              : req.body.rows;
        } catch {
          return res.status(400).json({ message: "rows JSON буруу байна" });
        }
        if (!Array.isArray(parsedRows)) {
          return res.status(400).json({ message: "rows талбар буруу байна" });
        }
        rows = parsedRows.map((row) =>
          normalizeExcelRow(row as Record<string, unknown>),
        );
      } else {
        return res
          .status(400)
          .json({ message: "Excel файл эсвэл зассан мөр шаардлагатай" });
      }

      if (!rows.length) {
        return res
          .status(400)
          .json({ message: "Excel файлд мэдээлэл олдсонгүй" });
      }

      if (rows.length > 1000) {
        return res
          .status(400)
          .json({ message: "Нэг удаад 1000-аас олон бараа оруулах боломжгүй" });
      }

      // Enforce plan product limit during import
      const remainingSlots: number | undefined = (req as any)
        .remainingProductSlots;
      if (remainingSlots !== undefined && rows.length > remainingSlots) {
        return res.status(400).json({
          message: `Таны планд ${remainingSlots} бараа нэмэх зай үлдсэн байна. Файлд ${rows.length} бараа байна.`,
          code: "PRODUCT_LIMIT_WOULD_EXCEED",
          remaining: remainingSlots,
        });
      }

      // Column name mapping — supports both Mongolian & English headers
      const colMap = PRODUCT_COL_MAP;
      const categoryChoices = await getImportBusinessCategoryChoices();

      const results: {
        created: number;
        updated: number;
        skipped: number;
        errors: string[];
        errorRows: ProductImportErrorRow[];
        products: Array<{
          id: string;
          name: string;
          sku: string | null;
          price: number;
          stock: number;
        }>;
        _debug?: { embeddedImageRows: number; mediaFiles: number };
      } = {
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [],
        errorRows: [],
        products: [],
      };
      const actorId = (req as any).user?.userId ?? null;
      const reviewData = await getReviewStatusForVendorMutation();

      // Pre-scan: detect duplicate SKUs within the file
      const skusInFile = new Map<string, number>();
      const duplicateSkuRows = new Set<number>();
      for (let i = 0; i < rows.length; i++) {
        const rowNumber = getExcelRowIndex(rows[i], i) + 1;
        const sku = resolveCol(rows[i], colMap.sku);
        if (sku) {
          const normalized = String(sku).trim().toLowerCase();
          if (skusInFile.has(normalized)) {
            const message = `Мөр ${rowNumber}: SKU "${String(sku).trim()}" файл дотор давхардсан (мөр ${skusInFile.get(normalized)})`;
            results.errors.push(message);
            results.errorRows.push(
              toProductImportErrorRow(rows[i], rowNumber, message, colMap),
            );
            results.skipped++;
            duplicateSkuRows.add(i);
          } else {
            skusInFile.set(normalized, rowNumber);
          }
        }
      }

      for (let i = 0; i < rows.length; i++) {
        // Skip rows already flagged as duplicates in pre-scan
        if (duplicateSkuRows.has(i)) continue;

        const row = rows[i];
        const excelRowIndex = getExcelRowIndex(row, i);
        const rowNum = excelRowIndex + 1;

        const name = resolveCol(row, colMap.name);
        const sku = resolveCol(row, colMap.sku);
        const businessCategoryRaw = resolveCol(row, colMap.businessCategory);
        const price = resolveCol(row, colMap.price);
        const costPrice = resolveCol(row, colMap.costPrice);
        const stock = resolveCol(row, colMap.stock);
        const description = resolveCol(row, colMap.description);
        const preorderLeadTimeDays = resolveCol(
          row,
          colMap.preorderLeadTimeDays,
        );
        const preorderNote = resolveCol(row, colMap.preorderNote);
        const imagesRaw = resolveCol(row, colMap.images);

        if (!name || price === undefined) {
          const message = `Мөр ${rowNum}: Нэр болон үнэ заавал шаардлагатай`;
          results.errors.push(message);
          results.errorRows.push(
            toProductImportErrorRow(row, rowNum, message, colMap),
          );
          results.skipped++;
          continue;
        }

        const priceNum = parseFloat(String(price));
        if (isNaN(priceNum) || priceNum < 0) {
          const message = `Мөр ${rowNum}: Үнэ буруу — "${price}"`;
          results.errors.push(message);
          results.errorRows.push(
            toProductImportErrorRow(row, rowNum, message, colMap),
          );
          results.skipped++;
          continue;
        }

        const costPriceNum =
          costPrice !== undefined ? parseFloat(String(costPrice)) : null;
        if (
          costPriceNum !== null &&
          (isNaN(costPriceNum) || costPriceNum < 0)
        ) {
          const message = `Мөр ${rowNum}: Өртөг үнэ буруу — "${costPrice}"`;
          results.errors.push(message);
          results.errorRows.push(
            toProductImportErrorRow(row, rowNum, message, colMap),
          );
          results.skipped++;
          continue;
        }

        const stockNum = stock !== undefined ? parseInt(String(stock)) : 0;
        if (isNaN(stockNum) || stockNum < 0 || stockNum > 2_147_483_647) {
          const message = `Мөр ${rowNum}: Нөөц буруу — "${stock}"`;
          results.errors.push(message);
          results.errorRows.push(
            toProductImportErrorRow(row, rowNum, message, colMap),
          );
          results.skipped++;
          continue;
        }

        const normalizedLeadTimeDays = isPreorderImport
          ? normalizePreorderLeadTimeDays(preorderLeadTimeDays ?? 14)
          : null;
        if (normalizedLeadTimeDays === undefined) {
          const message = `Мөр ${rowNum}: Ирэх хоног 0-365 хооронд байх ёстой`;
          results.errors.push(message);
          results.errorRows.push(
            toProductImportErrorRow(row, rowNum, message, colMap),
          );
          results.skipped++;
          continue;
        }

        const normalizedSku = sku ? String(sku).trim() : null;
        const rowBusinessCategoryId = resolveBusinessCategoryIdFromChoices(
          businessCategoryRaw,
          categoryChoices,
        );
        if (rowBusinessCategoryId === undefined) {
          const message = `Мөр ${rowNum}: Ангилал олдсонгүй — "${String(businessCategoryRaw).trim()}"`;
          results.errors.push(message);
          results.errorRows.push(
            toProductImportErrorRow(row, rowNum, message, colMap),
          );
          results.skipped++;
          continue;
        }

        try {
          // Parse image URLs (comma-separated) from text column
          let imageUrls: string[] = imagesRaw
            ? String(imagesRaw)
                .split(",")
                .map((u) => u.trim())
                .filter((u) => u.startsWith("http"))
                .slice(0, 5)
            : [];

          // If no URL images, check for embedded images in this row
          // Row index in the xlsx drawing/richData XML is 0-based.
          if (imageUrls.length === 0) {
            const rowBuffers = embeddedImages.get(excelRowIndex);
            console.log(
              `[import] Row ${rowNum}: embedded buffers = ${rowBuffers?.length ?? 0}`,
            );
            if (rowBuffers && rowBuffers.length > 0) {
              const uploadPromises = rowBuffers
                .slice(0, 5)
                .map((buf) => uploadBufferToSupabase(buf));
              const uploaded = await Promise.all(uploadPromises);
              imageUrls = uploaded.filter((u): u is string => u !== null);
              console.log(
                `[import] Row ${rowNum}: uploaded ${imageUrls.length} images`,
              );
            }
          }

          const productData = {
            name: String(name).trim(),
            description: description ? String(description).trim() : null,
            price: priceNum,
            costPrice: costPriceNum,
            stock: isPreorderImport ? 0 : stockNum,
            supplyType: isPreorderImport
              ? ("CHINA_PREORDER" as const)
              : ("IN_STOCK" as const),
            preorderLeadTimeDays: isPreorderImport
              ? normalizedLeadTimeDays
              : null,
            preorderNote:
              isPreorderImport && preorderNote
                ? String(preorderNote).trim()
                : null,
            businessCategoryId: rowBusinessCategoryId || orgBusinessCategoryId,
            isActive: true,
            submittedById: actorId,
            ...reviewData,
          };

          let product;
          let wasUpdate = false;
          if (normalizedSku) {
            // Free up SKU from any soft-deleted product first
            await prisma.product.updateMany({
              where: {
                organizationId,
                sku: normalizedSku,
                deletedAt: { not: null },
              },
              data: { sku: null },
            });
            // Check if active product with this SKU already exists
            const existing = await prisma.product.findUnique({
              where: {
                organizationId_sku: { organizationId, sku: normalizedSku },
              },
              select: { id: true, masterProductId: true },
            });
            wasUpdate = !!existing;
            const masterProduct = await resolveMasterProduct(prisma, {
              masterProductId: existing?.masterProductId,
              name: productData.name,
              description: productData.description,
              imageUrl: imageUrls[0] || null,
            });
            if (!masterProduct) throw new Error("MASTER_PRODUCT_NOT_FOUND");
            await addMasterProductAlias(
              prisma,
              masterProduct.id,
              productData.name,
            );
            // Upsert: update if SKU exists, create if not
            product = await prisma.product.upsert({
              where: {
                organizationId_sku: { organizationId, sku: normalizedSku },
              },
              update: {
                ...productData,
                masterProductId: masterProduct.id,
                deletedAt: null,
                ...(imageUrls.length > 0 && {
                  images: {
                    deleteMany: {},
                    create: imageUrls.map((url) => ({ url })),
                  },
                }),
              },
              create: {
                organizationId,
                sku: normalizedSku,
                ...productData,
                masterProductId: masterProduct.id,
                ...(imageUrls.length > 0 && {
                  images: { create: imageUrls.map((url) => ({ url })) },
                }),
              },
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                stock: true,
              },
            });
          } else {
            const masterProduct = await resolveMasterProduct(prisma, {
              name: productData.name,
              description: productData.description,
              imageUrl: imageUrls[0] || null,
            });
            if (!masterProduct) throw new Error("MASTER_PRODUCT_NOT_FOUND");
            await addMasterProductAlias(
              prisma,
              masterProduct.id,
              productData.name,
            );
            product = await prisma.product.create({
              data: {
                organizationId,
                sku: null,
                ...productData,
                masterProductId: masterProduct.id,
                ...(imageUrls.length > 0 && {
                  images: { create: imageUrls.map((url) => ({ url })) },
                }),
              },
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                stock: true,
              },
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
          results.errorRows.push(
            toProductImportErrorRow(row, rowNum, message, colMap),
          );
          results.skipped++;
        }
      }

      return res.json({
        message: `${results.created} бараа шинээр, ${results.updated} бараа шинэчлэгдлээ${results.skipped > 0 ? `, ${results.skipped} алгасав` : ""}`,
        total: rows.length,
        ...results,
        _debug: {
          embeddedImageRows: embeddedImages.size,
          mediaFiles: mediaFileCount,
          hasRichData,
          hasDrawings,
        },
      });
    } catch (error) {
      console.error("import products error", error);
      return res.status(500).json({
        message: "Excel импорт хийхэд алдаа гарлаа",
        error: String(error),
      });
    }
  },
);

/* ─── GET /products/master-catalog/search ──────────────────────────── */
router.get(
  "/products/master-catalog/admin/export",
  requireAuth,
  async (req, res) => {
    if (!canAccessMasterCatalogAdmin(req)) {
      return res
        .status(403)
        .json({ message: "Нэгдсэн барааны сан экспортлох эрхгүй" });
    }
    try {
      const rows = await buildMasterCatalogDataset(
        String(req.query.search || ""),
      );
      const sheet = XLSX.utils.json_to_sheet(
        rows.map((row, index) => ({
          "№": index + 1,
          "Canonical ID": row.id,
          "Барааны нэр": row.canonicalName,
          Баркод: row.barcode || "",
          Брэнд: row.brand || "",
          Нэгж: row.unit || "",
          Ангилал: row.categoryName || "",
          "Өөр нэршлүүд": row.aliases.join(", "),
          "Холбогдсон бараа": row.linkedProductCount,
          "Байгууллагын тоо": row.organizationCount,
          "Системийн үлдэгдэл": row.systemStock,
          "90 хоногийн борлуулалт": row.systemSoldQuantity90d,
          "90 хоногийн татан авалт": row.systemRequestedQuantity90d,
          Шинэчилсэн: row.updatedAt,
        })),
      );
      sheet["!cols"] = [
        { wch: 6 },
        { wch: 38 },
        { wch: 34 },
        { wch: 18 },
        { wch: 18 },
        { wch: 12 },
        { wch: 22 },
        { wch: 45 },
        { wch: 18 },
        { wch: 18 },
        { wch: 20 },
        { wch: 22 },
        { wch: 22 },
        { wch: 24 },
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "Нэгдсэн бараа");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="master-products-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      );
      return res.send(Buffer.from(buffer));
    } catch (error) {
      console.error("master catalog export error", error);
      return res
        .status(500)
        .json({ message: "Excel экспорт хийхэд алдаа гарлаа" });
    }
  },
);

router.post(
  "/products/master-catalog/admin/sync",
  requireAuth,
  async (req, res) => {
    if (!canAccessMasterCatalogAdmin(req)) {
      return res
        .status(403)
        .json({ message: "Нэгдсэн барааны сан шинэчлэх эрхгүй" });
    }
    try {
      const products = await prisma.product.findMany({
        where: { masterProductId: null, deletedAt: null },
        select: {
          id: true,
          name: true,
          barcode: true,
          unit: true,
          description: true,
          businessCategory: { select: { name: true } },
          category: { select: { name: true } },
          images: { select: { url: true }, take: 1 },
        },
        orderBy: { createdAt: "asc" },
        take: 500,
      });
      let linked = 0;
      for (const product of products) {
        const master = await resolveMasterProduct(prisma, {
          name: product.name,
          barcode: product.barcode,
          unit: product.unit,
          description: product.description,
          imageUrl: product.images[0]?.url || null,
          categoryName:
            product.businessCategory?.name || product.category?.name || null,
        });
        if (!master) continue;
        await addMasterProductAlias(prisma, master.id, product.name);
        await prisma.product.update({
          where: { id: product.id },
          data: { masterProductId: master.id },
        });
        linked++;
      }
      const remaining = await prisma.product.count({
        where: { masterProductId: null, deletedAt: null },
      });
      return res.json({ linked, remaining, hasMore: remaining > 0 });
    } catch (error) {
      console.error("master catalog sync error", error);
      return res.status(500).json({
        message: "Нэгдсэн барааны сан шинэчлэхэд алдаа гарлаа",
      });
    }
  },
);

router.get(
  "/products/master-catalog/admin/ai-dataset",
  requireAuth,
  async (req, res) => {
    if (!canAccessMasterCatalogAdmin(req)) {
      return res.status(403).json({ message: "AI dataset авах эрхгүй" });
    }
    try {
      const products = await buildMasterCatalogDataset(
        String(req.query.search || ""),
      );
      return res.json({
        schemaVersion: "master-product-analytics.v1",
        generatedAt: new Date().toISOString(),
        periodDays: 90,
        privacy: "Aggregated metrics only; organization identities excluded",
        fields: {
          systemSoldQuantity90d: "Online + POS completed sales",
          systemRequestedQuantity90d: "Non-cancelled warehouse requests",
          systemStock: "Current stock across warehouses",
        },
        products,
      });
    } catch (error) {
      console.error("master catalog AI dataset error", error);
      return res
        .status(500)
        .json({ message: "AI dataset бэлтгэхэд алдаа гарлаа" });
    }
  },
);

router.get("/products/master-catalog/admin", requireAuth, async (req, res) => {
  if (!canAccessMasterCatalogAdmin(req)) {
    return res
      .status(403)
      .json({ message: "Нэгдсэн барааны сан харах эрхгүй" });
  }
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(10, Number(req.query.limit) || 50));
    const rows = await buildMasterCatalogDataset(
      String(req.query.search || ""),
    );
    const start = (page - 1) * limit;
    return res.json({
      items: rows.slice(start, start + limit),
      total: rows.length,
      page,
      limit,
      hasMore: start + limit < rows.length,
      unlinkedProductCount: await prisma.product.count({
        where: { masterProductId: null, deletedAt: null },
      }),
    });
  } catch (error) {
    console.error("master catalog admin list error", error);
    return res
      .status(500)
      .json({ message: "Нэгдсэн барааны сан авахад алдаа гарлаа" });
  }
});

router.get("/products/master-catalog/search", requireAuth, async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();
    const barcode = normalizeMasterBarcode(String(req.query.barcode || ""));
    if (!barcode && query.length < 2) return res.json([]);

    const normalizedQuery = normalizeMasterName(query);
    const products = await prisma.masterProduct.findMany({
      where: {
        status: "ACTIVE",
        ...(barcode
          ? { barcode }
          : {
              OR: [
                { normalizedName: { contains: normalizedQuery } },
                {
                  aliases: {
                    some: { normalizedValue: { contains: normalizedQuery } },
                  },
                },
              ],
            }),
      },
      select: {
        id: true,
        canonicalName: true,
        barcode: true,
        brand: true,
        unit: true,
        description: true,
        imageUrl: true,
        categoryName: true,
        _count: { select: { products: true } },
      },
      orderBy: [{ products: { _count: "desc" } }, { canonicalName: "asc" }],
      take: 40,
    });

    const seen = new Set<string>();
    return res.json(
      products
        .filter((product) => {
          const key = product.barcode
            ? `barcode:${product.barcode}`
            : `name:${normalizeMasterName(product.canonicalName)}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, 12)
        .map(({ _count, ...product }) => ({
          ...product,
          usageCount: _count.products,
          exactBarcodeMatch: Boolean(barcode && product.barcode === barcode),
        })),
    );
  } catch (error) {
    console.error("search master products error", error);
    return res
      .status(500)
      .json({ message: "Нэгдсэн барааны сан хайхад алдаа гарлаа" });
  }
});

/* ─── GET /products/:id ─────────────────────────────────────────────── */
router.get("/products/:id/recommendations", optionalAuth, async (req, res) => {
  try {
    const rawLimit = parseInt(String(req.query.limit || ""), 10);
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(20, rawLimit) : 8;
    const visitorId = String(req.query.visitorId || "").trim();

    const source = await prisma.product.findUnique({
      where: { id: req.params.id, deletedAt: null },
      include: {
        businessCategory: {
          select: {
            id: true,
            name: true,
            slug: true,
            parent: { select: { id: true, name: true, slug: true } },
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            status: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!source) return res.status(404).json({ message: "Бараа олдсонгүй" });

    const canBypassVisibility = await canBypassWebProductsVisibility(
      req,
      source.organizationId,
    );
    if (!canBypassVisibility && !(await areWebProductsGloballyEnabled())) {
      return res.status(404).json({ message: "Бараа олдсонгүй" });
    }

    const sourceIsPubliclyVisible =
      source.isActive &&
      isApprovedVendorContent(source.reviewStatus) &&
      source.organization.deletedAt === null &&
      source.organization.status === "ACTIVE" &&
      (await isOrgWebProductsEnabled(source.organizationId));

    if (!canBypassVisibility && !sourceIsPubliclyVisible) {
      return res.status(404).json({ message: "Бараа олдсонгүй" });
    }

    const candidateWhere: any = {
      id: { not: source.id },
      deletedAt: null,
      organization: { deletedAt: null, status: "ACTIVE" },
      isActive: true,
      reviewStatus: "APPROVED",
    };

    if (!canBypassAllWebProductsVisibility(req)) {
      const visibleOrganizationIds =
        await getWebProductsEnabledOrganizationIds();
      candidateWhere.organizationId = { in: visibleOrganizationIds };
    }

    const categoryIds = source.businessCategoryId
      ? await resolveBusinessCategoryFilter(source.businessCategoryId)
      : [];
    const parentCategoryId = source.businessCategory?.parent?.id;
    const categorySignals = [
      ...(categoryIds.length > 0
        ? [{ businessCategoryId: { in: categoryIds } }]
        : []),
      ...(parentCategoryId
        ? [{ businessCategory: { parentId: parentCategoryId } }]
        : []),
      { organizationId: source.organizationId },
    ];

    const candidates = await prisma.product.findMany({
      where: {
        ...candidateWhere,
        OR: categorySignals,
      },
      take: 80,
      orderBy: { createdAt: "desc" },
      include: {
        images: { select: { id: true, url: true } },
        businessCategory: {
          select: {
            id: true,
            name: true,
            slug: true,
            parent: { select: { id: true, name: true, slug: true } },
          },
        },
        organization: { select: { id: true, name: true, logoUrl: true } },
        discounts: {
          where: { isActive: true, validUntil: { gte: new Date() } },
          select: { percent: true, validUntil: true },
          take: 1,
        },
      },
    });

    const interestProfile = await getSafeProductInterestProfile({
      userId: (req as any).user?.userId,
      visitorId,
    });

    const ranked = candidates
      .map((candidate) => ({
        ...candidate,
        similarityScore: scoreProductSimilarity(source, candidate),
        interestScore: scoreProductForInterest(candidate, interestProfile),
      }))
      .filter(
        (candidate) =>
          candidate.similarityScore > 0 || candidate.interestScore > 0,
      )
      .sort((a, b) => {
        const aScore = a.similarityScore + (a.interestScore || 0) * 0.28;
        const bScore = b.similarityScore + (b.interestScore || 0) * 0.28;
        if (bScore !== aScore) {
          return bScore - aScore;
        }
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });

    const related = ranked.slice(0, limit);
    const relatedIds = new Set(related.map((candidate) => candidate.id));
    const vendor = ranked
      .filter(
        (candidate) =>
          candidate.organizationId === source.organizationId &&
          !relatedIds.has(candidate.id),
      )
      .slice(0, Math.min(6, limit));

    return res.json({
      relatedProducts: related,
      vendorProducts: vendor,
    });
  } catch (error) {
    console.error("get product recommendations error", error);
    return res.status(500).json({
      message: "Санал болгох бараа авахад алдаа гарлаа",
      error: String(error),
    });
  }
});

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
    const canBypassVisibility = await canBypassWebProductsVisibility(
      req,
      product.organizationId,
    );
    if (!canBypassVisibility && !(await areWebProductsGloballyEnabled())) {
      return res.status(404).json({ message: "Бараа олдсонгүй" });
    }

    const isPubliclyVisible =
      product.isActive &&
      isApprovedVendorContent(product.reviewStatus) &&
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
    return res
      .status(500)
      .json({ message: "Алдаа гарлаа", error: String(error) });
  }
});

/* ─── POST /products ────────────────────────────────────────────────── */
router.post(
  "/products",
  requireAuth,
  requireOrgPermission({ from: "body" }, Permission.MANAGE_PRODUCTS),
  async (req, res) => {
    try {
      const {
        organizationId,
        masterProductId,
        name,
        description,
        sku,
        barcode,
        unit,
        price,
        wholesalePrice,
        orderPrice,
        costPrice,
        taxType,
        cityTaxRate,
        classificationCode,
        taxProductCode,
        isRestaurantMenuItem,
        menuCategory,
        kitchenStation,
        preparationMinutes,
        stock,
        expiryDate,
        supplyType,
        preorderLeadTimeDays,
        preorderNote,
        marketplacePriority,
        businessCategoryId: inputCategoryId,
        images, // string[] — base64 or URL
      } = req.body;

      let businessCategoryId = inputCategoryId;
      let businessCategoryName: string | null = null;

      if (!organizationId || !name || price === undefined) {
        return res
          .status(400)
          .json({ message: "organizationId, name, price шаардлагатай" });
      }

      // Auto-resolve businessCategoryId from organization if not provided
      if (!businessCategoryId) {
        const org = await prisma.organization.findUnique({
          where: { id: organizationId },
          select: { businessCategory: true },
        });
        if (org?.businessCategory) {
          const matched = await prisma.businessCategory.findFirst({
            where: {
              slug: { equals: org.businessCategory, mode: "insensitive" },
            },
            select: { id: true },
          });
          if (matched) businessCategoryId = matched.id;
        }
      }

      const priceNum = parseFloat(String(price));
      if (isNaN(priceNum) || priceNum < 0) {
        return res.status(400).json({ message: "Үнэ буруу байна" });
      }
      const parseOptionalPrice = (value: unknown) => {
        if (value === undefined || value === null || value === "") return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
      };
      const wholesalePriceNum = parseOptionalPrice(wholesalePrice);
      const orderPriceNum = parseOptionalPrice(orderPrice);
      if (wholesalePriceNum === undefined || orderPriceNum === undefined) {
        return res.status(400).json({ message: "Нэмэлт үнэ буруу байна" });
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
        return res
          .status(400)
          .json({ message: "Нөөц 0-2,147,483,647 хооронд байх ёстой" });
      }

      const normalizedSupplyType = normalizeSupplyType(supplyType);
      const parsedExpiryDate =
        normalizedSupplyType === "CHINA_PREORDER"
          ? null
          : parseOptionalExpiryDate(expiryDate);
      if (expiryDate !== undefined && parsedExpiryDate === undefined) {
        return res.status(400).json({ message: "Дуусах хугацаа буруу байна" });
      }
      const normalizedTaxType = normalizeTaxType(taxType);
      const normalizedCityTaxRate = normalizePercent(cityTaxRate, 0);
      if (normalizedCityTaxRate === undefined) {
        return res
          .status(400)
          .json({ message: "Хотын татвар 0-100 хооронд байх ёстой" });
      }
      const normalizedPreparationMinutes =
        normalizePreparationMinutes(preparationMinutes);
      if (normalizedPreparationMinutes === undefined) {
        return res.status(400).json({
          message: "Бэлтгэх хугацаа 0-1440 минутын хооронд байх ёстой",
        });
      }
      const restaurantMenuEnabled = isTruthyQueryValue(isRestaurantMenuItem);
      const normalizedMenuCategory = restaurantMenuEnabled
        ? normalizeRestaurantMenuCategory(menuCategory)
        : null;
      const normalizedKitchenStation = restaurantMenuEnabled
        ? normalizeKitchenStation(kitchenStation)
        : null;
      if (
        restaurantMenuEnabled &&
        (!normalizedMenuCategory || !normalizedKitchenStation)
      ) {
        return res.status(400).json({
          message: "Хоолны ангилал болон гал тогооны хэсэг шаардлагатай",
        });
      }
      if (
        normalizedSupplyType === "CHINA_PREORDER" &&
        !(await isOrgFeatureEnabled(
          organizationId,
          PREORDER_PRODUCTS_FEATURE_KEY,
        ))
      ) {
        return res
          .status(403)
          .json({ message: "Захиалгын бараа бүртгэх эрх нээгдээгүй байна" });
      }
      const normalizedLeadTimeDays =
        normalizePreorderLeadTimeDays(preorderLeadTimeDays);
      if (normalizedLeadTimeDays === undefined) {
        return res
          .status(400)
          .json({ message: "Ирэх хоног 0-365 хооронд байх ёстой" });
      }
      const normalizedMarketplacePriority =
        normalizeMarketplacePriority(marketplacePriority);
      if (normalizedMarketplacePriority === undefined) {
        return res.status(400).json({
          message:
            "Marketplace дараалал 0-1,000,000 хооронд бүхэл тоо байх ёстой",
        });
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
          return res.status(409).json({
            message: "Ижил SKU-тэй бараа аль хэдийн бүртгэлтэй байна",
          });
        }
      }

      if (normalizedBarcode) {
        const existingBarcode = await prisma.product.findFirst({
          where: {
            organizationId,
            barcode: normalizedBarcode,
            deletedAt: null,
          },
          select: { id: true },
        });
        if (existingBarcode) {
          return res.status(409).json({
            message: "Ижил баркодтой бараа танай бүртгэлд байна",
          });
        }
      }

      if (businessCategoryId) {
        const category = await prisma.businessCategory.findUnique({
          where: { id: String(businessCategoryId) },
          select: { id: true, name: true },
        });
        if (!category) {
          return res
            .status(400)
            .json({ message: "Сонгосон ангилал олдсонгүй" });
        }
        businessCategoryName = category.name;
      }

      // Validate max 5 images
      const imageUrls: string[] = Array.isArray(images)
        ? images.slice(0, 5)
        : [];
      const actorId = (req as any).user?.userId ?? null;
      const reviewData = await getReviewStatusForVendorMutation();

      const product = await prisma.$transaction(async (tx) => {
        const masterProduct = await resolveMasterProduct(tx, {
          masterProductId: masterProductId ? String(masterProductId) : null,
          name: String(name),
          barcode: normalizedBarcode,
          unit: unit ? String(unit) : null,
          description: description ? String(description) : null,
          imageUrl: imageUrls[0] || null,
          categoryName: businessCategoryName,
        });
        if (!masterProduct) {
          throw new Error("MASTER_PRODUCT_NOT_FOUND");
        }

        const created = await tx.product.create({
          data: {
            organizationId,
            masterProductId: masterProduct.id,
            submittedById: actorId,
            name: masterProduct.canonicalName,
            description: description ? String(description).trim() : null,
            sku: normalizedSku,
            barcode: masterProduct.barcode || normalizedBarcode,
            unit: masterProduct.unit || (unit ? String(unit).trim() : null),
            price: priceNum,
            wholesalePrice: wholesalePriceNum,
            orderPrice: orderPriceNum,
            costPrice: costPriceNum,
            taxType: normalizedTaxType,
            cityTaxRate: normalizedCityTaxRate,
            classificationCode: normalizeClassificationCode(classificationCode),
            taxProductCode: normalizeOptionalText(taxProductCode),
            isRestaurantMenuItem: restaurantMenuEnabled,
            menuCategory: normalizedMenuCategory,
            kitchenStation: normalizedKitchenStation,
            preparationMinutes: restaurantMenuEnabled
              ? normalizedPreparationMinutes
              : null,
            stock: stockNum,
            supplyType: normalizedSupplyType,
            preorderLeadTimeDays:
              normalizedSupplyType === "CHINA_PREORDER"
                ? normalizedLeadTimeDays
                : null,
            preorderNote:
              normalizedSupplyType === "CHINA_PREORDER" && preorderNote
                ? String(preorderNote).trim()
                : null,
            marketplacePriority: normalizedMarketplacePriority,
            businessCategoryId: businessCategoryId || null,
            isActive: true,
            ...reviewData,
            images: {
              create: imageUrls.map((url) => ({ url })),
            },
          },
          include: {
            images: { select: { id: true, url: true } },
            businessCategory: { select: { id: true, name: true, slug: true } },
          },
        });

        await addMasterProductAlias(tx, masterProduct.id, String(name));
        if (!masterProduct.sourceProductId) {
          await tx.masterProduct.update({
            where: { id: masterProduct.id },
            data: {
              sourceProductId: created.id,
              imageUrl: masterProduct.imageUrl || imageUrls[0] || null,
            },
          });
        }

        await upsertVendorProductInventory(tx, {
          organizationId,
          productId: created.id,
          stock: stockNum,
          stockProvided:
            normalizedSupplyType !== "CHINA_PREORDER" || stockNum > 0,
          expiryDate: parsedExpiryDate,
          expiryDateProvided:
            expiryDate !== undefined &&
            normalizedSupplyType !== "CHINA_PREORDER",
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
      if (
        error instanceof Error &&
        error.message === "MASTER_PRODUCT_NOT_FOUND"
      ) {
        return res.status(400).json({
          message: "Сонгосон нэгдсэн бараа олдсонгүй",
        });
      }
      const maybePrisma = error as {
        code?: string;
        meta?: { target?: unknown };
      };
      if (maybePrisma?.code === "P2002") {
        const target = Array.isArray(maybePrisma.meta?.target)
          ? maybePrisma.meta?.target.join(",")
          : String(maybePrisma.meta?.target || "");
        if (target.includes("organizationId") && target.includes("sku")) {
          return res.status(409).json({
            message: "Ижил SKU-тэй бараа аль хэдийн бүртгэлтэй байна",
          });
        }
        return res.status(409).json({
          message: target
            ? `Давхардсан утга байна (${target})`
            : "Давхардсан утга байна",
        });
      }
      if (maybePrisma?.code === "P2003") {
        return res.status(400).json({
          message:
            "Холбоотой өгөгдөл буруу байна (ангилал/байгууллага шалгана уу)",
        });
      }
      console.error("create product error", error);
      return res
        .status(500)
        .json({ message: "Бараа үүсгэхэд алдаа гарлаа", error: String(error) });
    }
  },
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
      unit,
      price,
      wholesalePrice,
      orderPrice,
      costPrice,
      taxType,
      cityTaxRate,
      classificationCode,
      taxProductCode,
      isRestaurantMenuItem,
      menuCategory,
      kitchenStation,
      preparationMinutes,
      stock,
      expiryDate,
      supplyType,
      preorderLeadTimeDays,
      preorderNote,
      marketplacePriority,
      businessCategoryId,
      isActive,
      images, // full replacement: string[]
    } = req.body;

    const existing = await prisma.product.findUnique({
      where: { id, deletedAt: null },
    });
    if (!existing) return res.status(404).json({ message: "Бараа олдсонгүй" });

    const perm = await assertProductMutationPermission(req, res, existing);
    if (!perm) return;

    const nextSupplyType =
      supplyType !== undefined
        ? normalizeSupplyType(supplyType)
        : existing.supplyType;
    const parsedExpiryDate =
      nextSupplyType === "CHINA_PREORDER"
        ? null
        : parseOptionalExpiryDate(expiryDate);
    if (expiryDate !== undefined && parsedExpiryDate === undefined) {
      return res.status(400).json({ message: "Дуусах хугацаа буруу байна" });
    }

    const data: Record<string, unknown> = {};
    let stockNumForInventory: number | undefined;
    if (name !== undefined) data.name = String(name).trim();
    if (description !== undefined)
      data.description = description ? String(description).trim() : null;
    if (sku !== undefined) data.sku = sku ? String(sku).trim() : null;
    if (barcode !== undefined)
      data.barcode = barcode ? String(barcode).trim() : null;
    if (unit !== undefined) data.unit = unit ? String(unit).trim() : null;
    if (price !== undefined) {
      const p = parseFloat(String(price));
      if (isNaN(p) || p < 0)
        return res.status(400).json({ message: "Үнэ буруу байна" });
      data.price = p;
    }
    for (const [field, value] of [
      ["wholesalePrice", wholesalePrice],
      ["orderPrice", orderPrice],
    ] as const) {
      if (value === undefined) continue;
      if (value === null || value === "") {
        data[field] = null;
        continue;
      }
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return res.status(400).json({ message: "Нэмэлт үнэ буруу байна" });
      }
      data[field] = parsed;
    }
    if (costPrice !== undefined)
      data.costPrice = costPrice ? parseFloat(String(costPrice)) : null;
    if (taxType !== undefined) data.taxType = normalizeTaxType(taxType);
    if (cityTaxRate !== undefined) {
      const normalizedCityTaxRate = normalizePercent(cityTaxRate, 0);
      if (normalizedCityTaxRate === undefined) {
        return res
          .status(400)
          .json({ message: "Хотын татвар 0-100 хооронд байх ёстой" });
      }
      data.cityTaxRate = normalizedCityTaxRate;
    }
    if (classificationCode !== undefined)
      data.classificationCode = normalizeClassificationCode(classificationCode);
    if (taxProductCode !== undefined)
      data.taxProductCode = normalizeOptionalText(taxProductCode);
    const nextRestaurantMenuEnabled =
      isRestaurantMenuItem !== undefined
        ? isTruthyQueryValue(isRestaurantMenuItem)
        : existing.isRestaurantMenuItem;
    if (isRestaurantMenuItem !== undefined) {
      data.isRestaurantMenuItem = nextRestaurantMenuEnabled;
    }
    if (
      menuCategory !== undefined ||
      kitchenStation !== undefined ||
      preparationMinutes !== undefined ||
      isRestaurantMenuItem !== undefined
    ) {
      const nextMenuCategory = nextRestaurantMenuEnabled
        ? normalizeRestaurantMenuCategory(
            menuCategory !== undefined ? menuCategory : existing.menuCategory,
          )
        : null;
      const nextKitchenStation = nextRestaurantMenuEnabled
        ? normalizeKitchenStation(
            kitchenStation !== undefined
              ? kitchenStation
              : existing.kitchenStation,
          )
        : null;
      const nextPreparationMinutes = normalizePreparationMinutes(
        preparationMinutes !== undefined
          ? preparationMinutes
          : existing.preparationMinutes,
      );
      if (nextPreparationMinutes === undefined) {
        return res.status(400).json({
          message: "Бэлтгэх хугацаа 0-1440 минутын хооронд байх ёстой",
        });
      }
      if (
        nextRestaurantMenuEnabled &&
        (!nextMenuCategory || !nextKitchenStation)
      ) {
        return res.status(400).json({
          message: "Хоолны ангилал болон гал тогооны хэсэг шаардлагатай",
        });
      }
      data.menuCategory = nextMenuCategory;
      data.kitchenStation = nextKitchenStation;
      data.preparationMinutes = nextRestaurantMenuEnabled
        ? nextPreparationMinutes
        : null;
    }
    if (stock !== undefined) {
      const s = parseInt(String(stock));
      if (isNaN(s) || s < 0 || s > 2_147_483_647)
        return res
          .status(400)
          .json({ message: "Нөөц 0-2,147,483,647 хооронд байх ёстой" });
      data.stock = s;
      stockNumForInventory = s;
    }
    if (supplyType !== undefined) {
      if (
        nextSupplyType === "CHINA_PREORDER" &&
        !(await isOrgFeatureEnabled(
          existing.organizationId,
          PREORDER_PRODUCTS_FEATURE_KEY,
        ))
      ) {
        return res
          .status(403)
          .json({ message: "Захиалгын бараа бүртгэх эрх нээгдээгүй байна" });
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
        return res
          .status(400)
          .json({ message: "Ирэх хоног 0-365 хооронд байх ёстой" });
      }
      data.preorderLeadTimeDays = leadTimeDays;
    }
    if (preorderNote !== undefined)
      data.preorderNote = preorderNote ? String(preorderNote).trim() : null;
    if (marketplacePriority !== undefined) {
      const normalizedMarketplacePriority =
        normalizeMarketplacePriority(marketplacePriority);
      if (normalizedMarketplacePriority === undefined) {
        return res.status(400).json({
          message:
            "Marketplace дараалал 0-1,000,000 хооронд бүхэл тоо байх ёстой",
        });
      }
      data.marketplacePriority = normalizedMarketplacePriority;
    }
    if (businessCategoryId !== undefined)
      data.businessCategoryId = businessCategoryId || null;
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const actorId = (req as any).user?.userId ?? null;
    const reviewData = await getReviewStatusForVendorMutation();
    Object.assign(data, {
      ...reviewData,
      submittedById: actorId,
    });
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
    return res
      .status(500)
      .json({ message: "Бараа засахад алдаа гарлаа", error: String(error) });
  }
});

/* ─── PATCH /products/:id/images ────────────────────────────────────── */
router.patch("/products/:id/images", requireAuth, async (req, res) => {
  try {
    const id = req.params.id as string;
    const { images } = req.body;

    if (!Array.isArray(images)) {
      return res
        .status(400)
        .json({ message: "images талбар шаардлагатай (string[])" });
    }

    const existing = await prisma.product.findUnique({
      where: { id, deletedAt: null },
    });
    if (!existing) return res.status(404).json({ message: "Бараа олдсонгүй" });

    const perm = await assertProductMutationPermission(req, res, existing);
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
    return res
      .status(500)
      .json({ message: "Зураг шинэчлэхэд алдаа гарлаа", error: String(error) });
  }
});

/* ─── POST /products/upload-image ────────────────────────────────────── */
router.post(
  "/products/upload-image",
  requireAuth,
  imageUpload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Зураг файл шаардлагатай" });
      }

      // Keep product entry usable in local/self-hosted environments without
      // object storage. The returned data URL is persisted in ProductImage.
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
        const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
        console.warn("upload-image: using database image fallback");
        return res.json({
          url: dataUrl,
          storage: "database",
        });
      }

      const ext = path.extname(req.file.originalname).toLowerCase() || ".jpg";
      const fileName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
      const filePath = `products/${fileName}`;

      console.log(
        "upload-image: uploading",
        filePath,
        "size:",
        req.file.size,
        "type:",
        req.file.mimetype,
      );

      const { error } = await getSupabase()
        .storage.from(PRODUCT_IMAGES_BUCKET)
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (error) {
        console.error("supabase upload error", error);
        return res.status(500).json({
          message: "Зураг upload хийхэд алдаа гарлаа",
          error: error.message,
        });
      }

      const { data: publicUrlData } = getSupabase()
        .storage.from(PRODUCT_IMAGES_BUCKET)
        .getPublicUrl(filePath);

      console.log("upload-image: success", publicUrlData.publicUrl);
      return res.json({ url: publicUrlData.publicUrl });
    } catch (error) {
      console.error("upload image error", error);
      return res.status(500).json({
        message: "Зураг upload хийхэд алдаа гарлаа",
        error: String(error),
      });
    }
  },
);

/* ─── DELETE /products/:id ──────────────────────────────────────────── */
router.delete("/products/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.product.findUnique({
      where: { id, deletedAt: null },
    });
    if (!existing) return res.status(404).json({ message: "Бараа олдсонгүй" });

    const perm = await assertProductMutationPermission(req, res, existing);
    if (!perm) return;

    await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, sku: null },
    });

    return res.json({ message: "Бараа устгагдлаа" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Бараа устгахад алдаа гарлаа", error: String(error) });
  }
});

export default router;
