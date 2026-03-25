import { Router, type Router as ExpressRouter } from "express";
import { prisma, StockRequestStatus, PaymentStatus } from "@mgl/database";

const router: ExpressRouter = Router();

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

// Get all stock requests (Admin sees all, Vendor sees their own)
router.get("/stock-requests", async (req, res) => {
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
router.get("/stock-requests/:id", async (req, res) => {
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
router.post("/stock-requests", async (req, res) => {
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

    const productPriceMap = new Map(products.map((p) => [p.id, p.price]));
    let totalAmount = 0;
    for (const item of items) {
      const price = productPriceMap.get(item.productId) || 0;
      totalAmount += Number(price) * item.quantity;
    }

    // Create stock request with payment record in transaction
    const request = await prisma.$transaction(async (tx) => {
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
router.patch("/stock-requests/:id/approve", async (req, res) => {
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
        .map((p) => p.invoiceNumber)
        .join(", ");
      return res.status(400).json({
        message: `Өмнөх төлбөр төлөгдөөгүй байна. Төлөгдөөгүй нэхэмжлэхүүд: ${unpaidInvoices}`,
        unpaidPayments: unpaidPayments.map((p) => ({
          invoiceNumber: p.invoiceNumber,
          requestNumber: p.request?.requestNumber,
          totalAmount: p.totalAmount,
          paidAmount: p.paidAmount,
          status: p.status,
        })),
      });
    }

    // Update request and items with approved quantities
    const updated = await prisma.$transaction(async (tx) => {
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
      return tx.warehouseStockRequest.update({
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
router.patch("/stock-requests/:id/reject", async (req, res) => {
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
router.patch("/stock-requests/:id/process", async (req, res) => {
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
router.patch("/stock-requests/:id/complete", async (req, res) => {
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

    // Update warehouse inventory (reduce stock)
    const updated = await prisma.$transaction(async (tx) => {
      // Reduce inventory for each item
      for (const item of request.items) {
        const quantity = item.approvedQuantity || item.quantity;

        await tx.warehouseInventory.update({
          where: {
            warehouseId_productId: {
              warehouseId: request.warehouseId,
              productId: item.productId,
            },
          },
          data: {
            quantity: {
              decrement: quantity,
            },
          },
        });
      }

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
router.patch("/stock-requests/:id/cancel", async (req, res) => {
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
  async (req, res) => {
    try {
      const { organizationId } = req.params;

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

      const catalogItems = completedRequests.flatMap((request) =>
        request.items.map((item) => {
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
      const lowStockCount = catalogItems.filter((item) => item.isLowStock).length;

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
            (sum, item) => sum + Number(item.quantity || 0),
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
  async (req, res) => {
    try {
      const { organizationId } = req.params;

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

// Cancel payment (Admin)
router.patch("/stock-requests/payments/:id/cancel", async (req, res) => {
  try {
    const { id } = req.params;

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
  async (req, res) => {
    try {
      const { organizationId } = req.params;

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
        (sum, p) => sum + (Number(p.totalAmount) - Number(p.paidAmount)),
        0,
      );

      res.json({
        count: unpaidPayments.length,
        totalUnpaid,
        payments: unpaidPayments.map((p) => ({
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

export default router;
