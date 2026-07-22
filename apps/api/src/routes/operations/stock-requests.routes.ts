import { Router, type Request, type Router as ExpressRouter } from "express";
import {
  prisma,
  StockRequestStatus,
  PaymentStatus,
  InventoryReason,
  PaymentMethod,
  ReturnStatus,
  WarehouseType,
} from "@mgl/database";
import type { Prisma } from "@mgl/database";
import { Permission, hasPlatformPermission, isFullAdmin } from "@mgl/types";
import {
  adjustStock,
  syncProductStock,
} from "../../services/inventory.service";
import {
  requireAuth,
  requirePlatformPermission,
  type AuthPayload,
} from "../../middleware/auth";
import {
  assertOrgPermission,
  requireOrgPermission,
} from "../../services/permission.service";
import { createQPayInvoice, checkQPayPayment } from "../../services/qpay";
import { buildProcurementAdvice } from "../../services/procurement-ai.service";
import {
  canPayApprovedStockRequest,
  isPaymentMethod,
  validatePaymentConfirmation,
} from "../../services/stock-payment.policy";
import {
  hasWarehouseAccess,
  type WarehouseActor,
} from "../../services/warehouse-access.service";
import stockReturnRoutes from "./stock-returns.routes";

const router: ExpressRouter = Router();
const DISPATCH_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "DISPATCHED",
  "DELIVERED",
  "CANCELLED",
] as const;

function getActor(req: Request) {
  return (req as Request & { user?: AuthPayload }).user;
}

async function assertWarehouseAccess(
  req: Parameters<typeof requireAuth>[0],
  res: Parameters<typeof requireAuth>[1],
  warehouseId: string,
) {
  const actor = (
    req as typeof req & {
      user?: WarehouseActor;
    }
  ).user;
  if (!(await hasWarehouseAccess(actor, warehouseId))) {
    res.status(403).json({ message: "Энэ агуулахад хандах эрхгүй байна" });
    return false;
  }
  return true;
}

router.post(
  "/stock-requests/procurement/ai-recommendations",
  requireAuth,
  async (req, res) => {
    const organizationId = req.body?.organizationId as string | undefined;
    const candidates = req.body?.candidates as unknown;
    if (!organizationId || !Array.isArray(candidates)) {
      return res.status(400).json({ message: "Барааны мэдээлэл дутуу байна" });
    }
    const permissions = await assertOrgPermission(
      req,
      res,
      organizationId,
      Permission.REQUEST_STOCK,
    );
    if (!permissions) return;

    const normalized = candidates
      .filter(
        (item): item is Record<string, unknown> =>
          item !== null && typeof item === "object",
      )
      .slice(0, 30)
      .map((item) => ({
        productId: String(item.productId || "").slice(0, 64),
        name: String(item.name || "Бараа").slice(0, 160),
        availableStock: Math.max(0, Number(item.availableStock) || 0),
        organizationStock: Math.max(0, Number(item.organizationStock) || 0),
        reorderPoint: Math.max(0, Number(item.reorderPoint) || 0),
        soldQuantity90d: Math.max(0, Number(item.soldQuantity90d) || 0),
        systemRequestedQuantity90d: Math.max(
          0,
          Number(item.systemRequestedQuantity90d) || 0,
        ),
        previouslyRequestedQuantity: Math.max(
          0,
          Number(item.previouslyRequestedQuantity) || 0,
        ),
      }))
      .filter(
        (item) =>
          item.productId &&
          item.availableStock > 0 &&
          ((item.reorderPoint > 0 &&
            item.organizationStock < item.reorderPoint) ||
            item.soldQuantity90d > 0 ||
            item.previouslyRequestedQuantity > 0),
      );

    return res.json(await buildProcurementAdvice(normalized));
  },
);

const getOutstandingStockPayments = async (
  organizationId: string,
  excludePaymentId?: string,
) => {
  const payments = await prisma.stockRequestPayment.findMany({
    where: {
      organizationId,
      status: { not: PaymentStatus.CANCELLED },
      request: {
        status: {
          notIn: [StockRequestStatus.CANCELLED, StockRequestStatus.REJECTED],
        },
      },
      ...(excludePaymentId ? { id: { not: excludePaymentId } } : {}),
    },
    include: {
      request: { select: { requestNumber: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return payments
    .map((payment) => ({
      ...payment,
      outstandingAmount: Math.max(
        0,
        Number(payment.totalAmount) - Number(payment.paidAmount),
      ),
    }))
    .filter((payment) => payment.outstandingAmount > 0);
};

const serializeOutstandingPayment = (
  payment: Awaited<ReturnType<typeof getOutstandingStockPayments>>[number],
) => ({
  id: payment.id,
  invoiceNumber: payment.invoiceNumber,
  requestNumber: payment.request.requestNumber,
  outstandingAmount: payment.outstandingAmount,
  totalAmount: Number(payment.totalAmount),
  paidAmount: Number(payment.paidAmount),
  status: payment.status,
  dueDate: payment.dueDate,
});

// Generate dispatch number  DSP-YYMMDDSSSSS
const generateDispatchNumber = async (): Promise<string> => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const prefix = `DSP-${yy}${mm}${dd}`;
  const count = await prisma.stockDispatch.count({
    where: { dispatchNumber: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
};

// Generate request number
const generateRequestNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const count = await prisma.warehouseStockRequest.count({
    where: {
      requestNumber: {
        startsWith: `WSR-${year}`,
      },
    },
  });
  return `WSR-${year}-${String(count + 1).padStart(4, "0")}`;
};

// Generate invoice number - Format: INV-YYMMDDSSSSS (e.g., INV-2603170001)
const generateInvoiceNumber = async (): Promise<string> => {
  const now = new Date();
  const year = now.getFullYear();
  const yearShort = String(year).slice(-2); // 26 for 2026
  const month = String(now.getMonth() + 1).padStart(2, "0"); // 03 for March
  const day = String(now.getDate()).padStart(2, "0"); // 17 for 17th

  // Count invoices for this year (resets each year)
  const count = await prisma.stockRequestPayment.count({
    where: {
      invoiceNumber: {
        startsWith: `INV-${yearShort}`,
      },
    },
  });

  return `INV-${yearShort}${month}${day}${String(count + 1).padStart(4, "0")}`;
};

// Helper: Transfer requested stock to Vendor's product catalog
const transferStockToVendor = async (
  tx: Prisma.TransactionClient,
  request: { organizationId: string; requestNumber: string },
  items: {
    productId: string;
    approvedQuantity: number | null;
    quantity: number;
  }[],
) => {
  for (const item of items) {
    const quantity = item.approvedQuantity || item.quantity;
    if (quantity <= 0) continue;

    const sourceProduct = await tx.product.findUnique({
      where: { id: item.productId },
      include: { images: true },
    });

    if (!sourceProduct) continue;

    let targetProduct;
    if (sourceProduct.sku) {
      targetProduct = await tx.product.findFirst({
        where: {
          organizationId: request.organizationId,
          sku: sourceProduct.sku,
          deletedAt: null,
        },
      });
    }

    if (!targetProduct) {
      targetProduct = await tx.product.create({
        data: {
          organizationId: request.organizationId,
          masterProductId: sourceProduct.masterProductId,
          name: sourceProduct.name,
          description: sourceProduct.description,
          sku: sourceProduct.sku,
          barcode: sourceProduct.barcode,
          unit: sourceProduct.unit,
          price: sourceProduct.price,
          costPrice: sourceProduct.costPrice,
          businessCategoryId: sourceProduct.businessCategoryId,
          categoryId: sourceProduct.categoryId,
          isActive: true,
          stock: quantity,
          images: {
            create: sourceProduct.images.map((img) => ({ url: img.url })),
          },
        },
      });
    } else {
      targetProduct = await tx.product.update({
        where: { id: targetProduct.id },
        data: { stock: { increment: quantity } },
      });
    }

    await tx.inventoryLedger.create({
      data: {
        productId: targetProduct.id,
        change: quantity,
        reason: InventoryReason.TRANSFER_IN,
        note: `Бараа таталт батлагдсан (${request.requestNumber})`,
      },
    });
  }
};

// Get all stock requests (Admin sees all, Vendor sees their own)
router.get("/stock-requests", requireAuth, async (req, res) => {
  try {
    const { organizationId, status, warehouseId } = req.query;
    const actor = getActor(req);
    if (!actor) {
      return res.status(401).json({ message: "Нэвтрээгүй байна" });
    }
    const targetOrganizationId =
      typeof organizationId === "string" ? organizationId : undefined;

    const canManagePlatformStock =
      isFullAdmin(actor.role) ||
      hasPlatformPermission(actor.role, Permission.MANAGE_STOCK);

    if (!canManagePlatformStock) {
      if (!targetOrganizationId) {
        return res.status(400).json({ message: "organizationId шаардлагатай" });
      }
      const permissions = await assertOrgPermission(
        req,
        res,
        targetOrganizationId,
        Permission.VIEW_ORG_DASHBOARD,
      );
      if (!permissions) return;
    }

    const where: Prisma.WarehouseStockRequestWhereInput = {};

    if (targetOrganizationId) {
      where.organizationId = targetOrganizationId;
    }

    if (status) {
      where.status = status as StockRequestStatus;
    }

    if (warehouseId) {
      where.warehouseId = warehouseId as string;
    }

    const requests = await prisma.warehouseStockRequest.findMany({
      where,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
          },
        },
        requestedBy: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                fullName: true,
              },
            },
          },
        },
        reviewedBy: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                fullName: true,
              },
            },
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                images: {
                  take: 1,
                  select: { url: true },
                },
              },
            },
          },
        },
        payment: true,
        dispatch: true,
      },
      orderBy: {
        requestedAt: "desc",
      },
    });

    res.json(requests);
  } catch (error) {
    console.error("get stock requests error", error);
    res.status(500).json({
      message: "Хүсэлтүүдийг авахад алдаа гарлаа",
    });
  }
});

// Get single stock request
router.get("/stock-requests/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const request = await prisma.warehouseStockRequest.findUnique({
      where: { id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            phone: true,
            email: true,
            address: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            district: true,
            phone: true,
          },
        },
        requestedBy: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                fullName: true,
                phoneNumber: true,
              },
            },
          },
        },
        reviewedBy: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                fullName: true,
              },
            },
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                stock: true,
                images: {
                  take: 1,
                  select: { url: true },
                },
                category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        payment: true,
      },
    });

    if (!request) {
      return res.status(404).json({ message: "Хүсэлт олдсонгүй" });
    }

    res.json(request);
  } catch (error) {
    console.error("get stock request error", error);
    res.status(500).json({
      message: "Хүсэлтийг авахад алдаа гарлаа",
    });
  }
});

// Create stock request (Vendor creates)
router.post(
  "/stock-requests",
  requireAuth,
  requireOrgPermission({ from: "body" }, Permission.REQUEST_STOCK),
  async (req, res) => {
    try {
      const {
        organizationId,
        warehouseId,
        note,
        deliveryAddress,
        deliveryPhone,
        items, // Array of { productId, quantity, note? }
      } = req.body;

      if (!organizationId || !warehouseId || !items?.length) {
        return res.status(400).json({
          message: "organizationId, warehouseId, items шаардлагатай",
        });
      }

      const requestedById = getActor(req)?.userId;
      if (!requestedById) {
        return res.status(401).json({ message: "Нэвтрээгүй байна" });
      }
      const normalizedItems = items.map(
        (item: {
          productId?: unknown;
          quantity?: unknown;
          note?: unknown;
        }) => ({
          productId: typeof item.productId === "string" ? item.productId : "",
          quantity: Number(item.quantity),
          note: typeof item.note === "string" ? item.note.trim() : undefined,
        }),
      );
      if (
        normalizedItems.some(
          (item: { productId: string; quantity: number }) =>
            !item.productId ||
            !Number.isSafeInteger(item.quantity) ||
            item.quantity <= 0,
        )
      ) {
        return res.status(400).json({
          message: "Барааны код болон тоо хэмжээ буруу байна",
        });
      }
      if (
        new Set(
          normalizedItems.map((item: { productId: string }) => item.productId),
        ).size !== normalizedItems.length
      ) {
        return res
          .status(400)
          .json({ message: "Нэг бараа давхар орсон байна" });
      }

      // Verify warehouse is assigned to this organization
      const warehouseOrg = await prisma.warehouseOrganization.findUnique({
        where: {
          warehouseId_organizationId: {
            warehouseId,
            organizationId,
          },
        },
        select: {
          warehouse: { select: { type: true, isActive: true, deletedAt: true } },
        },
      });

      if (
        !warehouseOrg ||
        warehouseOrg.warehouse.type !== WarehouseType.CENTRAL ||
        !warehouseOrg.warehouse.isActive ||
        warehouseOrg.warehouse.deletedAt
      ) {
        return res.status(403).json({
          message: "Энэ төв агуулахаас бараа татах эрхгүй байна",
        });
      }

      const outstandingPayments =
        await getOutstandingStockPayments(organizationId);

      if (outstandingPayments.length > 0) {
        return res.status(409).json({
          code: "OUTSTANDING_STOCK_PAYMENT",
          message: "Өмнөх төлбөрөө төлсний дараа шинэ захиалга өгөх боломжтой",
          outstandingCount: outstandingPayments.length,
          totalOutstanding: outstandingPayments.reduce(
            (total, payment) => total + payment.outstandingAmount,
            0,
          ),
          payments: outstandingPayments.map(serializeOutstandingPayment),
        });
      }

      const requestNumber = await generateRequestNumber();
      const invoiceNumber = await generateInvoiceNumber();

      // Calculate total amount from items
      const productIds = normalizedItems.map(
        (item: { productId: string }) => item.productId,
      );
      const inventory = await prisma.warehouseInventory.findMany({
        where: { warehouseId, productId: { in: productIds } },
        select: {
          productId: true,
          quantity: true,
          product: { select: { price: true, name: true } },
        },
      });
      const inventoryMap = new Map(
        inventory.map((entry: (typeof inventory)[number]) => [
          entry.productId,
          entry,
        ]),
      );
      let totalAmount = 0;
      for (const item of normalizedItems) {
        const available = inventoryMap.get(item.productId);
        if (!available) {
          return res.status(400).json({
            message: "Сонгосон бараа энэ агуулахад байхгүй байна",
          });
        }
        if (available.quantity < item.quantity) {
          return res.status(400).json({
            message: `${available.product.name}-ийн үлдэгдэл хүрэлцэхгүй байна (${available.quantity} үлдсэн)`,
          });
        }
        totalAmount += Number(available.product.price) * item.quantity;
      }

      // Create stock request with payment record in transaction
      const request = await prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const stockRequest = await tx.warehouseStockRequest.create({
            data: {
              requestNumber,
              organizationId,
              warehouseId,
              requestedById,
              note: note || null,
              deliveryAddress: deliveryAddress || null,
              deliveryPhone: deliveryPhone || null,
              status: StockRequestStatus.PENDING,
              items: {
                create: normalizedItems.map(
                  (item: {
                    productId: string;
                    quantity: number;
                    note?: string;
                  }) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    note: item.note || null,
                  }),
                ),
              },
            },
          });

          // Create payment record (invoice)
          await tx.stockRequestPayment.create({
            data: {
              invoiceNumber,
              requestId: stockRequest.id,
              organizationId,
              totalAmount,
              paidAmount: 0,
              status: PaymentStatus.PENDING,
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days due
            },
          });

          // Return with includes
          return tx.warehouseStockRequest.findUnique({
            where: { id: stockRequest.id },
            include: {
              organization: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
              warehouse: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                },
              },
              items: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      sku: true,
                    },
                  },
                },
              },
              payment: true,
            },
          });
        },
      );

      res.status(201).json(request);
    } catch (error) {
      console.error("create stock request error", error);
      res.status(500).json({
        message: "Хүсэлт үүсгэхэд алдаа гарлаа",
      });
    }
  },
);

// Approve stock request (Admin)
router.patch("/stock-requests/:id/approve", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewedById, reviewNote, items } = req.body;

    const request = await prisma.warehouseStockRequest.findUnique({
      where: { id },
      include: { items: true, payment: true },
    });

    if (!request) {
      return res.status(404).json({ message: "Хүсэлт олдсонгүй" });
    }

    if (request.status !== StockRequestStatus.PENDING) {
      return res.status(400).json({
        message: "Зөвхөн хүлээгдэж буй хүсэлтийг зөвшөөрөх боломжтой",
      });
    }

    const unpaidPayments = await getOutstandingStockPayments(
      request.organizationId,
      request.payment?.id,
    );

    if (unpaidPayments.length > 0) {
      const unpaidInvoices = unpaidPayments
        .map((p: (typeof unpaidPayments)[number]) => p.invoiceNumber)
        .join(", ");
      return res.status(409).json({
        code: "OUTSTANDING_STOCK_PAYMENT",
        message: `Өмнөх төлбөр төлөгдөөгүй байна. Төлөгдөөгүй нэхэмжлэхүүд: ${unpaidInvoices}`,
        totalOutstanding: unpaidPayments.reduce(
          (total, payment) => total + payment.outstandingAmount,
          0,
        ),
        payments: unpaidPayments.map(serializeOutstandingPayment),
      });
    }

    // Update request and items with approved quantities
    const updated = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Update item approved quantities if provided
        if (items && items.length > 0) {
          for (const item of items) {
            await tx.warehouseStockRequestItem.update({
              where: {
                requestId_productId: {
                  requestId: id,
                  productId: item.productId,
                },
              },
              data: {
                approvedQuantity: item.approvedQuantity,
              },
            });
          }
        } else {
          // Approve all with requested quantities
          await tx.warehouseStockRequestItem.updateMany({
            where: { requestId: id },
            data: {
              approvedQuantity: undefined, // Will be set individually
            },
          });

          // Set approved = requested for each item
          for (const item of request.items) {
            await tx.warehouseStockRequestItem.update({
              where: { id: item.id },
              data: { approvedQuantity: item.quantity },
            });
          }
        }

        // Update request status
        const updatedRequest = await tx.warehouseStockRequest.update({
          where: { id },
          data: {
            status: StockRequestStatus.APPROVED,
            reviewedById: reviewedById || null,
            reviewNote: reviewNote || null,
            reviewedAt: new Date(),
            approvedAt: new Date(),
          },
          include: {
            organization: {
              select: { id: true, name: true },
            },
            warehouse: {
              select: { id: true, name: true },
            },
            items: {
              include: {
                product: {
                  select: { id: true, name: true, sku: true },
                },
              },
            },
          },
        });

        // Auto-create dispatch order for warehouse
        const dispatchNumber = await generateDispatchNumber();
        await tx.stockDispatch.create({
          data: {
            dispatchNumber,
            requestId: id,
            warehouseId: request.warehouseId,
            organizationId: request.organizationId,
            status: "PENDING",
          },
        });

        return updatedRequest;
      },
    );

    res.json(updated);
  } catch (error) {
    console.error("approve stock request error", error);
    res.status(500).json({
      message: "Хүсэлт зөвшөөрөхөд алдаа гарлаа",
    });
  }
});

// Reject stock request (Admin)
router.patch("/stock-requests/:id/reject", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewedById, reviewNote } = req.body;

    const request = await prisma.warehouseStockRequest.findUnique({
      where: { id },
      include: { payment: true },
    });

    if (!request) {
      return res.status(404).json({ message: "Хүсэлт олдсонгүй" });
    }

    if (request.status !== StockRequestStatus.PENDING) {
      return res.status(400).json({
        message: "Зөвхөн хүлээгдэж буй хүсэлтийг татгалзах боломжтой",
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const rejectedRequest = await tx.warehouseStockRequest.update({
        where: { id },
        data: {
          status: StockRequestStatus.REJECTED,
          reviewedById: reviewedById || null,
          reviewNote: reviewNote || null,
          reviewedAt: new Date(),
          rejectedAt: new Date(),
        },
        include: {
          organization: { select: { id: true, name: true } },
          warehouse: { select: { id: true, name: true } },
        },
      });

      if (request.payment && request.payment.status !== PaymentStatus.PAID) {
        await tx.stockRequestPayment.update({
          where: { id: request.payment.id },
          data: { status: PaymentStatus.CANCELLED },
        });
      }

      return rejectedRequest;
    });

    res.json(updated);
  } catch (error) {
    console.error("reject stock request error", error);
    res.status(500).json({
      message: "Хүсэлт татгалзахад алдаа гарлаа",
    });
  }
});

// Mark as processing (Admin - after approval, when starting to prepare)
router.patch("/stock-requests/:id/process", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const request = await prisma.warehouseStockRequest.findUnique({
      where: { id },
    });

    if (!request) {
      return res.status(404).json({ message: "Хүсэлт олдсонгүй" });
    }

    if (request.status !== StockRequestStatus.APPROVED) {
      return res.status(400).json({
        message: "Зөвхөн зөвшөөрөгдсөн хүсэлтийг боловсруулж эхлэх боломжтой",
      });
    }

    const updated = await prisma.warehouseStockRequest.update({
      where: { id },
      data: {
        status: StockRequestStatus.PROCESSING,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error("process stock request error", error);
    res.status(500).json({
      message: "Хүсэлт боловсруулахад алдаа гарлаа",
    });
  }
});

// Complete stock request (Admin - when delivered)
router.patch("/stock-requests/:id/complete", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const request = await prisma.warehouseStockRequest.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!request) {
      return res.status(404).json({ message: "Хүсэлт олдсонгүй" });
    }

    if (
      request.status !== StockRequestStatus.PROCESSING &&
      request.status !== StockRequestStatus.APPROVED
    ) {
      return res.status(400).json({
        message: "Зөвхөн боловсруулж буй хүсэлтийг дуусгах боломжтой",
      });
    }

    // Update warehouse inventory (reduce stock) and sync Product.stock
    const updated = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Reduce inventory for each item via inventory service
        for (const item of request.items) {
          const quantity = item.approvedQuantity || item.quantity;

          await adjustStock(tx, {
            productId: item.productId,
            warehouseId: request.warehouseId,
            change: -quantity,
            reason: InventoryReason.TRANSFER_OUT,
            note: `Stock request ${request.requestNumber} completed`,
            referenceId: request.id,
            referenceType: "STOCK_REQUEST",
          });
        }

        // Transfer stock to Vendor
        await transferStockToVendor(
          tx,
          {
            organizationId: request.organizationId,
            requestNumber: request.requestNumber,
          },
          request.items,
        );

        // Update request status
        return tx.warehouseStockRequest.update({
          where: { id },
          data: {
            status: StockRequestStatus.COMPLETED,
            completedAt: new Date(),
          },
          include: {
            organization: {
              select: { id: true, name: true },
            },
            warehouse: {
              select: { id: true, name: true },
            },
            items: {
              include: {
                product: {
                  select: { id: true, name: true, sku: true },
                },
              },
            },
          },
        });
      },
    );

    res.json(updated);
  } catch (error) {
    console.error("complete stock request error", error);
    res.status(500).json({
      message: "Хүсэлт дуусгахад алдаа гарлаа",
    });
  }
});

// Cancel stock request (Vendor - only if pending)
router.patch("/stock-requests/:id/cancel", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const request = await prisma.warehouseStockRequest.findUnique({
      where: { id },
      include: { payment: true },
    });

    if (!request) {
      return res.status(404).json({ message: "Хүсэлт олдсонгүй" });
    }

    if (request.status !== StockRequestStatus.PENDING) {
      return res.status(400).json({
        message: "Зөвхөн хүлээгдэж буй хүсэлтийг цуцлах боломжтой",
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const cancelledRequest = await tx.warehouseStockRequest.update({
        where: { id },
        data: { status: StockRequestStatus.CANCELLED },
      });

      if (request.payment && request.payment.status !== PaymentStatus.PAID) {
        await tx.stockRequestPayment.update({
          where: { id: request.payment.id },
          data: { status: PaymentStatus.CANCELLED },
        });
      }

      return cancelledRequest;
    });

    res.json(updated);
  } catch (error) {
    console.error("cancel stock request error", error);
    res.status(500).json({
      message: "Хүсэлт цуцлахад алдаа гарлаа",
    });
  }
});

// Get available products from warehouse for stock request
router.get(
  "/stock-requests/warehouse/:warehouseId/products",
  requireAuth,
  async (req, res) => {
    try {
      const { warehouseId } = req.params;
      const organizationId =
        (req.query.organizationId as string | undefined) ||
        getActor(req)?.organizationId;
      if (!organizationId) {
        return res.status(400).json({ message: "organizationId шаардлагатай" });
      }
      const permissions = await assertOrgPermission(
        req,
        res,
        organizationId,
        Permission.REQUEST_STOCK,
      );
      if (!permissions) return;
      const assignment = await prisma.warehouseOrganization.findUnique({
        where: {
          warehouseId_organizationId: { warehouseId, organizationId },
        },
        select: {
          warehouseId: true,
          warehouse: { select: { type: true, isActive: true, deletedAt: true } },
        },
      });
      if (
        !assignment ||
        assignment.warehouse.type !== WarehouseType.CENTRAL ||
        !assignment.warehouse.isActive ||
        assignment.warehouse.deletedAt
      ) {
        return res.status(403).json({
          message: "Энэ төв агуулахаас бараа татах эрхгүй байна",
        });
      }

      const search = (req.query.search as string | undefined)?.trim();
      const category = (req.query.category as string | undefined)?.trim();
      const sort = (req.query.sort as string | undefined) || "name";
      const lowStockOnly = req.query.lowStock === "true";
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 40));

      const inventory = await prisma.warehouseInventory.findMany({
        where: {
          warehouseId,
          quantity: { gt: 0 },
          product: {
            deletedAt: null,
            isActive: true,
            ...(search
              ? {
                  OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { sku: { contains: search, mode: "insensitive" } },
                    { barcode: { contains: search, mode: "insensitive" } },
                  ],
                }
              : {}),
            ...(category
              ? {
                  OR: [
                    { category: { name: category } },
                    { businessCategory: { name: category } },
                  ],
                }
              : {}),
          },
        },
        include: {
          product: {
            select: {
              id: true,
              masterProductId: true,
              name: true,
              sku: true,
              barcode: true,
              price: true,
              images: {
                take: 1,
                select: { url: true },
              },
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
              businessCategory: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      const productIds = inventory.map((item) => item.productId);
      if (productIds.length === 0) {
        return res.json({ items: [], total: 0, hasMore: false });
      }

      const since = new Date();
      since.setDate(since.getDate() - 90);
      const masterProductIds = [
        ...new Set(
          inventory
            .map((item) => item.product.masterProductId)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      const barcodes = [
        ...new Set(
          inventory
            .map((item) => item.product.barcode?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      ];
      const skus = [
        ...new Set(
          inventory
            .map((item) => item.product.sku?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      ];
      const names = [
        ...new Set(
          inventory.map((item) => item.product.name.trim()).filter(Boolean),
        ),
      ];
      const systemProducts = await prisma.product.findMany({
        where: {
          deletedAt: null,
          OR: [
            ...(masterProductIds.length
              ? [{ masterProductId: { in: masterProductIds } }]
              : []),
            ...(barcodes.length
              ? [{ barcode: { in: barcodes, mode: "insensitive" as const } }]
              : []),
            ...(skus.length
              ? [{ sku: { in: skus, mode: "insensitive" as const } }]
              : []),
            ...(names.length
              ? [{ name: { in: names, mode: "insensitive" as const } }]
              : []),
          ],
        },
        select: {
          id: true,
          masterProductId: true,
          barcode: true,
          sku: true,
          name: true,
        },
      });
      const systemProductIds = systemProducts.map((product) => product.id);

      const [
        onlineSales,
        posSales,
        systemOnlineSales,
        systemPosSales,
        systemStockRequests,
        requestHistory,
        organizationInventory,
      ] = await Promise.all([
        prisma.orderItem.groupBy({
          by: ["productSku", "productName"],
          where: {
            order: {
              organizationId,
              status: { not: "CANCELLED" },
              deletedAt: null,
              createdAt: { gte: since },
            },
          },
          _sum: { quantity: true },
        }),
        prisma.posSaleLine.groupBy({
          by: ["productSku", "productName"],
          where: {
            sale: {
              organizationId,
              status: "COMPLETED",
              createdAt: { gte: since },
            },
          },
          _sum: { qty: true },
        }),
        systemProductIds.length
          ? prisma.orderItem.groupBy({
              by: ["productId"],
              where: {
                productId: { in: systemProductIds },
                order: {
                  status: { not: "CANCELLED" },
                  deletedAt: null,
                  createdAt: { gte: since },
                },
              },
              _sum: { quantity: true },
            })
          : Promise.resolve([]),
        systemProductIds.length
          ? prisma.posSaleLine.groupBy({
              by: ["productId"],
              where: {
                productId: { in: systemProductIds },
                sale: {
                  status: "COMPLETED",
                  createdAt: { gte: since },
                },
              },
              _sum: { qty: true },
            })
          : Promise.resolve([]),
        systemProductIds.length
          ? prisma.warehouseStockRequestItem.groupBy({
              by: ["productId"],
              where: {
                productId: { in: systemProductIds },
                request: {
                  status: { notIn: ["CANCELLED", "REJECTED"] },
                  createdAt: { gte: since },
                },
              },
              _sum: { quantity: true },
            })
          : Promise.resolve([]),
        prisma.warehouseStockRequestItem.groupBy({
          by: ["productId"],
          where: {
            productId: { in: productIds },
            request: {
              organizationId,
              status: { notIn: ["CANCELLED", "REJECTED"] },
              createdAt: { gte: since },
            },
          },
          _sum: { quantity: true },
        }),
        prisma.warehouseInventory.groupBy({
          by: ["productId"],
          where: {
            productId: { in: productIds },
            warehouse: {
              type: WarehouseType.VENDOR_INTERNAL,
              organizations: { some: { organizationId } },
            },
          },
          _sum: { quantity: true },
        }),
      ]);

      const salesByKey = new Map<string, number>();
      const addSales = (sku: string | null, name: string, quantity: number) => {
        const key = sku?.trim()
          ? `sku:${sku.trim().toUpperCase()}`
          : `name:${name.trim().toLowerCase()}`;
        salesByKey.set(key, (salesByKey.get(key) || 0) + quantity);
      };
      onlineSales.forEach((row) =>
        addSales(row.productSku, row.productName, row._sum.quantity || 0),
      );
      posSales.forEach((row) =>
        addSales(row.productSku, row.productName, row._sum.qty || 0),
      );

      const normalizeIdentity = (value: string) =>
        value.trim().toLocaleLowerCase("mn-MN");
      const productIdentity = (product: {
        masterProductId: string | null;
        barcode: string | null;
        sku: string | null;
        name: string;
      }) =>
        product.masterProductId
          ? `master:${product.masterProductId}`
          : product.barcode?.trim()
            ? `barcode:${normalizeIdentity(product.barcode)}`
            : product.sku?.trim()
              ? `sku:${normalizeIdentity(product.sku)}`
              : `name:${normalizeIdentity(product.name)}`;
      const inventoryIdentitySet = new Set(
        inventory.map((item) => productIdentity(item.product)),
      );
      const inventoryIdentityByBarcode = new Map(
        inventory
          .filter((item) => item.product.barcode?.trim())
          .map((item) => [
            normalizeIdentity(item.product.barcode!),
            productIdentity(item.product),
          ]),
      );
      const inventoryIdentityBySku = new Map(
        inventory
          .filter((item) => item.product.sku?.trim())
          .map((item) => [
            normalizeIdentity(item.product.sku!),
            productIdentity(item.product),
          ]),
      );
      const inventoryIdentityByName = new Map(
        inventory.map((item) => [
          normalizeIdentity(item.product.name),
          productIdentity(item.product),
        ]),
      );
      const identityByProductId = new Map<string, string>();
      systemProducts.forEach((product) => {
        const canonicalIdentity = productIdentity(product);
        const targetIdentity = inventoryIdentitySet.has(canonicalIdentity)
          ? canonicalIdentity
          : product.barcode?.trim()
            ? inventoryIdentityByBarcode.get(normalizeIdentity(product.barcode))
            : product.sku?.trim()
              ? inventoryIdentityBySku.get(normalizeIdentity(product.sku))
              : inventoryIdentityByName.get(normalizeIdentity(product.name));
        if (targetIdentity) identityByProductId.set(product.id, targetIdentity);
      });

      const systemSalesByIdentity = new Map<string, number>();
      const addSystemSales = (productId: string, quantity: number) => {
        const identity = identityByProductId.get(productId);
        if (!identity) return;
        systemSalesByIdentity.set(
          identity,
          (systemSalesByIdentity.get(identity) || 0) + quantity,
        );
      };
      systemOnlineSales.forEach((row) =>
        addSystemSales(row.productId, row._sum.quantity || 0),
      );
      systemPosSales.forEach((row) =>
        addSystemSales(row.productId, row._sum.qty || 0),
      );
      const systemRequestsByIdentity = new Map<string, number>();
      systemStockRequests.forEach((row) => {
        const identity = identityByProductId.get(row.productId);
        if (!identity) return;
        systemRequestsByIdentity.set(
          identity,
          (systemRequestsByIdentity.get(identity) || 0) +
            (row._sum.quantity || 0),
        );
      });

      const requestedByProduct = new Map(
        requestHistory.map((row) => [row.productId, row._sum.quantity || 0]),
      );
      const stockByProduct = new Map(
        organizationInventory.map((row) => [
          row.productId,
          row._sum.quantity || 0,
        ]),
      );

      const enriched = inventory.map((item) => {
        const identity = productIdentity(item.product);
        const salesKey = item.product.sku?.trim()
          ? `sku:${item.product.sku.trim().toUpperCase()}`
          : `name:${item.product.name.trim().toLowerCase()}`;
        const soldQuantity90d = salesByKey.get(salesKey) || 0;
        const systemSoldQuantity90d =
          systemSalesByIdentity.get(identity) || soldQuantity90d;
        const systemRequestedQuantity90d =
          systemRequestsByIdentity.get(identity) ||
          requestedByProduct.get(item.productId) ||
          0;
        const previouslyRequestedQuantity =
          requestedByProduct.get(item.productId) || 0;
        const organizationStock = stockByProduct.get(item.productId) || 0;
        const reorderPoint = Math.ceil(soldQuantity90d / 3);
        const stockShortfall = Math.max(0, reorderPoint - organizationStock);
        const recommendationScore =
          soldQuantity90d * 10 +
          previouslyRequestedQuantity * 2 +
          stockShortfall * 5;
        const recommendationReason =
          stockShortfall > 0 && soldQuantity90d > 0
            ? "SALES_REPLENISHMENT"
            : soldQuantity90d > 0
              ? "TOP_SELLING"
              : previouslyRequestedQuantity > 0
                ? "PREVIOUSLY_ORDERED"
                : null;

        return {
          ...item,
          organizationStock,
          reorderPoint,
          soldQuantity90d,
          systemSoldQuantity90d,
          systemRequestedQuantity90d,
          previouslyRequestedQuantity,
          recommendationScore,
          recommendationReason,
        };
      });

      let filtered = lowStockOnly
        ? enriched.filter(
            (item) =>
              item.reorderPoint > 0 &&
              item.organizationStock < item.reorderPoint,
          )
        : enriched;

      // These options are user-facing filters, not only sort modes.
      // `name` is the explicit "all products" option.
      if (sort === "recommended") {
        filtered = filtered.filter(
          (item) => item.recommendationReason !== null,
        );
      } else if (sort === "topSelling") {
        filtered = filtered.filter((item) => item.systemSoldQuantity90d > 0);
      } else if (sort === "mostRequested") {
        filtered = filtered.filter(
          (item) => item.systemRequestedQuantity90d > 0,
        );
      } else if (sort === "previouslyOrdered") {
        filtered = filtered.filter(
          (item) => item.previouslyRequestedQuantity > 0,
        );
      }

      filtered.sort((a, b) => {
        if (sort === "topSelling") {
          return b.systemSoldQuantity90d - a.systemSoldQuantity90d;
        }
        if (sort === "mostRequested") {
          return b.systemRequestedQuantity90d - a.systemRequestedQuantity90d;
        }
        if (sort === "previouslyOrdered") {
          return b.previouslyRequestedQuantity - a.previouslyRequestedQuantity;
        }
        if (sort === "name") {
          return a.product.name.localeCompare(b.product.name, "mn");
        }
        return (
          b.recommendationScore - a.recommendationScore ||
          a.product.name.localeCompare(b.product.name, "mn")
        );
      });

      const offset = (page - 1) * limit;
      const items = filtered.slice(offset, offset + limit);
      return res.json({
        items,
        total: filtered.length,
        hasMore: offset + items.length < filtered.length,
      });
    } catch (error) {
      console.error("get warehouse products error", error);
      res.status(500).json({
        message: "Агуулахын бараануудыг авахад алдаа гарлаа",
      });
    }
  },
);

// Get centralized warehouse products available to an organization
router.get(
  "/stock-requests/catalog/organization/:organizationId",
  requireAuth,
  requireOrgPermission({ from: "params" }, Permission.VIEW_ORG_DASHBOARD),
  async (req, res) => {
    try {
      const organizationId = req.params.organizationId as string;

      const completedRequests = await prisma.warehouseStockRequest.findMany({
        where: {
          organizationId,
          status: StockRequestStatus.COMPLETED,
        },
        include: {
          warehouse: {
            select: {
              id: true,
              name: true,
              city: true,
              district: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  price: true,
                  stock: true,
                  images: {
                    take: 1,
                    select: { url: true },
                  },
                  category: {
                    select: { id: true, name: true, slug: true },
                  },
                  businessCategory: {
                    select: { id: true, name: true, slug: true },
                  },
                  organization: {
                    select: { id: true, name: true, slug: true },
                  },
                },
              },
            },
          },
        },
        orderBy: [{ completedAt: "desc" }, { warehouse: { name: "asc" } }],
      });

      const catalogItems = completedRequests.flatMap(
        (request: (typeof completedRequests)[number]) =>
          request.items.map((item: (typeof request.items)[number]) => {
            const quantity = item.approvedQuantity ?? item.quantity;
            const alertThreshold = 5;

            return {
              id: item.id,
              quantity,
              minQuantity: 0,
              maxQuantity: null,
              alertThreshold,
              isLowStock: quantity <= alertThreshold,
              location: null,
              source: "warehouse" as const,
              warehouse: request.warehouse,
              product: {
                ...item.product,
                categoryName:
                  item.product.businessCategory?.name ||
                  item.product.category?.name ||
                  "Ангилагдаагүй",
              },
            };
          }),
      );

      const categoriesMap = new Map<
        string,
        { name: string; itemCount: number; totalQuantity: number }
      >();
      const warehousesMap = new Map<
        string,
        { id: string; name: string; city: string; district: string }
      >();
      const lowStockCount = catalogItems.filter(
        (item: (typeof catalogItems)[number]) => item.isLowStock,
      ).length;

      for (const item of catalogItems) {
        const categoryName = item.product.categoryName;

        const current = categoriesMap.get(categoryName) || {
          name: categoryName,
          itemCount: 0,
          totalQuantity: 0,
        };

        current.itemCount += 1;
        current.totalQuantity += Number(item.quantity || 0);
        categoriesMap.set(categoryName, current);

        warehousesMap.set(item.warehouse.id, item.warehouse);
      }

      res.json({
        organizationId,
        summary: {
          totalItems: catalogItems.length,
          totalQuantity: catalogItems.reduce(
            (sum: number, item: (typeof catalogItems)[number]) =>
              sum + Number(item.quantity || 0),
            0,
          ),
          totalCategories: categoriesMap.size,
          totalWarehouses: warehousesMap.size,
          lowStockItems: lowStockCount,
        },
        categories: Array.from(categoriesMap.values()).sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
        warehouses: Array.from(warehousesMap.values()).sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
        items: catalogItems,
      });
    } catch (error) {
      console.error("get organization catalog error", error);
      res.status(500).json({
        message: "Нэгдсэн барааны жагсаалт авахад алдаа гарлаа",
      });
    }
  },
);

// ========== PAYMENT ENDPOINTS ==========

// Get payment history for an organization
router.get(
  "/stock-requests/payments/organization/:organizationId",
  requireAuth,
  requireOrgPermission({ from: "params" }, Permission.VIEW_ORG_DASHBOARD),
  async (req, res) => {
    try {
      const organizationId = req.params.organizationId as string;

      const payments = await prisma.stockRequestPayment.findMany({
        where: { organizationId },
        include: {
          request: {
            select: {
              id: true,
              requestNumber: true,
              status: true,
              requestedAt: true,
              warehouse: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          confirmedBy: {
            select: {
              id: true,
              email: true,
              profile: {
                select: { fullName: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json(payments);
    } catch (error) {
      console.error("get payment history error", error);
      res.status(500).json({
        message: "Төлбөрийн түүх авахад алдаа гарлаа",
      });
    }
  },
);

// Get all payments (Admin)
router.get(
  "/stock-requests/payments",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_STOCK),
  async (req, res) => {
    try {
      const { status, organizationId } = req.query;

      const where: Prisma.StockRequestPaymentWhereInput = {};
      if (status) {
        where.status = status as PaymentStatus;
      }
      if (organizationId) {
        where.organizationId = organizationId as string;
      }

      const payments = await prisma.stockRequestPayment.findMany({
        where,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
            },
          },
          request: {
            select: {
              id: true,
              requestNumber: true,
              status: true,
              requestedAt: true,
              warehouse: {
                select: {
                  id: true,
                  name: true,
                },
              },
              items: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      sku: true,
                      price: true,
                    },
                  },
                },
              },
            },
          },
          confirmedBy: {
            select: {
              id: true,
              email: true,
              profile: {
                select: { fullName: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json(payments);
    } catch (error) {
      console.error("get all payments error", error);
      res.status(500).json({
        message: "Төлбөрүүд авахад алдаа гарлаа",
      });
    }
  },
);

// Get single payment
router.get("/stock-requests/payments/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await prisma.stockRequestPayment.findUnique({
      where: { id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            phone: true,
            email: true,
          },
        },
        request: {
          select: {
            id: true,
            requestNumber: true,
            status: true,
            requestedAt: true,
            warehouse: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                    price: true,
                    images: {
                      take: 1,
                      select: { url: true },
                    },
                  },
                },
              },
            },
          },
        },
        confirmedBy: {
          select: {
            id: true,
            email: true,
            profile: {
              select: { fullName: true },
            },
          },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({ message: "Төлбөр олдсонгүй" });
    }

    const permissions = await assertOrgPermission(
      req,
      res,
      payment.organizationId,
      Permission.VIEW_ORG_DASHBOARD,
    );
    if (!permissions) return;

    res.json(payment);
  } catch (error) {
    console.error("get payment error", error);
    res.status(500).json({
      message: "Төлбөр авахад алдаа гарлаа",
    });
  }
});

// Confirm payment (Admin marks as paid)
router.patch(
  "/stock-requests/payments/:id/confirm",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_STOCK),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { transactionId, paymentMethod, paidAmount, note } = req.body;
      const actor = (req as typeof req & { user?: { userId?: string } }).user;

      const payment = await prisma.stockRequestPayment.findUnique({
        where: { id },
      });

      if (!payment) {
        return res.status(404).json({ message: "Төлбөр олдсонгүй" });
      }

      if (payment.status === PaymentStatus.PAID) {
        return res.status(400).json({
          message: "Энэ төлбөр аль хэдийн төлөгдсөн байна",
        });
      }

      if (paymentMethod && !isPaymentMethod(paymentMethod)) {
        return res
          .status(400)
          .json({ message: "Төлбөрийн хэлбэр буруу байна" });
      }
      const confirmation = validatePaymentConfirmation({
        paidAmount,
        currentPaidAmount: payment.paidAmount,
        totalAmount: payment.totalAmount,
      });
      if (!confirmation.ok) {
        return res.status(400).json({ message: confirmation.message });
      }

      const updated = await prisma.stockRequestPayment.update({
        where: { id },
        data: {
          status: confirmation.fullyPaid
            ? PaymentStatus.PAID
            : PaymentStatus.PENDING,
          paidAmount: confirmation.paidAmount,
          paidAt: confirmation.fullyPaid ? new Date() : null,
          paidBy: note || null,
          transactionId: transactionId || null,
          paymentMethod: paymentMethod || null,
          confirmedById: actor?.userId || null,
        },
        include: {
          organization: {
            select: { id: true, name: true },
          },
          request: {
            select: { id: true, requestNumber: true },
          },
        },
      });

      res.json(updated);
    } catch (error) {
      console.error("confirm payment error", error);
      res.status(500).json({
        message: "Төлбөр баталгаажуулахад алдаа гарлаа",
      });
    }
  },
);

// Vendor submits payment (self-service — records method & marks as submitted)
router.patch(
  "/stock-requests/payments/:id/pay",
  requireAuth,
  async (req, res) => {
    try {
      const id = req.params.id as string;
      const { paymentMethod, transactionId, note } = req.body;

      const payment = await prisma.stockRequestPayment.findUnique({
        where: { id },
        include: {
          organization: { select: { id: true } },
          request: { select: { status: true } },
        },
      });

      if (!payment) {
        return res.status(404).json({ message: "Төлбөр олдсонгүй" });
      }

      const permissions = await assertOrgPermission(
        req,
        res,
        payment.organizationId,
        Permission.REQUEST_STOCK,
      );
      if (!permissions) return;

      if (!canPayApprovedStockRequest(payment.request.status)) {
        return res.status(409).json({
          code: "STOCK_REQUEST_NOT_APPROVED",
          message: "Админ зөвшөөрсний дараа төлбөр төлөх боломжтой",
        });
      }

      if (payment.status === PaymentStatus.PAID) {
        return res
          .status(400)
          .json({ message: "Энэ төлбөр аль хэдийн төлөгдсөн байна" });
      }

      if (payment.status === PaymentStatus.CANCELLED) {
        return res
          .status(400)
          .json({ message: "Цуцлагдсан төлбөр төлөх боломжгүй" });
      }

      if (!paymentMethod) {
        return res.status(400).json({ message: "Төлбөрийн хэлбэр сонгоно уу" });
      }
      if (!isPaymentMethod(paymentMethod)) {
        return res
          .status(400)
          .json({ message: "Төлбөрийн хэлбэр буруу байна" });
      }

      const updated = await prisma.stockRequestPayment.update({
        where: { id },
        data: {
          status: PaymentStatus.PENDING,
          paymentMethod,
          transactionId: (transactionId as string) || null,
          paidBy: (note as string) || null,
        },
        include: {
          organization: { select: { id: true, name: true } },
          request: { select: { id: true, requestNumber: true } },
        },
      });

      res.json(updated);
    } catch (error) {
      console.error("vendor pay error", error);
      res.status(500).json({ message: "Төлбөр хийхэд алдаа гарлаа" });
    }
  },
);

// Cancel payment (Admin)
router.patch(
  "/stock-requests/payments/:id/cancel",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_STOCK),
  async (req, res) => {
    try {
      const id = req.params.id as string;

      const payment = await prisma.stockRequestPayment.findUnique({
        where: { id },
      });

      if (!payment) {
        return res.status(404).json({ message: "Төлбөр олдсонгүй" });
      }

      if (payment.status === PaymentStatus.PAID) {
        return res.status(400).json({
          message: "Төлөгдсөн төлбөрийг цуцлах боломжгүй",
        });
      }

      const updated = await prisma.stockRequestPayment.update({
        where: { id },
        data: {
          status: PaymentStatus.CANCELLED,
        },
      });

      res.json(updated);
    } catch (error) {
      console.error("cancel payment error", error);
      res.status(500).json({
        message: "Төлбөр цуцлахад алдаа гарлаа",
      });
    }
  },
);

// Get unpaid payments count for organization (for UI indicators)
router.get(
  "/stock-requests/payments/unpaid/:organizationId",
  requireAuth,
  requireOrgPermission({ from: "params" }, Permission.VIEW_ORG_DASHBOARD),
  async (req, res) => {
    try {
      const organizationId = req.params.organizationId as string;

      const unpaidPayments = await getOutstandingStockPayments(organizationId);

      const totalUnpaid = unpaidPayments.reduce(
        (sum, payment) => sum + payment.outstandingAmount,
        0,
      );

      res.json({
        count: unpaidPayments.length,
        totalUnpaid,
        payments: unpaidPayments.map(serializeOutstandingPayment),
      });
    } catch (error) {
      console.error("get unpaid payments error", error);
      res.status(500).json({
        message: "Төлөгдөөгүй төлбөрүүд авахад алдаа гарлаа",
      });
    }
  },
);

// ==========================================
// DISPATCH ENDPOINTS (Warehouse)
// ==========================================

// Get dispatches for a warehouse
router.get(
  "/stock-requests/warehouse/:warehouseId/dispatches",
  requireAuth,
  async (req, res) => {
    try {
      const { warehouseId } = req.params;
      const { status } = req.query;
      if (!(await assertWarehouseAccess(req, res, warehouseId))) return;

      const where: Prisma.StockDispatchWhereInput = { warehouseId };
      if (
        typeof status === "string" &&
        DISPATCH_STATUSES.includes(status as (typeof DISPATCH_STATUSES)[number])
      ) {
        where.status = status as (typeof DISPATCH_STATUSES)[number];
      }

      const dispatches = await prisma.stockDispatch.findMany({
        where,
        include: {
          request: {
            include: {
              items: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      sku: true,
                      price: true,
                      images: { take: 1, select: { url: true } },
                    },
                  },
                },
              },
              organization: {
                select: { id: true, name: true, slug: true },
              },
              requestedBy: {
                select: {
                  id: true,
                  email: true,
                  profile: { select: { fullName: true, phoneNumber: true } },
                },
              },
            },
          },
          warehouse: {
            select: { id: true, name: true, address: true },
          },
          organization: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json(dispatches);
    } catch (error) {
      console.error("get warehouse dispatches error", error);
      res.status(500).json({
        message: "Агуулахын илгээмжүүдийг авахад алдаа гарлаа",
      });
    }
  },
);

// Get single dispatch detail
router.get("/stock-requests/dispatches/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const dispatch = await prisma.stockDispatch.findUnique({
      where: { id },
      include: {
        request: {
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                    price: true,
                    images: { take: 1, select: { url: true } },
                  },
                },
              },
            },
            organization: {
              select: { id: true, name: true, slug: true, phone: true },
            },
            requestedBy: {
              select: {
                id: true,
                email: true,
                profile: { select: { fullName: true, phoneNumber: true } },
              },
            },
            payment: true,
          },
        },
        warehouse: {
          select: { id: true, name: true, address: true, phone: true },
        },
        organization: {
          select: { id: true, name: true, phone: true },
        },
        driver: {
          select: {
            id: true,
            email: true,
            profile: { select: { fullName: true, phoneNumber: true } },
          },
        },
      },
    });

    if (!dispatch) {
      return res.status(404).json({ message: "Илгээмж олдсонгүй" });
    }
    if (!(await assertWarehouseAccess(req, res, dispatch.warehouseId))) return;

    res.json(dispatch);
  } catch (error) {
    console.error("get dispatch detail error", error);
    res.status(500).json({
      message: "Илгээмжийн мэдээлэл авахад алдаа гарлаа",
    });
  }
});

// Confirm dispatch (Warehouse confirms → deducts inventory → CONFIRMED)
router.patch(
  "/stock-requests/dispatches/:id/confirm",
  requireAuth,
  async (req, res) => {
    try {
      const { id } = req.params;

      const dispatch = await prisma.stockDispatch.findUnique({
        where: { id },
        include: {
          request: {
            include: { items: true },
          },
        },
      });

      if (!dispatch) {
        return res.status(404).json({ message: "Илгээмж олдсонгүй" });
      }
      if (!(await assertWarehouseAccess(req, res, dispatch.warehouseId)))
        return;

      if (dispatch.status !== "PENDING") {
        return res.status(400).json({
          message: "Зөвхөн хүлээгдэж буй илгээмжийг баталгаажуулах боломжтой",
        });
      }

      const updated = await prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          // Deduct inventory for each item
          for (const item of dispatch.request.items) {
            const quantity = item.approvedQuantity || item.quantity;

            await adjustStock(tx, {
              productId: item.productId,
              warehouseId: dispatch.warehouseId,
              change: -quantity,
              reason: InventoryReason.TRANSFER_OUT,
              note: `Dispatch ${dispatch.dispatchNumber} confirmed`,
              referenceId: dispatch.requestId,
              referenceType: "STOCK_DISPATCH",
            });
          }

          // Update stock request status → PROCESSING
          await tx.warehouseStockRequest.update({
            where: { id: dispatch.requestId },
            data: { status: StockRequestStatus.PROCESSING },
          });

          // Update dispatch status → CONFIRMED
          return tx.stockDispatch.update({
            where: { id },
            data: { status: "CONFIRMED" },
            include: {
              request: {
                include: {
                  items: {
                    include: {
                      product: {
                        select: { id: true, name: true, sku: true },
                      },
                    },
                  },
                  organization: { select: { id: true, name: true } },
                },
              },
              warehouse: { select: { id: true, name: true } },
            },
          });
        },
      );

      res.json(updated);
    } catch (error) {
      console.error("confirm dispatch error", error);
      res.status(500).json({
        message: "Илгээмж баталгаажуулахад алдаа гарлаа",
      });
    }
  },
);

// Assign driver & dispatch (CONFIRMED → DISPATCHED)
router.patch(
  "/stock-requests/dispatches/:id/dispatch",
  requireAuth,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { driverId, driverName, driverPhone, vehicleNumber, note } =
        req.body;

      if (!driverName || !driverPhone) {
        return res.status(400).json({
          message: "Жолоочийн нэр, утасны дугаар шаардлагатай",
        });
      }

      const dispatch = await prisma.stockDispatch.findUnique({
        where: { id },
      });

      if (!dispatch) {
        return res.status(404).json({ message: "Илгээмж олдсонгүй" });
      }
      if (!(await assertWarehouseAccess(req, res, dispatch.warehouseId)))
        return;

      if (dispatch.status !== "CONFIRMED") {
        return res.status(400).json({
          message: "Зөвхөн баталгаажсан илгээмжийг илгээх боломжтой",
        });
      }

      const updated = await prisma.stockDispatch.update({
        where: { id },
        data: {
          status: "DISPATCHED",
          driverId: driverId || null,
          driverName,
          driverPhone,
          vehicleNumber: vehicleNumber || null,
          note: note || dispatch.note,
          dispatchedAt: new Date(),
        },
        include: {
          request: {
            include: {
              items: {
                include: {
                  product: { select: { id: true, name: true, sku: true } },
                },
              },
              organization: { select: { id: true, name: true } },
            },
          },
          warehouse: { select: { id: true, name: true } },
        },
      });

      res.json(updated);
    } catch (error) {
      console.error("dispatch error", error);
      res.status(500).json({
        message: "Илгээмж илгээхэд алдаа гарлаа",
      });
    }
  },
);

// Mark delivered (DISPATCHED → DELIVERED, request → COMPLETED)
router.patch(
  "/stock-requests/dispatches/:id/deliver",
  requireAuth,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { note } = req.body;

      const dispatch = await prisma.stockDispatch.findUnique({
        where: { id },
      });

      if (!dispatch) {
        return res.status(404).json({ message: "Илгээмж олдсонгүй" });
      }
      if (!(await assertWarehouseAccess(req, res, dispatch.warehouseId)))
        return;

      if (dispatch.status !== "DISPATCHED") {
        return res.status(400).json({
          message:
            "Зөвхөн илгээгдсэн илгээмжийг хүргэгдсэн гэж тэмдэглэх боломжтой",
        });
      }

      const updated = await prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const request = await tx.warehouseStockRequest.findUnique({
            where: { id: dispatch.requestId },
            include: { items: true },
          });
          if (request) {
            await transferStockToVendor(
              tx,
              {
                organizationId: request.organizationId,
                requestNumber: request.requestNumber,
              },
              request.items,
            );
          }

          await tx.warehouseStockRequest.update({
            where: { id: dispatch.requestId },
            data: {
              status: StockRequestStatus.COMPLETED,
              completedAt: new Date(),
            },
          });

          return tx.stockDispatch.update({
            where: { id },
            data: {
              status: "DELIVERED",
              deliveredAt: new Date(),
              note: note || dispatch.note,
            },
            include: {
              request: {
                include: {
                  items: {
                    include: {
                      product: { select: { id: true, name: true, sku: true } },
                    },
                  },
                  organization: { select: { id: true, name: true } },
                },
              },
              warehouse: { select: { id: true, name: true } },
            },
          });
        },
      );

      res.json(updated);
    } catch (error) {
      console.error("deliver dispatch error", error);
      res.status(500).json({
        message: "Хүргэлт тэмдэглэхэд алдаа гарлаа",
      });
    }
  },
);

// Cancel dispatch (PENDING/CONFIRMED → CANCELLED)
router.patch(
  "/stock-requests/dispatches/:id/cancel",
  requireAuth,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { note } = req.body;

      const dispatch = await prisma.stockDispatch.findUnique({
        where: { id },
        include: { request: { include: { items: true } } },
      });

      if (!dispatch) {
        return res.status(404).json({ message: "Илгээмж олдсонгүй" });
      }
      if (!(await assertWarehouseAccess(req, res, dispatch.warehouseId)))
        return;

      if (dispatch.status !== "PENDING" && dispatch.status !== "CONFIRMED") {
        return res.status(400).json({
          message:
            "Зөвхөн хүлээгдэж буй эсвэл баталгаажсан илгээмжийг цуцлах боломжтой",
        });
      }

      const updated = await prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          // If was CONFIRMED, reverse the inventory deduction
          if (dispatch.status === "CONFIRMED") {
            for (const item of dispatch.request.items) {
              const quantity = item.approvedQuantity || item.quantity;
              await adjustStock(tx, {
                productId: item.productId,
                warehouseId: dispatch.warehouseId,
                change: quantity,
                reason: InventoryReason.TRANSFER_IN,
                note: `Dispatch ${dispatch.dispatchNumber} cancelled - inventory restored`,
                referenceId: dispatch.requestId,
                referenceType: "STOCK_DISPATCH",
              });
            }
          }

          // Revert request status to APPROVED
          await tx.warehouseStockRequest.update({
            where: { id: dispatch.requestId },
            data: { status: StockRequestStatus.APPROVED },
          });

          return tx.stockDispatch.update({
            where: { id },
            data: {
              status: "CANCELLED",
              note: note || dispatch.note,
            },
          });
        },
      );

      res.json(updated);
    } catch (error) {
      console.error("cancel dispatch error", error);
      res.status(500).json({
        message: "Илгээмж цуцлахад алдаа гарлаа",
      });
    }
  },
);

// ==========================================
// QPAY PAYMENT ENDPOINTS
// ==========================================

// POST /stock-requests/payments/:id/qpay — Create QPay invoice for a stock payment
router.post(
  "/stock-requests/payments/:id/qpay",
  requireAuth,
  async (req, res) => {
    try {
      const id = req.params.id as string;

      const payment = await prisma.stockRequestPayment.findUnique({
        where: { id },
        include: {
          request: {
            select: { id: true, requestNumber: true, status: true },
          },
        },
      });

      if (!payment) {
        return res.status(404).json({ message: "Төлбөр олдсонгүй" });
      }

      const permissions = await assertOrgPermission(
        req,
        res,
        payment.organizationId,
        Permission.REQUEST_STOCK,
      );
      if (!permissions) return;

      if (!canPayApprovedStockRequest(payment.request.status)) {
        return res.status(409).json({
          code: "STOCK_REQUEST_NOT_APPROVED",
          message: "Админ зөвшөөрсний дараа QPay нэхэмжлэх нээгдэнэ",
        });
      }

      if (payment.status === PaymentStatus.PAID) {
        return res
          .status(400)
          .json({ message: "Энэ төлбөр аль хэдийн төлөгдсөн байна" });
      }

      if (payment.status === PaymentStatus.CANCELLED) {
        return res
          .status(400)
          .json({ message: "Цуцлагдсан төлбөр төлөх боломжгүй" });
      }

      const amount = Number(payment.totalAmount) - Number(payment.paidAmount);
      if (amount <= 0) {
        return res.status(400).json({ message: "Төлөх дүн 0 байна" });
      }

      if (process.env.MGL_LOCAL_DEV === "true") {
        const transactionId = `DEV-QPAY-${payment.id}`;
        await prisma.stockRequestPayment.update({
          where: { id: payment.id },
          data: { transactionId, paymentMethod: PaymentMethod.QPAY },
        });
        return res.json({
          paymentId: payment.id,
          invoiceNumber: payment.invoiceNumber,
          amount,
          qrText: `mgl-business://dev-qpay/${payment.id}?amount=${amount}`,
          qrImage: "",
          qpayInvoiceId: transactionId,
          deepLinks: [],
          expiresIn: 3600,
          devMode: true,
        });
      }

      const qpayData = await createQPayInvoice({
        orderId: payment.id,
        orderNumber: payment.invoiceNumber,
        amount,
        description: `Агуулхын захиалга - ${payment.request?.requestNumber || payment.invoiceNumber}`,
      });

      // Store QPay invoice reference
      await prisma.stockRequestPayment.update({
        where: { id },
        data: {
          transactionId: qpayData.invoice_id,
          paymentMethod: PaymentMethod.QPAY,
        },
      });

      return res.json({
        paymentId: payment.id,
        invoiceNumber: payment.invoiceNumber,
        amount,
        qrText: qpayData.qr_text,
        qrImage: qpayData.qr_image,
        qpayInvoiceId: qpayData.invoice_id,
        deepLinks: qpayData.urls,
        expiresIn: 300,
      });
    } catch (error) {
      console.error("qpay create invoice error", error);
      return res
        .status(502)
        .json({ message: "QPay нэхэмжлэх үүсгэхэд алдаа гарлаа" });
    }
  },
);

// POST /stock-requests/payments/:id/qpay/dev-confirm — local development only
router.post(
  "/stock-requests/payments/:id/qpay/dev-confirm",
  requireAuth,
  async (req, res) => {
    if (process.env.MGL_LOCAL_DEV !== "true") {
      return res.status(404).json({ message: "Endpoint олдсонгүй" });
    }

    const id = req.params.id as string;
    const payment = await prisma.stockRequestPayment.findUnique({
      where: { id },
      include: {
        request: { select: { status: true } },
      },
    });
    if (!payment) {
      return res.status(404).json({ message: "Төлбөр олдсонгүй" });
    }

    const permissions = await assertOrgPermission(
      req,
      res,
      payment.organizationId,
      Permission.REQUEST_STOCK,
    );
    if (!permissions) return;

    if (!canPayApprovedStockRequest(payment.request.status)) {
      return res.status(409).json({
        code: "STOCK_REQUEST_NOT_APPROVED",
        message: "Админ зөвшөөрсний дараа төлбөр баталгаажуулах боломжтой",
      });
    }

    if (!payment.transactionId?.startsWith("DEV-QPAY-")) {
      return res.status(400).json({ message: "Fake QPay нэхэмжлэх биш байна" });
    }
    if (payment.status === PaymentStatus.CANCELLED) {
      return res.status(400).json({ message: "Цуцлагдсан төлбөр байна" });
    }

    const updated = await prisma.stockRequestPayment.update({
      where: { id },
      data: {
        status: PaymentStatus.PAID,
        paidAmount: payment.totalAmount,
        paidAt: new Date(),
        paymentMethod: PaymentMethod.QPAY,
        note: "Local fake QPay баталгаажуулалт",
      },
    });

    return res.json({ status: updated.status, paymentId: updated.id });
  },
);

// POST /stock-requests/payments/:id/dev-mark-paid — local development only.
// Allows the vendor invoice screen to complete a payment without contacting a
// real payment provider. Production deliberately exposes this route as 404.
router.post(
  "/stock-requests/payments/:id/dev-mark-paid",
  requireAuth,
  async (req, res) => {
    if (process.env.MGL_LOCAL_DEV !== "true") {
      return res.status(404).json({ message: "Endpoint олдсонгүй" });
    }

    const id = req.params.id as string;
    const payment = await prisma.stockRequestPayment.findUnique({
      where: { id },
      include: { request: { select: { status: true } } },
    });
    if (!payment) {
      return res.status(404).json({ message: "Төлбөр олдсонгүй" });
    }

    const permissions = await assertOrgPermission(
      req,
      res,
      payment.organizationId,
      Permission.REQUEST_STOCK,
    );
    if (!permissions) return;

    if (payment.status === PaymentStatus.PAID) {
      return res.json({ status: payment.status, paymentId: payment.id });
    }
    if (payment.status === PaymentStatus.CANCELLED) {
      return res.status(400).json({ message: "Цуцлагдсан төлбөр байна" });
    }
    if (!canPayApprovedStockRequest(payment.request.status)) {
      return res.status(409).json({
        code: "STOCK_REQUEST_NOT_APPROVED",
        message: "Админ зөвшөөрсний дараа төлсөн гэж тэмдэглэх боломжтой",
      });
    }

    const actor = getActor(req);
    const updated = await prisma.stockRequestPayment.update({
      where: { id },
      data: {
        status: PaymentStatus.PAID,
        paidAmount: payment.totalAmount,
        paidAt: new Date(),
        paymentMethod: PaymentMethod.CASH,
        confirmedById: actor?.userId || null,
        note: "Local development төлбөрийн баталгаажуулалт",
      },
    });

    return res.json({ status: updated.status, paymentId: updated.id });
  },
);

// GET /stock-requests/payments/:id/qpay/status — Poll QPay payment status
router.get(
  "/stock-requests/payments/:id/qpay/status",
  requireAuth,
  async (req, res) => {
    try {
      const id = req.params.id as string;

      const payment = await prisma.stockRequestPayment.findUnique({
        where: { id },
      });

      if (!payment) {
        return res.status(404).json({ message: "Төлбөр олдсонгүй" });
      }

      const permissions = await assertOrgPermission(
        req,
        res,
        payment.organizationId,
        Permission.REQUEST_STOCK,
      );
      if (!permissions) return;

      if (payment.status === PaymentStatus.PAID) {
        return res.json({ status: "PAID" });
      }

      if (!payment.transactionId) {
        return res.json({ status: "PENDING" });
      }

      const qpayCheck = await checkQPayPayment(payment.transactionId);

      if (qpayCheck.count === 0) {
        return res.json({ status: "PENDING" });
      }

      // Payment confirmed — update
      const userId = getActor(req)?.userId;
      await prisma.stockRequestPayment.update({
        where: { id },
        data: {
          status: PaymentStatus.PAID,
          paidAmount: payment.totalAmount,
          paidAt: new Date(),
          paymentMethod: PaymentMethod.QPAY,
          confirmedById: userId || null,
          note: "QPay автомат баталгаажуулалт",
        },
      });

      return res.json({ status: "PAID" });
    } catch (error) {
      console.error("qpay status check error", error);
      return res
        .status(500)
        .json({ message: "QPay төлбөр шалгахад алдаа гарлаа" });
    }
  },
);

// POST /stock-requests/qpay/callback — QPay webhook callback
router.post("/stock-requests/qpay/callback", async (req, res) => {
  try {
    const paymentId = req.query.paymentId as string;
    if (!paymentId) {
      return res.status(400).json({ message: "paymentId required" });
    }

    const payment = await prisma.stockRequestPayment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.status === PaymentStatus.PAID) {
      return res.json({ message: "already paid" });
    }

    if (!payment.transactionId) {
      return res.status(400).json({ message: "no provider ref" });
    }

    const qpayCheck = await checkQPayPayment(payment.transactionId);

    if (qpayCheck.count === 0) {
      return res.json({ message: "not yet paid" });
    }

    await prisma.stockRequestPayment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.PAID,
        paidAmount: payment.totalAmount,
        paidAt: new Date(),
        paymentMethod: PaymentMethod.QPAY,
        note: "QPay callback баталгаажуулалт",
      },
    });

    return res.json({ message: "success" });
  } catch (error) {
    console.error("stock qpay callback error", error);
    return res.status(500).json({ message: "callback error" });
  }
});

router.use(stockReturnRoutes);

export default router;
