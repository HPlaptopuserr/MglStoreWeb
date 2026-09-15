import crypto from "crypto";
import express, {
  Router,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import {
  InventoryReason,
  Prisma,
  WarehouseGoodsReceiptStatus,
  prisma,
} from "@mgl/database";
import { requireAuth, type AuthPayload } from "../../middleware/auth";
import { adjustStock } from "../../services/inventory.service";
import { hasWarehouseAccess } from "../../services/warehouse-access.service";
import { parseWarehouseGoodsReceiptInput } from "../../services/warehouse-goods-receipt.policy";
import { approvedStockRequestQuantity } from "../../services/stock-reservation.service";
import { getSupabase, PRODUCT_IMAGES_BUCKET } from "../../lib/supabase";
import { parseWarehouseDateRange } from "../../services/warehouse-date-range";

const router: ExpressRouter = Router();
const receiptUploadsDir = path.resolve(
  __dirname,
  "../../../uploads/warehouse-goods-receipts",
);
fs.mkdirSync(receiptUploadsDir, { recursive: true });
router.use(
  "/warehouse-goods-receipts/uploads",
  express.static(receiptUploadsDir),
);

const receiptAttachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, callback) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (allowed.includes(file.mimetype)) {
      callback(null, true);
      return;
    }
    callback(new Error("Зөвхөн JPG, PNG, WebP эсвэл PDF файл оруулна уу"));
  },
});

function attachmentExtension(file: Express.Multer.File): string {
  const extensions: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
  };
  return extensions[file.mimetype] ?? path.extname(file.originalname) ?? "";
}

async function saveReceiptAttachment(file: Express.Multer.File) {
  const fileName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${attachmentExtension(file)}`;
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    await fs.promises.writeFile(
      path.join(receiptUploadsDir, fileName),
      file.buffer,
    );
    return `/api/warehouse-goods-receipts/uploads/${fileName}`;
  }
  const storagePath = `warehouse-goods-receipts/${fileName}`;
  const { error } = await getSupabase()
    .storage.from(PRODUCT_IMAGES_BUCKET)
    .upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });
  if (error) throw new Error(error.message);
  return getSupabase()
    .storage.from(PRODUCT_IMAGES_BUCKET)
    .getPublicUrl(storagePath).data.publicUrl;
}

function actor(req: Request): AuthPayload | undefined {
  return (req as Request & { user?: AuthPayload }).user;
}

async function requireWarehouseAccess(
  req: Request,
  res: Response,
  warehouseId: string,
): Promise<boolean> {
  if (await hasWarehouseAccess(actor(req), warehouseId)) return true;
  res
    .status(403)
    .json({ message: "Энэ агуулахын падаанд хандах эрхгүй байна" });
  return false;
}

function createReceiptNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `GRN-${date}-${crypto.randomInt(100000, 1000000)}`;
}

const receiptInclude = {
  warehouse: {
    select: { id: true, name: true, address: true, phone: true },
  },
  createdBy: {
    select: { id: true, email: true, profile: { select: { fullName: true } } },
  },
  confirmedBy: {
    select: { id: true, email: true, profile: { select: { fullName: true } } },
  },
  items: {
    include: {
      product: {
        select: { id: true, name: true, sku: true, barcode: true, unit: true },
      },
    },
  },
  attachments: true,
} satisfies Prisma.WarehouseGoodsReceiptInclude;

async function confirmReceipt(
  tx: Prisma.TransactionClient,
  receiptId: string,
  userId: string,
) {
  await tx.$queryRaw`SELECT "id" FROM "WarehouseGoodsReceipt" WHERE "id" = ${receiptId} FOR UPDATE`;
  const receipt = await tx.warehouseGoodsReceipt.findUnique({
    where: { id: receiptId },
    include: { items: true },
  });
  if (!receipt) throw new Error("RECEIPT_NOT_FOUND");
  if (receipt.status !== WarehouseGoodsReceiptStatus.DRAFT)
    throw new Error("RECEIPT_NOT_DRAFT");

  for (const item of receipt.items) {
    await adjustStock(tx, {
      productId: item.productId,
      warehouseId: receipt.warehouseId,
      change: item.quantity,
      reason: InventoryReason.RESTOCK,
      note: `${receipt.receiptNumber} · ${receipt.supplierName}`,
      createdById: userId,
      referenceId: receipt.id,
      referenceType: "WAREHOUSE_GOODS_RECEIPT",
    });
    await tx.warehouseInventory.update({
      where: {
        warehouseId_productId: {
          warehouseId: receipt.warehouseId,
          productId: item.productId,
        },
      },
      data: {
        lastRestockedAt: new Date(),
        ...(item.batchNumber ? { batchNumber: item.batchNumber } : {}),
        ...(item.expiryDate ? { expiryDate: item.expiryDate } : {}),
        ...(item.location ? { location: item.location } : {}),
      },
    });
  }

  return tx.warehouseGoodsReceipt.update({
    where: { id: receipt.id },
    data: {
      status: WarehouseGoodsReceiptStatus.CONFIRMED,
      confirmedById: userId,
      confirmedAt: new Date(),
    },
    include: receiptInclude,
  });
}

router.get("/warehouse-goods-receipts", requireAuth, async (req, res) => {
  try {
    const warehouseId =
      typeof req.query.warehouseId === "string" ? req.query.warehouseId : "";
    if (!warehouseId)
      return res.status(400).json({ message: "Агуулах шаардлагатай" });
    if (!(await requireWarehouseAccess(req, res, warehouseId))) return;

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    const rawStatus =
      typeof req.query.status === "string" ? req.query.status : "";
    const status = Object.values(WarehouseGoodsReceiptStatus).includes(
      rawStatus as WarehouseGoodsReceiptStatus,
    )
      ? (rawStatus as WarehouseGoodsReceiptStatus)
      : undefined;
    const where: Prisma.WarehouseGoodsReceiptWhereInput = {
      warehouseId,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { receiptNumber: { contains: search, mode: "insensitive" } },
              { supplierName: { contains: search, mode: "insensitive" } },
              {
                supplierDocumentNumber: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                items: {
                  some: {
                    product: {
                      OR: [
                        { name: { contains: search, mode: "insensitive" } },
                        { sku: { contains: search, mode: "insensitive" } },
                        { barcode: { contains: search, mode: "insensitive" } },
                      ],
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };
    const [receipts, total] = await Promise.all([
      prisma.warehouseGoodsReceipt.findMany({
        where,
        include: receiptInclude,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.warehouseGoodsReceipt.count({ where }),
    ]);
    return res.json({
      receipts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("list warehouse goods receipts error", error);
    return res
      .status(500)
      .json({ message: "Орлогын падаануудыг авахад алдаа гарлаа" });
  }
});

router.get("/warehouse-goods-receipts/:id", requireAuth, async (req, res) => {
  try {
    const receipt = await prisma.warehouseGoodsReceipt.findUnique({
      where: { id: req.params.id },
      include: receiptInclude,
    });
    if (!receipt)
      return res.status(404).json({ message: "Орлогын падаан олдсонгүй" });
    if (!(await requireWarehouseAccess(req, res, receipt.warehouseId))) return;
    return res.json(receipt);
  } catch (error) {
    console.error("get warehouse goods receipt error", error);
    return res
      .status(500)
      .json({ message: "Орлогын падаан авахад алдаа гарлаа" });
  }
});

router.post(
  "/warehouse-goods-receipts/:id/attachments",
  requireAuth,
  (req, res) => {
    receiptAttachmentUpload.array("files", 5)(req, res, async (uploadError) => {
      if (uploadError)
        return res.status(400).json({
          message:
            uploadError instanceof Error
              ? uploadError.message
              : "Файл оруулахад алдаа гарлаа",
        });
      try {
        const receipt = await prisma.warehouseGoodsReceipt.findUnique({
          where: { id: req.params.id },
        });
        if (!receipt)
          return res.status(404).json({ message: "Орлогын падаан олдсонгүй" });
        if (!(await requireWarehouseAccess(req, res, receipt.warehouseId)))
          return;
        if (receipt.status !== WarehouseGoodsReceiptStatus.DRAFT)
          return res.status(409).json({
            message: "Зөвхөн ноорог падаанд файл хавсаргана",
          });
        const files = Array.isArray(req.files)
          ? (req.files as Express.Multer.File[])
          : [];
        if (files.length === 0)
          return res.status(400).json({ message: "Файл сонгоно уу" });
        const existingCount =
          await prisma.warehouseGoodsReceiptAttachment.count({
            where: { receiptId: receipt.id },
          });
        if (existingCount + files.length > 5)
          return res.status(400).json({
            message: "Нэг падаанд хамгийн ихдээ 5 файл хавсаргана",
          });
        const uploaded = await Promise.all(
          files.map(async (file) => ({
            receiptId: receipt.id,
            name: file.originalname.slice(0, 255),
            mimeType: file.mimetype,
            url: await saveReceiptAttachment(file),
          })),
        );
        await prisma.warehouseGoodsReceiptAttachment.createMany({
          data: uploaded,
        });
        const attachments =
          await prisma.warehouseGoodsReceiptAttachment.findMany({
            where: { receiptId: receipt.id },
            orderBy: { createdAt: "asc" },
          });
        return res.status(201).json({ attachments });
      } catch (error) {
        console.error("upload warehouse goods receipt attachment error", error);
        return res.status(500).json({
          message: "Падааны файл хадгалахад алдаа гарлаа",
        });
      }
    });
  },
);

router.post("/warehouse-goods-receipts", requireAuth, async (req, res) => {
  try {
    const parsed = parseWarehouseGoodsReceiptInput(req.body);
    if (!parsed.success)
      return res.status(400).json({ message: parsed.message });
    const input = parsed.data;
    const user = actor(req);
    if (!user?.userId)
      return res.status(401).json({ message: "Нэвтрэх шаардлагатай" });
    if (!(await requireWarehouseAccess(req, res, input.warehouseId))) return;

    const productIds = [...new Set(input.items.map((item) => item.productId))];
    const productCount = await prisma.product.count({
      where: { id: { in: productIds }, isActive: true, deletedAt: null },
    });
    if (productCount !== productIds.length)
      return res
        .status(400)
        .json({ message: "Нэг буюу хэд хэдэн бараа олдсонгүй" });

    const created = await prisma.$transaction(async (tx) => {
      const receipt = await tx.warehouseGoodsReceipt.create({
        data: {
          receiptNumber: createReceiptNumber(),
          warehouseId: input.warehouseId,
          supplierName: input.supplierName,
          supplierRegisterNumber: input.supplierRegisterNumber,
          supplierDocumentNumber: input.supplierDocumentNumber,
          documentDate: input.documentDate,
          note: input.note,
          createdById: user.userId,
          items: { create: input.items },
        },
      });
      return input.confirm
        ? confirmReceipt(tx, receipt.id, user.userId)
        : tx.warehouseGoodsReceipt.findUniqueOrThrow({
            where: { id: receipt.id },
            include: receiptInclude,
          });
    });
    return res.status(201).json(created);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return res.status(409).json({
        message: "Энэ нийлүүлэгчийн падааны дугаар өмнө бүртгэгдсэн байна",
      });
    console.error("create warehouse goods receipt error", error);
    return res
      .status(500)
      .json({ message: "Орлогын падаан хадгалахад алдаа гарлаа" });
  }
});

router.patch(
  "/warehouse-goods-receipts/:id/confirm",
  requireAuth,
  async (req, res) => {
    try {
      const existing = await prisma.warehouseGoodsReceipt.findUnique({
        where: { id: req.params.id },
      });
      if (!existing)
        return res.status(404).json({ message: "Орлогын падаан олдсонгүй" });
      if (!(await requireWarehouseAccess(req, res, existing.warehouseId)))
        return;
      const user = actor(req);
      if (!user?.userId)
        return res.status(401).json({ message: "Нэвтрэх шаардлагатай" });
      const confirmed = await prisma.$transaction((tx) =>
        confirmReceipt(tx, existing.id, user.userId),
      );
      return res.json(confirmed);
    } catch (error) {
      if (error instanceof Error && error.message === "RECEIPT_NOT_DRAFT")
        return res
          .status(409)
          .json({ message: "Зөвхөн ноорог падааныг баталгаажуулна" });
      console.error("confirm warehouse goods receipt error", error);
      return res
        .status(500)
        .json({ message: "Орлогын падаан баталгаажуулахад алдаа гарлаа" });
    }
  },
);

router.patch(
  "/warehouse-goods-receipts/:id/cancel",
  requireAuth,
  async (req, res) => {
    try {
      const reason =
        typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
      if (!reason)
        return res
          .status(400)
          .json({ message: "Цуцлах шалтгаан шаардлагатай" });

      const existing = await prisma.warehouseGoodsReceipt.findUnique({
        where: { id: req.params.id },
        include: { items: true },
      });
      if (!existing)
        return res.status(404).json({ message: "Орлогын падаан олдсонгүй" });
      if (!(await requireWarehouseAccess(req, res, existing.warehouseId)))
        return;
      if (existing.status === WarehouseGoodsReceiptStatus.CANCELLED)
        return res
          .status(409)
          .json({ message: "Падаан аль хэдийн цуцлагдсан" });
      const user = actor(req);
      if (!user?.userId)
        return res.status(401).json({ message: "Нэвтрэх шаардлагатай" });

      const cancelled = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "WarehouseGoodsReceipt" WHERE "id" = ${existing.id} FOR UPDATE`;
        const lockedReceipt = await tx.warehouseGoodsReceipt.findUnique({
          where: { id: existing.id },
          include: { items: true },
        });
        if (!lockedReceipt) throw new Error("RECEIPT_NOT_FOUND");
        if (lockedReceipt.status === WarehouseGoodsReceiptStatus.CANCELLED)
          throw new Error("RECEIPT_ALREADY_CANCELLED");

        if (lockedReceipt.status === WarehouseGoodsReceiptStatus.CONFIRMED) {
          const totals = new Map<string, number>();
          for (const item of lockedReceipt.items) {
            totals.set(
              item.productId,
              (totals.get(item.productId) ?? 0) + item.quantity,
            );
          }
          const inventories = await tx.warehouseInventory.findMany({
            where: {
              warehouseId: lockedReceipt.warehouseId,
              productId: { in: [...totals.keys()] },
            },
            select: { productId: true, quantity: true },
          });
          const insufficient = inventories.find(
            (inventory) =>
              inventory.quantity < (totals.get(inventory.productId) ?? 0),
          );
          if (insufficient || inventories.length !== totals.size)
            throw new Error("INSUFFICIENT_STOCK_TO_CANCEL");

          for (const item of lockedReceipt.items) {
            await adjustStock(tx, {
              productId: item.productId,
              warehouseId: lockedReceipt.warehouseId,
              change: -item.quantity,
              reason: InventoryReason.MANUAL_ADJUST,
              note: `${lockedReceipt.receiptNumber} цуцлагдсан · ${reason}`,
              createdById: user.userId,
              referenceId: existing.id,
              referenceType: "WAREHOUSE_GOODS_RECEIPT_CANCELLATION",
            });
          }
        }

        return tx.warehouseGoodsReceipt.update({
          where: { id: existing.id },
          data: {
            status: WarehouseGoodsReceiptStatus.CANCELLED,
            cancelledAt: new Date(),
            cancellationReason: reason.slice(0, 1000),
          },
          include: receiptInclude,
        });
      });
      return res.json(cancelled);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "INSUFFICIENT_STOCK_TO_CANCEL"
      )
        return res.status(409).json({
          message:
            "Падаанаар орсон барааны зарим нь аль хэдийн зарлагадсан тул цуцлах боломжгүй",
        });
      if (
        error instanceof Error &&
        error.message === "RECEIPT_ALREADY_CANCELLED"
      )
        return res
          .status(409)
          .json({ message: "Падаан аль хэдийн цуцлагдсан" });
      console.error("cancel warehouse goods receipt error", error);
      return res
        .status(500)
        .json({ message: "Орлогын падаан цуцлахад алдаа гарлаа" });
    }
  },
);

router.get("/warehouse-movement-documents", requireAuth, async (req, res) => {
  try {
    const warehouseId =
      typeof req.query.warehouseId === "string" ? req.query.warehouseId : "";
    if (!warehouseId)
      return res.status(400).json({ message: "Агуулах шаардлагатай" });
    if (!(await requireWarehouseAccess(req, res, warehouseId))) return;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    const dateRange = parseWarehouseDateRange(req.query.from, req.query.to);
    const productSearch = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { sku: { contains: search, mode: "insensitive" as const } },
            { barcode: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : undefined;

    const [receipts, dispatches, manualDispatches] = await Promise.all([
      prisma.warehouseGoodsReceipt.findMany({
        where: {
          warehouseId,
          ...(search
            ? {
                OR: [
                  { receiptNumber: { contains: search, mode: "insensitive" } },
                  { supplierName: { contains: search, mode: "insensitive" } },
                  {
                    supplierDocumentNumber: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                  { items: { some: { product: productSearch } } },
                ],
              }
            : {}),
        },
        include: receiptInclude,
      }),
      prisma.stockDispatch.findMany({
        where: {
          warehouseId,
          ...(search
            ? {
                OR: [
                  { dispatchNumber: { contains: search, mode: "insensitive" } },
                  {
                    request: {
                      requestNumber: { contains: search, mode: "insensitive" },
                    },
                  },
                  {
                    organization: {
                      name: { contains: search, mode: "insensitive" },
                    },
                  },
                  { request: { items: { some: { product: productSearch } } } },
                ],
              }
            : {}),
        },
        include: {
          warehouse: {
            select: {
              id: true,
              name: true,
              address: true,
              phone: true,
              createdBy: {
                select: {
                  email: true,
                  profile: { select: { fullName: true } },
                },
              },
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
              members: {
                where: { role: "OWNER", isActive: true, deletedAt: null },
                take: 1,
                select: {
                  user: {
                    select: {
                      email: true,
                      profile: { select: { fullName: true } },
                    },
                  },
                },
              },
            },
          },
          request: {
            include: {
              payment: { select: { invoiceNumber: true } },
              items: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      sku: true,
                      barcode: true,
                      unit: true,
                      price: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.warehouseManualDispatch.findMany({
        where: {
          warehouseId,
          ...(search
            ? {
                OR: [
                  { dispatchNumber: { contains: search, mode: "insensitive" } },
                  { recipientName: { contains: search, mode: "insensitive" } },
                  { address: { contains: search, mode: "insensitive" } },
                  { items: { some: { product: productSearch } } },
                ],
              }
            : {}),
        },
        include: {
          warehouse: {
            select: { id: true, name: true, address: true, phone: true },
          },
          createdBy: {
            select: {
              email: true,
              profile: { select: { fullName: true } },
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  barcode: true,
                  unit: true,
                  price: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const dispatchOperators = await prisma.inventoryLedger.findMany({
      where: {
        warehouseId,
        referenceType: "STOCK_DISPATCH",
        referenceId: { in: dispatches.map((dispatch) => dispatch.requestId) },
        createdById: { not: null },
        change: { lt: 0 },
      },
      select: {
        referenceId: true,
        createdBy: {
          select: {
            email: true,
            profile: { select: { fullName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    const operatorByRequestId = new Map<string, string>();
    for (const ledger of dispatchOperators) {
      if (!ledger.referenceId || !ledger.createdBy) continue;
      if (!operatorByRequestId.has(ledger.referenceId)) {
        operatorByRequestId.set(
          ledger.referenceId,
          ledger.createdBy.profile?.fullName || ledger.createdBy.email,
        );
      }
    }

    const documents = [
      ...receipts.map((receipt) => ({
        id: receipt.id,
        number: receipt.receiptNumber,
        relatedNumber: receipt.supplierDocumentNumber,
        direction: "IN" as const,
        documentType: "GOODS_RECEIPT" as const,
        partyName: receipt.supplierName,
        partyAddress: null,
        partyPhone: null,
        partyOwnerName: null,
        warehouseName: receipt.warehouse.name,
        warehouseAddress: receipt.warehouse.address,
        warehousePhone: receipt.warehouse.phone,
        supplierRegisterNumber: receipt.supplierRegisterNumber,
        invoiceNumber: receipt.supplierDocumentNumber,
        driverName: null,
        driverPhone: null,
        vehicleNumber: null,
        operatorName:
          receipt.confirmedBy?.profile?.fullName ||
          receipt.confirmedBy?.email ||
          receipt.createdBy.profile?.fullName ||
          receipt.createdBy.email,
        status: receipt.status,
        occurredAt: receipt.confirmedAt ?? receipt.createdAt,
        items: receipt.items.map((item) => ({
          id: item.id,
          product: item.product,
          quantity: item.quantity,
          unitPrice: Number(item.unitCost),
        })),
      })),
      ...dispatches.map((dispatch) => ({
        id: dispatch.id,
        number: dispatch.dispatchNumber,
        relatedNumber: dispatch.request.requestNumber,
        direction: "OUT" as const,
        documentType: "STOCK_DISPATCH" as const,
        partyName: dispatch.organization.name,
        partyAddress: dispatch.request.deliveryAddress,
        partyPhone: dispatch.request.deliveryPhone,
        partyOwnerName:
          dispatch.organization.members[0]?.user.profile?.fullName ||
          dispatch.organization.members[0]?.user.email ||
          null,
        warehouseName: dispatch.warehouse.name,
        warehouseAddress: dispatch.warehouse.address,
        warehousePhone: dispatch.warehouse.phone,
        supplierRegisterNumber: null,
        invoiceNumber: dispatch.request.payment?.invoiceNumber || null,
        driverName: dispatch.driverName,
        driverPhone: dispatch.driverPhone,
        vehicleNumber: dispatch.vehicleNumber,
        operatorName:
          operatorByRequestId.get(dispatch.requestId) ||
          dispatch.warehouse.createdBy?.profile?.fullName ||
          dispatch.warehouse.createdBy?.email ||
          null,
        status: dispatch.status,
        occurredAt: dispatch.dispatchedAt ?? dispatch.createdAt,
        items: dispatch.request.items.map((item) => ({
          id: item.id,
          product: item.product,
          quantity: approvedStockRequestQuantity(item),
          unitPrice: Number(item.product.price),
        })),
      })),
      ...manualDispatches.map((dispatch) => ({
        id: dispatch.id,
        number: dispatch.dispatchNumber,
        relatedNumber: null,
        direction: "OUT" as const,
        documentType: "MANUAL_DISPATCH" as const,
        partyName: dispatch.recipientName || dispatch.address,
        partyAddress: dispatch.address,
        partyPhone: dispatch.recipientPhone,
        partyOwnerName: null,
        warehouseName: dispatch.warehouse.name,
        warehouseAddress: dispatch.warehouse.address,
        warehousePhone: dispatch.warehouse.phone,
        supplierRegisterNumber: null,
        invoiceNumber: null,
        driverName: null,
        driverPhone: null,
        vehicleNumber: null,
        operatorName:
          dispatch.createdBy.profile?.fullName || dispatch.createdBy.email,
        status: "CONFIRMED",
        occurredAt: dispatch.createdAt,
        items: dispatch.items.map((item) => ({
          id: item.id,
          product: item.product,
          quantity: item.quantity,
          unitPrice: Number(item.product.price),
        })),
      })),
    ]
      .filter(
        (document) =>
          (!dateRange.from || document.occurredAt >= dateRange.from) &&
          (!dateRange.to || document.occurredAt <= dateRange.to),
      )
      .sort(
        (left, right) => right.occurredAt.getTime() - left.occurredAt.getTime(),
      );

    const total = documents.length;
    return res.json({
      documents: documents.slice((page - 1) * limit, page * limit),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("list warehouse movement documents error", error);
    return res
      .status(500)
      .json({ message: "Падааны хөдөлгөөн авахад алдаа гарлаа" });
  }
});

export default router;
