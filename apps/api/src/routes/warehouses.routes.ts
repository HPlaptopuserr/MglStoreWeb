import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";

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
    const result = warehouses.map((w) => ({
      ...w,
      organizations: w.organizations.map((wo) => wo.organization),
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
router.post("/warehouses", async (req, res) => {
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
      organizations: warehouse.organizations.map((wo) => wo.organization),
    });
  } catch (error) {
    console.error("create warehouse error", error);
    res.status(500).json({
      message: "Агуулах үүсгэхэд алдаа гарлаа",
    });
  }
});

// Update warehouse
router.patch("/warehouses/:id", async (req, res) => {
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
      organizations: updated.organizations.map((wo) => wo.organization),
    });
  } catch (error) {
    console.error("update warehouse error", error);
    res.status(500).json({
      message: "Агуулах шинэчлэхэд алдаа гарлаа",
    });
  }
});

// Assign/update organizations for a warehouse (Admin)
router.post("/warehouses/:id/assign", async (req, res) => {
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
      organizations: updated.organizations.map((wo) => wo.organization),
    });
  } catch (error) {
    console.error("assign warehouse error", error);
    res.status(500).json({
      message: "Агуулах оноохд алдаа гарлаа",
    });
  }
});

// Delete warehouse (soft delete)
router.delete("/warehouses/:id", async (req, res) => {
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
      (sum, inv) => sum + inv.quantity,
      0,
    );
    const lowStockItems = warehouse.inventories.filter(
      (inv) => inv.quantity <= inv.minQuantity,
    ).length;

    res.json({
      ...warehouse,
      organizations: warehouse.organizations.map((wo) => wo.organization),
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

      res.json({ message: "Агуулахийн бүртгэл устгагдлаа" });
    } catch (error) {
      console.error("delete warehouse inventory error", error);
      res.status(500).json({
        message: "Агуулахийн бүртгэл устгахад алдаа гарлаа",
      });
    }
  },
);

export default router;
