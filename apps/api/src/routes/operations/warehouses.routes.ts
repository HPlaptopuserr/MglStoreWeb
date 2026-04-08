import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import { Permission } from "@mgl/types";
import { requireAuth, requirePlatformPermission } from "../../middleware/auth";

/**
 * Helper: recalculate Product.stock from SUM of all WarehouseInventory.
 * Call after any warehouse inventory change.
 */
async function syncProductStock(productId: string) {
  const result = await prisma.warehouseInventory.aggregate({
    where: { productId },
    _sum: { quantity: true },
  });
  await prisma.product.update({
    where: { id: productId },
    data: { stock: result._sum.quantity ?? 0 },
  });
}

const router: ExpressRouter = Router();

// Get all warehouses (Admin - can see all)
router.get("/warehouses", async (req, res) => {
  try {
    const { organizationId, isActive } = req.query;

    const where: any = {
      deletedAt: null,
    };

    if (organizationId) {
      where.organizations = {
        some: {
          organizationId: organizationId as string,
        },
      };
    }

    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    const warehouses = await prisma.warehouse.findMany({
      where,
      include: {
        organizations: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
              },
            },
          },
        },
        createdBy: {
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
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform to include organizations array
    const result = warehouses.map((w: (typeof warehouses)[number]) => ({
      ...w,
      organizations: w.organizations.map((wo: (typeof w.organizations)[number]) => wo.organization),
    }));

    res.json(result);
  } catch (error) {
    console.error("get warehouses error", error);
    res.status(500).json({
      message: "Агуулахуудыг авахад алдаа гарлаа",
    });
  }
});

// Get warehouses for a specific organization (Vendor)
router.get("/warehouses/organization/:orgId", async (req, res) => {
  try {
    const { orgId } = req.params;

    const warehouses = await prisma.warehouse.findMany({
      where: {
        organizations: {
          some: {
            organizationId: orgId,
          },
        },
        deletedAt: null,
        isActive: true,
      },
      include: {
        organizations: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(warehouses);
  } catch (error) {
    console.error("get org warehouses error", error);
    res.status(500).json({
      message: "Агуулахуудыг авахад алдаа гарлаа",
    });
  }
});

// Create warehouse (Admin creates)
router.post("/warehouses", requireAuth, requirePlatformPermission(Permission.MANAGE_WAREHOUSES), async (req, res) => {
  try {
    const {
      name,
      address,
      city,
      district,
      phone,
      capacity,
      lat,
      lng,
      createdById,
      organizationIds,
    } = req.body;

    if (!name || !address) {
      return res.status(400).json({
        message: "name, address шаардлагатай",
      });
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        name,
        address,
        city: city || "",
        district: district || "",
        phone: phone || null,
        capacity: capacity || 0,
        lat: lat || null,
        lng: lng || null,
        createdById: createdById || null,
        isActive: true,
        organizations: organizationIds?.length
          ? {
              create: organizationIds.map((orgId: string) => ({
                organizationId: orgId,
                assignedById: createdById || null,
              })),
            }
          : undefined,
      },
      include: {
        organizations: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json({
      ...warehouse,
      organizations: warehouse.organizations.map((wo: (typeof warehouse.organizations)[number]) => wo.organization),
    });
  } catch (error) {
    console.error("create warehouse error", error);
    res.status(500).json({
      message: "Агуулах үүсгэхэд алдаа гарлаа",
    });
  }
});

// Update warehouse
router.patch("/warehouses/:id", requireAuth, requirePlatformPermission(Permission.MANAGE_WAREHOUSES), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      address,
      city,
      district,
      phone,
      capacity,
      lat,
      lng,
      isActive,
    } = req.body;

    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (district !== undefined) updateData.district = district;
    if (phone !== undefined) updateData.phone = phone;
    if (capacity !== undefined) updateData.capacity = capacity;
    if (lat !== undefined) updateData.lat = lat;
    if (lng !== undefined) updateData.lng = lng;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.warehouse.update({
      where: { id },
      data: updateData,
      include: {
        organizations: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    res.json({
      ...updated,
      organizations: updated.organizations.map((wo: (typeof updated.organizations)[number]) => wo.organization),
    });
  } catch (error) {
    console.error("update warehouse error", error);
    res.status(500).json({
      message: "Агуулах шинэчлэхэд алдаа гарлаа",
    });
  }
});

// Assign/update organizations for a warehouse (Admin)
router.post("/warehouses/:id/assign", requireAuth, requirePlatformPermission(Permission.MANAGE_WAREHOUSES), async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationIds, assignedById } = req.body;

    // organizationIds is an array of organization IDs to assign
    // Empty array means remove all assignments

    // First, remove all existing assignments
    await prisma.warehouseOrganization.deleteMany({
      where: { warehouseId: id },
    });

    // Then create new assignments if any
    if (organizationIds && organizationIds.length > 0) {
      await prisma.warehouseOrganization.createMany({
        data: organizationIds.map((orgId: string) => ({
          warehouseId: id,
          organizationId: orgId,
          assignedById: assignedById || null,
        })),
      });
    }

    // Fetch updated warehouse
    const updated = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        organizations: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!updated) {
      return res.status(404).json({ message: "Агуулах олдсонгүй" });
    }

    res.json({
      ...updated,
      organizations: updated.organizations.map((wo: (typeof updated.organizations)[number]) => wo.organization),
    });
  } catch (error) {
    console.error("assign warehouse error", error);
    res.status(500).json({
      message: "Агуулах оноохд алдаа гарлаа",
    });
  }
});

// Delete warehouse (soft delete)
router.delete("/warehouses/:id", requireAuth, requirePlatformPermission(Permission.MANAGE_WAREHOUSES), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.warehouse.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.json({ message: "Агуулах устгагдлаа" });
  } catch (error) {
    console.error("delete warehouse error", error);
    res.status(500).json({
      message: "Агуулах устгахд алдаа гарлаа",
    });
  }
});

// Get warehouse detail with inventory
router.get("/warehouses/:id/detail", async (req, res) => {
  try {
    const { id } = req.params;

    const warehouse = await prisma.warehouse.findUnique({
      where: { id, deletedAt: null },
      include: {
        organizations: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
              },
            },
          },
        },
        inventories: {
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
                organization: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
        },
        createdBy: {
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
      },
    });

    if (!warehouse) {
      return res.status(404).json({ message: "Агуулах олдсонгүй" });
    }

    // Calculate summary stats
    const totalProducts = warehouse.inventories.length;
    const totalQuantity = warehouse.inventories.reduce(
      (sum: number, inv: (typeof warehouse.inventories)[number]) => sum + inv.quantity,
      0,
    );
    const lowStockItems = warehouse.inventories.filter(
      (inv: (typeof warehouse.inventories)[number]) => inv.quantity <= inv.minQuantity,
    ).length;

    res.json({
      ...warehouse,
      organizations: warehouse.organizations.map((wo: (typeof warehouse.organizations)[number]) => wo.organization),
      summary: {
        totalProducts,
        totalQuantity,
        lowStockItems,
        capacityUsed:
          warehouse.capacity > 0
            ? Math.round((totalQuantity / warehouse.capacity) * 100)
            : 0,
      },
    });
  } catch (error) {
    console.error("get warehouse detail error", error);
    res.status(500).json({
      message: "Агуулахийн мэдээлэл авахад алдаа гарлаа",
    });
  }
});

// Add/Update inventory for a warehouse
router.post("/warehouses/:id/inventory", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      productId,
      quantity,
      minQuantity,
      maxQuantity,
      location,
      batchNumber,
      expiryDate,
      note,
    } = req.body;

    if (!productId || quantity === undefined) {
      return res.status(400).json({
        message: "productId, quantity шаардлагатай",
      });
    }

    // Check warehouse exists
    const warehouse = await prisma.warehouse.findUnique({
      where: { id, deletedAt: null },
    });

    if (!warehouse) {
      return res.status(404).json({ message: "Агуулах олдсонгүй" });
    }

    // Upsert inventory
    const inventory = await prisma.warehouseInventory.upsert({
      where: {
        warehouseId_productId: {
          warehouseId: id,
          productId,
        },
      },
      create: {
        warehouseId: id,
        productId,
        quantity,
        minQuantity: minQuantity || 0,
        maxQuantity: maxQuantity || null,
        location: location || null,
        batchNumber: batchNumber || null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        note: note || null,
        lastRestockedAt: new Date(),
      },
      update: {
        quantity,
        minQuantity: minQuantity !== undefined ? minQuantity : undefined,
        maxQuantity: maxQuantity !== undefined ? maxQuantity : undefined,
        location: location !== undefined ? location : undefined,
        batchNumber: batchNumber !== undefined ? batchNumber : undefined,
        expiryDate:
          expiryDate !== undefined
            ? expiryDate
              ? new Date(expiryDate)
              : null
            : undefined,
        note: note !== undefined ? note : undefined,
        lastRestockedAt: new Date(),
      },
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
    });

    // Sync Product.stock cache
    await syncProductStock(productId);

    res.status(201).json(inventory);
  } catch (error) {
    console.error("add warehouse inventory error", error);
    res.status(500).json({
      message: "Агуулахийн бүртгэл нэмэхэд алдаа гарлаа",
    });
  }
});

// Update inventory quantity
router.patch(
  "/warehouses/:warehouseId/inventory/:productId",
  async (req, res) => {
    try {
      const { warehouseId, productId } = req.params;
      const {
        quantity,
        minQuantity,
        maxQuantity,
        location,
        batchNumber,
        expiryDate,
        note,
      } = req.body;

      const updateData: any = {};
      if (quantity !== undefined) updateData.quantity = quantity;
      if (minQuantity !== undefined) updateData.minQuantity = minQuantity;
      if (maxQuantity !== undefined) updateData.maxQuantity = maxQuantity;
      if (location !== undefined) updateData.location = location;
      if (batchNumber !== undefined) updateData.batchNumber = batchNumber;
      if (expiryDate !== undefined)
        updateData.expiryDate = expiryDate ? new Date(expiryDate) : null;
      if (note !== undefined) updateData.note = note;

      const inventory = await prisma.warehouseInventory.update({
        where: {
          warehouseId_productId: {
            warehouseId,
            productId,
          },
        },
        data: updateData,
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
      });

      res.json(inventory);

      // Sync Product.stock cache (fire after response for speed, but safe since same event loop tick)
      syncProductStock(productId).catch((e) => console.error("sync product stock error", e));
    } catch (error) {
      console.error("update warehouse inventory error", error);
      res.status(500).json({
        message: "Агуулахийн бүртгэл шинэчлэхэд алдаа гарлаа",
      });
    }
  },
);

// Delete inventory from warehouse
router.delete(
  "/warehouses/:warehouseId/inventory/:productId",
  async (req, res) => {
    try {
      const { warehouseId, productId } = req.params;

      await prisma.warehouseInventory.delete({
        where: {
          warehouseId_productId: {
            warehouseId,
            productId,
          },
        },
      });

      // Sync Product.stock cache (will be 0 or sum of remaining warehouses)
      await syncProductStock(productId);

      res.json({ message: "Агуулахийн бүртгэл устгагдлаа" });
    } catch (error) {
      console.error("delete warehouse inventory error", error);
      res.status(500).json({
        message: "Агуулахийн бүртгэл устгахад алдаа гарлаа",
      });
    }
  },
);

// ─── Inventory Ledger (Stock Movements) ───────────────────────────
router.get("/inventory-ledger", async (req, res) => {
  try {
    const {
      warehouseId,
      productId,
      reason,
      page = "1",
      limit = "50",
      from,
      to,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (productId) {
      where.productId = productId as string;
    }

    if (reason) {
      where.reason = reason as string;
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from as string);
      if (to) where.createdAt.lte = new Date(to as string);
    }

    // If warehouseId is provided, only include products that belong to that warehouse
    if (warehouseId) {
      const warehouseProducts = await prisma.warehouseInventory.findMany({
        where: { warehouseId: warehouseId as string },
        select: { productId: true },
      });
      where.productId = { in: warehouseProducts.map((wp: (typeof warehouseProducts)[number]) => wp.productId) };
    }

    const [entries, total] = await Promise.all([
      prisma.inventoryLedger.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true } },
          createdBy: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.inventoryLedger.count({ where }),
    ]);

    res.json({
      entries,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("get inventory ledger error", error);
    res.status(500).json({ message: "Inventory ledger татахад алдаа гарлаа" });
  }
});

/* ─── GET /warehouses/:id/sku-lookup?prefix=MLK-APD ─────────────────
 * Returns existing products whose SKU starts with the given prefix,
 * scoped to the warehouse's organization. Used by the SKU generator
 * to offer existing type numbers for selection.
 * ──────────────────────────────────────────────────────────────────── */
router.get("/warehouses/:id/sku-lookup", async (req, res) => {
  try {
    const warehouseId = req.params.id;
    const prefix = (req.query.prefix as string || "").trim().toUpperCase();

    if (!prefix || prefix.length < 3) {
      return res.json([]);
    }

    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId, deletedAt: null },
      include: { organizations: { select: { organizationId: true }, take: 1 } },
    });

    if (!warehouse) return res.status(404).json({ message: "Агуулах олдсонгүй" });

    const organizationId = warehouse.organizations[0]?.organizationId;
    if (!organizationId) return res.json([]);

    const products = await prisma.product.findMany({
      where: {
        organizationId,
        sku: { startsWith: prefix, mode: "insensitive" },
        deletedAt: null,
      },
      select: { id: true, name: true, sku: true },
      orderBy: { sku: "asc" },
      take: 50,
    });

    return res.json(products);
  } catch (error) {
    console.error("sku-lookup error", error);
    res.status(500).json({ message: "SKU хайхад алдаа гарлаа" });
  }
});

/* ─── POST /warehouses/:id/products ─────────────────────────────────── *
 * Warehouse operator creates a NEW product and adds it to inventory.
 * No organization permission required — product is created under the
 * warehouse's first assigned organization.
 * ──────────────────────────────────────────────────────────────────── */
router.post("/warehouses/:id/products", async (req, res) => {
  try {
    const warehouseId = req.params.id;
    const {
      name,
      description,
      sku,
      price,
      costPrice,
      businessCategoryId,
      images,  // string[] of URLs
      quantity,
      minQuantity,
      location,
      batchNumber,
      expiryDate,
      note,
    } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ message: "Барааны нэр, үнэ шаардлагатай" });
    }

    // Check warehouse exists
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId, deletedAt: null },
      include: {
        organizations: {
          select: { organizationId: true },
          take: 1,
        },
      },
    });
    if (!warehouse) {
      return res.status(404).json({ message: "Агуулах олдсонгүй" });
    }

    const organizationId = warehouse.organizations[0]?.organizationId;
    if (!organizationId) {
      return res.status(400).json({ message: "Агуулахад байгууллага хуваарилагдаагүй байна" });
    }

    const priceNum = parseFloat(String(price));
    if (isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({ message: "Үнэ буруу байна" });
    }

    const costPriceNum = costPrice != null && costPrice !== ""
      ? parseFloat(String(costPrice))
      : null;
    if (costPriceNum !== null && (isNaN(costPriceNum) || costPriceNum < 0)) {
      return res.status(400).json({ message: "Өртөг үнэ буруу байна" });
    }

    const normalizedSku = sku ? String(sku).trim() : null;
    if (normalizedSku) {
      const existingSku = await prisma.product.findFirst({
        where: { organizationId, sku: normalizedSku, deletedAt: null },
        select: { id: true },
      });
      if (existingSku) {
        return res.status(409).json({ message: "Ижил SKU-тэй бараа бүртгэлтэй байна" });
      }
    }

    if (businessCategoryId) {
      const cat = await prisma.businessCategory.findUnique({
        where: { id: String(businessCategoryId) },
        select: { id: true },
      });
      if (!cat) {
        return res.status(400).json({ message: "Ангилал олдсонгүй" });
      }
    }

    const imageUrls: string[] = Array.isArray(images) ? images.slice(0, 5) : [];
    const qty = Math.max(0, parseInt(String(quantity)) || 0);

    // Create product + inventory + ledger in one transaction
    const product = await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          organizationId,
          name: String(name).trim(),
          description: description ? String(description).trim() : null,
          sku: normalizedSku,
          price: priceNum,
          costPrice: costPriceNum,
          stock: qty,
          businessCategoryId: businessCategoryId || null,
          isActive: true,
          images: {
            create: imageUrls.map((url: string) => ({ url })),
          },
        },
        include: {
          images: { select: { id: true, url: true } },
          businessCategory: { select: { id: true, name: true } },
        },
      });

      // Also add to warehouse inventory if quantity > 0
      if (qty > 0) {
        await tx.warehouseInventory.create({
          data: {
            warehouseId,
            productId: newProduct.id,
            quantity: qty,
            minQuantity: minQuantity ? parseInt(String(minQuantity)) : 0,
            location: location || null,
            batchNumber: batchNumber || null,
            expiryDate: expiryDate ? new Date(expiryDate) : null,
            note: note || null,
            lastRestockedAt: new Date(),
          },
        });

        // Ledger entry
        await tx.inventoryLedger.create({
          data: {
            productId: newProduct.id,
            change: qty,
            reason: "INITIAL_STOCK",
            note: note || "Шинэ бараа бүртгэл — агуулахаас нэмсэн",
          },
        });
      }

      return newProduct;
    });

    return res.status(201).json(product);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return res.status(409).json({ message: "Давхардсан SKU эсвэл бараа байна" });
    }
    console.error("create warehouse product error", error);
    return res.status(500).json({ message: "Бараа үүсгэхэд алдаа гарлаа" });
  }
});

/* ─── POST /warehouses/categories ───────────────────────────────────── *
 * Quick category creation from WMS — operator creates a new category.
 * ──────────────────────────────────────────────────────────────────── */
router.post("/warehouses/categories", async (req, res) => {
  try {
    const { name, parentId } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Ангилалын нэр шаардлагатай" });
    }

    const slug = String(name).trim().toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\u0400-\u04ff-]/g, "")
      + "-" + Date.now().toString(36);

    let level = 0;
    if (parentId) {
      const parent = await prisma.businessCategory.findUnique({
        where: { id: parentId },
        select: { level: true },
      });
      if (!parent) {
        return res.status(400).json({ message: "Эцэг ангилал олдсонгүй" });
      }
      level = parent.level + 1;
      if (level > 2) {
        return res.status(400).json({ message: "Хамгийн ихдээ 3 түвшин (0,1,2)" });
      }
    }

    const category = await prisma.businessCategory.create({
      data: {
        slug,
        name: String(name).trim(),
        parentId: parentId || null,
        level,
        isActive: true,
      },
    });

    return res.status(201).json(category);
  } catch (error) {
    console.error("create warehouse category error", error);
    return res.status(500).json({ message: "Ангилал үүсгэхэд алдаа гарлаа" });
  }
});

export default router;
