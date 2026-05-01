import { Router, type Router as ExpressRouter } from "express";
import { prisma, StockRequestStatus, PaymentStatus, InventoryReason, PaymentMethod, ReturnStatus } from "@mgl/database";
import type { Prisma } from "@mgl/database";
import { Permission } from "@mgl/types";
import { adjustStock, syncProductStock } from "../../services/inventory.service";
import { requireAuth } from "../../middleware/auth";
import { requireOrgPermission } from "../../services/permission.service";
import { createQPayInvoice, checkQPayPayment } from "../../services/qpay";

const router: ExpressRouter = Router();

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
  items: { productId: string; approvedQuantity: number | null; quantity: number }[]
) => {
  for (const item of items) {
    const quantity = item.approvedQuantity || item.quantity;
    if (quantity <= 0) continue;

    const sourceProduct = await tx.product.findUnique({
      where: { id: item.productId },
      include: { images: true }
    });

    if (!sourceProduct) continue;

    let targetProduct;
    if (sourceProduct.sku) {
      targetProduct = await tx.product.findFirst({
        where: { organizationId: request.organizationId, sku: sourceProduct.sku, deletedAt: null }
      });
    }

    if (!targetProduct) {
      targetProduct = await tx.product.create({
        data: {
          organizationId: request.organizationId,
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
            create: sourceProduct.images.map(img => ({ url: img.url }))
          }
        }
      });
    } else {
      targetProduct = await tx.product.update({
        where: { id: targetProduct.id },
        data: { stock: { increment: quantity } }
      });
    }

    await tx.inventoryLedger.create({
      data: {
        productId: targetProduct.id,
        change: quantity,
        reason: InventoryReason.TRANSFER_IN,
        note: `Бараа таталт батлагдсан (${request.requestNumber})`
      }
    });
  }
};

// Get all stock requests (Admin sees all, Vendor sees their own)
router.get("/stock-requests", requireAuth, async (req, res) => {
  try {
    const { organizationId, status, warehouseId } = req.query;

    const where: any = {};

    if (organizationId) {
      where.organizationId = organizationId as string;
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
router.post("/stock-requests", requireAuth, requireOrgPermission({ from: "body" }, Permission.REQUEST_STOCK), async (req, res) => {
  try {
    const {
      organizationId,
      warehouseId,
      requestedById,
      note,
      deliveryAddress,
      deliveryPhone,
      items, // Array of { productId, quantity, note? }
    } = req.body;

    if (!organizationId || !warehouseId || !requestedById || !items?.length) {
      return res.status(400).json({
        message:
          "organizationId, warehouseId, requestedById, items шаардлагатай",
      });
    }

    // Verify warehouse is assigned to this organization
    const warehouseOrg = await prisma.warehouseOrganization.findUnique({
      where: {
        warehouseId_organizationId: {
          warehouseId,
          organizationId,
        },
      },
    });

    if (!warehouseOrg) {
      return res.status(403).json({
        message: "Энэ агуулахаас бараа татах эрхгүй байна",
      });
    }

    // Check for unpaid payments before allowing new order
    const unpaidCount = await prisma.stockRequestPayment.count({
      where: {
        organizationId,
        status: PaymentStatus.PENDING,
      },
    });

    if (unpaidCount > 0) {
      return res.status(400).json({
        message: "Өмнөх төлбөрөө төлсний дараа шинэ захиалга өгөх боломжтой",
        unpaidCount,
      });
    }

    const requestNumber = await generateRequestNumber();
    const invoiceNumber = await generateInvoiceNumber();

    // Calculate total amount from items
    const productIds = items.map(
      (item: { productId: string }) => item.productId,
    );
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, price: true },
    });

    const productPriceMap = new Map(products.map((p: (typeof products)[number]) => [p.id, p.price]));
    let totalAmount = 0;
    for (const item of items) {
      const price = productPriceMap.get(item.productId) || 0;
      totalAmount += Number(price) * item.quantity;
    }

    // Create stock request with payment record in transaction
    const request = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
            create: items.map(
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
    });

    res.status(201).json(request);
  } catch (error) {
    console.error("create stock request error", error);
    res.status(500).json({
      message: "Хүсэлт үүсгэхэд алдаа гарлаа",
    });
  }
});

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

    const unpaidWhere: any = {
      organizationId: request.organizationId,
      status: { in: [PaymentStatus.PENDING, PaymentStatus.FAILED] },
    };

    if (request.payment?.id) {
      unpaidWhere.id = { not: request.payment.id };
    }

    const unpaidPayments = await prisma.stockRequestPayment.findMany({
      where: unpaidWhere,
      include: {
        request: {
          select: { requestNumber: true },
        },
      },
    });

    if (unpaidPayments.length > 0) {
      const unpaidInvoices = unpaidPayments
        .map((p: (typeof unpaidPayments)[number]) => p.invoiceNumber)
        .join(", ");
      return res.status(400).json({
        message: `Өмнөх төлбөр төлөгдөөгүй байна. Төлөгдөөгүй нэхэмжлэхүүд: ${unpaidInvoices}`,
        unpaidPayments: unpaidPayments.map((p: (typeof unpaidPayments)[number]) => ({
          invoiceNumber: p.invoiceNumber,
          requestNumber: p.request?.requestNumber,
          totalAmount: p.totalAmount,
          paidAmount: p.paidAmount,
          status: p.status,
        })),
      });
    }

    // Update request and items with approved quantities
    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
    });

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
    });

    if (!request) {
      return res.status(404).json({ message: "Хүсэлт олдсонгүй" });
    }

    if (request.status !== StockRequestStatus.PENDING) {
      return res.status(400).json({
        message: "Зөвхөн хүлээгдэж буй хүсэлтийг татгалзах боломжтой",
      });
    }

    const updated = await prisma.warehouseStockRequest.update({
      where: { id },
      data: {
        status: StockRequestStatus.REJECTED,
        reviewedById: reviewedById || null,
        reviewNote: reviewNote || null,
        reviewedAt: new Date(),
        rejectedAt: new Date(),
      },
      include: {
        organization: {
          select: { id: true, name: true },
        },
        warehouse: {
          select: { id: true, name: true },
        },
      },
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
    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
      await transferStockToVendor(tx, { organizationId: request.organizationId, requestNumber: request.requestNumber }, request.items);

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
    });

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
    });

    if (!request) {
      return res.status(404).json({ message: "Хүсэлт олдсонгүй" });
    }

    if (request.status !== StockRequestStatus.PENDING) {
      return res.status(400).json({
        message: "Зөвхөн хүлээгдэж буй хүсэлтийг цуцлах боломжтой",
      });
    }

    const updated = await prisma.warehouseStockRequest.update({
      where: { id },
      data: {
        status: StockRequestStatus.CANCELLED,
      },
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
  async (req, res) => {
    try {
      const { warehouseId } = req.params;

      const inventory = await prisma.warehouseInventory.findMany({
        where: {
          warehouseId,
          quantity: { gt: 0 },
        },
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
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          product: {
            name: "asc",
          },
        },
      });

      res.json(inventory);
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
        orderBy: [
          { completedAt: "desc" },
          { warehouse: { name: "asc" } },
        ],
      });

      const catalogItems = completedRequests.flatMap((request: (typeof completedRequests)[number]) =>
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
      const warehousesMap = new Map<string, { id: string; name: string; city: string; district: string }>();
      const lowStockCount = catalogItems.filter((item: (typeof catalogItems)[number]) => item.isLowStock).length;

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
            (sum: number, item: (typeof catalogItems)[number]) => sum + Number(item.quantity || 0),
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
router.get("/stock-requests/payments", async (req, res) => {
  try {
    const { status, organizationId } = req.query;

    const where: any = {};
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
});

// Get single payment
router.get("/stock-requests/payments/:id", async (req, res) => {
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

    res.json(payment);
  } catch (error) {
    console.error("get payment error", error);
    res.status(500).json({
      message: "Төлбөр авахад алдаа гарлаа",
    });
  }
});

// Confirm payment (Admin marks as paid)
router.patch("/stock-requests/payments/:id/confirm", async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmedById, transactionId, paymentMethod, paidAmount, note } =
      req.body;

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

    const updated = await prisma.stockRequestPayment.update({
      where: { id },
      data: {
        status: PaymentStatus.PAID,
        paidAmount: paidAmount || payment.totalAmount,
        paidAt: new Date(),
        paidBy: note || null,
        transactionId: transactionId || null,
        paymentMethod: paymentMethod || null,
        confirmedById: confirmedById || null,
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
});

// Vendor submits payment (self-service — records method & marks as submitted)
router.patch("/stock-requests/payments/:id/pay", requireAuth, async (req, res) => {
  try {
    const id = req.params.id as string;
    const { paymentMethod, transactionId, note } = req.body;
    const userId = (req as any).user?.id || (req as any).userId;

    const payment = await prisma.stockRequestPayment.findUnique({
      where: { id },
      include: { organization: { select: { id: true } } },
    });

    if (!payment) {
      return res.status(404).json({ message: "Төлбөр олдсонгүй" });
    }

    if (payment.status === PaymentStatus.PAID) {
      return res.status(400).json({ message: "Энэ төлбөр аль хэдийн төлөгдсөн байна" });
    }

    if (payment.status === PaymentStatus.CANCELLED) {
      return res.status(400).json({ message: "Цуцлагдсан төлбөр төлөх боломжгүй" });
    }

    if (!paymentMethod) {
      return res.status(400).json({ message: "Төлбөрийн хэлбэр сонгоно уу" });
    }

    const updated = await prisma.stockRequestPayment.update({
      where: { id },
      data: {
        status: PaymentStatus.PAID,
        paidAmount: payment.totalAmount,
        paidAt: new Date(),
        paymentMethod: paymentMethod as PaymentMethod,
        transactionId: (transactionId as string) || null,
        paidBy: (note as string) || null,
        confirmedById: userId || null,
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
});

// Cancel payment (Admin)
router.patch("/stock-requests/payments/:id/cancel", async (req, res) => {
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
});

// Get unpaid payments count for organization (for UI indicators)
router.get(
  "/stock-requests/payments/unpaid/:organizationId",
  requireAuth,
  requireOrgPermission({ from: "params" }, Permission.VIEW_ORG_DASHBOARD),
  async (req, res) => {
    try {
      const organizationId = req.params.organizationId as string;

      const unpaidPayments = await prisma.stockRequestPayment.findMany({
        where: {
          organizationId,
          status: { in: [PaymentStatus.PENDING, PaymentStatus.FAILED] },
        },
        include: {
          request: {
            select: { requestNumber: true },
          },
        },
      });

      const totalUnpaid = unpaidPayments.reduce(
        (sum: number, p: (typeof unpaidPayments)[number]) => sum + (Number(p.totalAmount) - Number(p.paidAmount)),
        0,
      );

      res.json({
        count: unpaidPayments.length,
        totalUnpaid,
        payments: unpaidPayments.map((p: (typeof unpaidPayments)[number]) => ({
          id: p.id,
          invoiceNumber: p.invoiceNumber,
          requestNumber: p.request?.requestNumber,
          amount: Number(p.totalAmount) - Number(p.paidAmount),
          status: p.status,
          dueDate: p.dueDate,
        })),
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
router.get("/stock-requests/warehouse/:warehouseId/dispatches", async (req, res) => {
  try {
    const { warehouseId } = req.params;
    const { status } = req.query;

    const where: any = { warehouseId };
    if (status) {
      where.status = status;
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
              select: { id: true, email: true, profile: { select: { fullName: true, phoneNumber: true } } },
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
});

// Get single dispatch detail
router.get("/stock-requests/dispatches/:id", async (req, res) => {
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
              select: { id: true, email: true, profile: { select: { fullName: true, phoneNumber: true } } },
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
          select: { id: true, email: true, profile: { select: { fullName: true, phoneNumber: true } } },
        },
      },
    });

    if (!dispatch) {
      return res.status(404).json({ message: "Илгээмж олдсонгүй" });
    }

    res.json(dispatch);
  } catch (error) {
    console.error("get dispatch detail error", error);
    res.status(500).json({
      message: "Илгээмжийн мэдээлэл авахад алдаа гарлаа",
    });
  }
});

// Confirm dispatch (Warehouse confirms → deducts inventory → CONFIRMED)
router.patch("/stock-requests/dispatches/:id/confirm", async (req, res) => {
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

    if (dispatch.status !== "PENDING") {
      return res.status(400).json({
        message: "Зөвхөн хүлээгдэж буй илгээмжийг баталгаажуулах боломжтой",
      });
    }

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
    });

    res.json(updated);
  } catch (error) {
    console.error("confirm dispatch error", error);
    res.status(500).json({
      message: "Илгээмж баталгаажуулахад алдаа гарлаа",
    });
  }
});

// Assign driver & dispatch (CONFIRMED → DISPATCHED)
router.patch("/stock-requests/dispatches/:id/dispatch", async (req, res) => {
  try {
    const { id } = req.params;
    const { driverId, driverName, driverPhone, vehicleNumber, note } = req.body;

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
});

// Mark delivered (DISPATCHED → DELIVERED, request → COMPLETED)
router.patch("/stock-requests/dispatches/:id/deliver", async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const dispatch = await prisma.stockDispatch.findUnique({
      where: { id },
    });

    if (!dispatch) {
      return res.status(404).json({ message: "Илгээмж олдсонгүй" });
    }

    if (dispatch.status !== "DISPATCHED") {
      return res.status(400).json({
        message: "Зөвхөн илгээгдсэн илгээмжийг хүргэгдсэн гэж тэмдэглэх боломжтой",
      });
    }

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const request = await tx.warehouseStockRequest.findUnique({
        where: { id: dispatch.requestId },
        include: { items: true }
      });
      if (request) {
        await transferStockToVendor(tx, { organizationId: request.organizationId, requestNumber: request.requestNumber }, request.items);
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
    });

    res.json(updated);
  } catch (error) {
    console.error("deliver dispatch error", error);
    res.status(500).json({
      message: "Хүргэлт тэмдэглэхэд алдаа гарлаа",
    });
  }
});

// Cancel dispatch (PENDING/CONFIRMED → CANCELLED)
router.patch("/stock-requests/dispatches/:id/cancel", async (req, res) => {
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

    if (dispatch.status !== "PENDING" && dispatch.status !== "CONFIRMED") {
      return res.status(400).json({
        message: "Зөвхөн хүлээгдэж буй эсвэл баталгаажсан илгээмжийг цуцлах боломжтой",
      });
    }

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
    });

    res.json(updated);
  } catch (error) {
    console.error("cancel dispatch error", error);
    res.status(500).json({
      message: "Илгээмж цуцлахад алдаа гарлаа",
    });
  }
});

// ==========================================
// QPAY PAYMENT ENDPOINTS
// ==========================================

// POST /stock-requests/payments/:id/qpay — Create QPay invoice for a stock payment
router.post("/stock-requests/payments/:id/qpay", requireAuth, async (req, res) => {
  try {
    const id = req.params.id as string;

    const payment = await prisma.stockRequestPayment.findUnique({
      where: { id },
      include: {
        request: { select: { id: true, requestNumber: true } },
      },
    });

    if (!payment) {
      return res.status(404).json({ message: "Төлбөр олдсонгүй" });
    }

    if (payment.status === PaymentStatus.PAID) {
      return res.status(400).json({ message: "Энэ төлбөр аль хэдийн төлөгдсөн байна" });
    }

    if (payment.status === PaymentStatus.CANCELLED) {
      return res.status(400).json({ message: "Цуцлагдсан төлбөр төлөх боломжгүй" });
    }

    const amount = Number(payment.totalAmount) - Number(payment.paidAmount);
    if (amount <= 0) {
      return res.status(400).json({ message: "Төлөх дүн 0 байна" });
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
    return res.status(502).json({ message: "QPay нэхэмжлэх үүсгэхэд алдаа гарлаа" });
  }
});

// GET /stock-requests/payments/:id/qpay/status — Poll QPay payment status
router.get("/stock-requests/payments/:id/qpay/status", requireAuth, async (req, res) => {
  try {
    const id = req.params.id as string;

    const payment = await prisma.stockRequestPayment.findUnique({
      where: { id },
    });

    if (!payment) {
      return res.status(404).json({ message: "Төлбөр олдсонгүй" });
    }

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
    const userId = (req as any).user?.userId;
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
    return res.status(500).json({ message: "QPay төлбөр шалгахад алдаа гарлаа" });
  }
});

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

// Generate return number  RTN-YYMMDDSSSSS
const generateReturnNumber = async (): Promise<string> => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const prefix = `RTN-${yy}${mm}${dd}`;
  const count = await prisma.dispatchReturn.count({
    where: { returnNumber: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
};

// ═══════════════════════════════════════════════════════════════
// DISPATCH RETURNS — Post-delivery return management
// ═══════════════════════════════════════════════════════════════

// CREATE return for a delivered dispatch
router.post("/dispatches/:id/returns", async (req, res) => {
  try {
    const { id } = req.params;
    const { items, reason, note } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Буцаах бараа сонгоно уу" });
    }

    // Load dispatch with items
    const dispatch = await prisma.stockDispatch.findUnique({
      where: { id },
      include: {
        request: {
          include: { items: { include: { product: true } } },
        },
        returns: { include: { items: true } },
      },
    });

    if (!dispatch) {
      return res.status(404).json({ message: "Илгээмж олдсонгүй" });
    }
    if (dispatch.status !== "DELIVERED") {
      return res.status(400).json({ message: "Зөвхөн хүргэгдсэн илгээмжээс буцаалт хийх боломжтой" });
    }

    // Validate quantities — cannot exceed delivered minus already-returned
    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity < 1) {
        return res.status(400).json({ message: "Буцаах барааны мэдээлэл буруу" });
      }
      const dispatchItem = dispatch.request.items.find((i) => i.productId === item.productId);
      if (!dispatchItem) {
        return res.status(400).json({ message: `Бүтээгдэхүүн ${item.productId} илгээмжид байхгүй` });
      }
      const deliveredQty = dispatchItem.approvedQuantity || dispatchItem.quantity;
      // Sum previously approved/pending returns for this product
      const alreadyReturned = dispatch.returns
        .filter((r) => r.status !== "REJECTED")
        .reduce((sum, r) => {
          const ri = r.items.find((ri) => ri.productId === item.productId);
          return sum + (ri?.quantity || 0);
        }, 0);
      if (item.quantity > deliveredQty - alreadyReturned) {
        return res.status(400).json({
          message: `${dispatchItem.product.name}: хүргэгдсэн ${deliveredQty}, аль хэдийн буцаасан ${alreadyReturned}, буцаах боломжтой ${deliveredQty - alreadyReturned}`,
        });
      }
    }

    const returnNumber = await generateReturnNumber();

    const dispatchReturn = await prisma.dispatchReturn.create({
      data: {
        returnNumber,
        dispatchId: dispatch.id,
        warehouseId: dispatch.warehouseId,
        organizationId: dispatch.organizationId,
        reason: reason || null,
        note: note || null,
        items: {
          create: items.map((item: { productId: string; quantity: number; reason?: string }) => ({
            productId: item.productId,
            quantity: item.quantity,
            reason: item.reason || null,
          })),
        },
      },
      include: {
        items: { include: { product: { select: { id: true, name: true, sku: true, price: true } } } },
        dispatch: { select: { dispatchNumber: true } },
        organization: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(dispatchReturn);
  } catch (error) {
    console.error("create dispatch return error", error);
    res.status(500).json({ message: "Буцаалт үүсгэхэд алдаа гарлаа" });
  }
});

// LIST returns for a warehouse
router.get("/warehouse/:warehouseId/returns", async (req, res) => {
  try {
    const { warehouseId } = req.params;
    const { status } = req.query;

    const where: Prisma.DispatchReturnWhereInput = { warehouseId };
    if (status && typeof status === "string") {
      where.status = status as ReturnStatus;
    }

    const returns = await prisma.dispatchReturn.findMany({
      where,
      include: {
        items: {
          include: { product: { select: { id: true, name: true, sku: true, price: true } } },
        },
        dispatch: {
          select: {
            dispatchNumber: true,
            driverName: true,
            driverPhone: true,
            vehicleNumber: true,
            request: {
              select: {
                requestNumber: true,
                deliveryAddress: true,
                organization: { select: { id: true, name: true, phone: true } },
                requestedBy: {
                  select: {
                    id: true,
                    email: true,
                    profile: { select: { fullName: true, phoneNumber: true } },
                  },
                },
              },
            },
          },
        },
        organization: { select: { id: true, name: true, phone: true } },
        warehouse: { select: { id: true, name: true } },
        approvedBy: {
          select: { id: true, email: true, profile: { select: { fullName: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(returns);
  } catch (error) {
    console.error("list warehouse returns error", error);
    res.status(500).json({ message: "Буцаалтын жагсаалт авахад алдаа гарлаа" });
  }
});

// GET returns for a specific dispatch
router.get("/dispatches/:id/returns", async (req, res) => {
  try {
    const { id } = req.params;
    const returns = await prisma.dispatchReturn.findMany({
      where: { dispatchId: id },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, sku: true, price: true } } },
        },
        approvedBy: {
          select: { id: true, email: true, profile: { select: { fullName: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(returns);
  } catch (error) {
    console.error("list dispatch returns error", error);
    res.status(500).json({ message: "Буцаалтын жагсаалт авахад алдаа гарлаа" });
  }
});

// APPROVE return — restores inventory to warehouse
router.patch("/returns/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const actor = (req as any).user;

    const dispatchReturn = await prisma.dispatchReturn.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        dispatch: true,
      },
    });

    if (!dispatchReturn) {
      return res.status(404).json({ message: "Буцаалт олдсонгүй" });
    }
    if (dispatchReturn.status !== "PENDING") {
      return res.status(400).json({ message: "Зөвхөн хүлээгдэж буй буцаалтыг батлах боломжтой" });
    }

    // Restore inventory inside a transaction
    const updated = await prisma.$transaction(async (tx) => {
      for (const item of dispatchReturn.items) {
        await adjustStock(tx, {
          productId: item.productId,
          warehouseId: dispatchReturn.warehouseId,
          change: item.quantity, // positive = return to stock
          reason: InventoryReason.RETURN,
          note: `Буцаалт ${dispatchReturn.returnNumber}`,
          createdById: actor?.id || null,
          referenceId: dispatchReturn.returnNumber,
          referenceType: "DISPATCH_RETURN",
        });
      }

      return tx.dispatchReturn.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          approvedById: actor?.id || null,
        },
        include: {
          items: { include: { product: { select: { id: true, name: true, sku: true, price: true } } } },
          organization: { select: { id: true, name: true } },
          warehouse: { select: { id: true, name: true } },
        },
      });
    });

    res.json(updated);
  } catch (error) {
    console.error("approve dispatch return error", error);
    res.status(500).json({ message: "Буцаалт батлахад алдаа гарлаа" });
  }
});

// REJECT return
router.patch("/returns/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectReason } = req.body;
    const actor = (req as any).user;

    const dispatchReturn = await prisma.dispatchReturn.findUnique({
      where: { id },
    });

    if (!dispatchReturn) {
      return res.status(404).json({ message: "Буцаалт олдсонгүй" });
    }
    if (dispatchReturn.status !== "PENDING") {
      return res.status(400).json({ message: "Зөвхөн хүлээгдэж буй буцаалтыг татгалзах боломжтой" });
    }

    const updated = await prisma.dispatchReturn.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        rejectReason: rejectReason || null,
        approvedById: actor?.id || null,
      },
      include: {
        items: { include: { product: { select: { id: true, name: true, sku: true, price: true } } } },
        organization: { select: { id: true, name: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error("reject dispatch return error", error);
    res.status(500).json({ message: "Буцаалт татгалзахад алдаа гарлаа" });
  }
});

export default router;
