import { Router, type Router as ExpressRouter } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { prisma } from "@mgl/database";
import { Permission } from "@mgl/types";
import { requireAuth, requirePlatformPermission } from "../../middleware/auth";
import {
  extractExcelImages,
  uploadBufferToSupabase,
  PRODUCT_COL_MAP,
  resolveCol,
} from "../../lib/excel-import";
import { adjustStock, resolveOrgWarehouse, syncProductStock } from "../../services/inventory.service";
import { assertOrgPermission } from "../../services/permission.service";

const router: ExpressRouter = Router();

// Get all warehouses (Admin - can see all)
router.get("/warehouses", requireAuth, async (req, res) => {
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

    // Transform to include organizations array and flatten createdBy
    const result = warehouses.map((w: (typeof warehouses)[number]) => ({
      ...w,
      organizations: w.organizations.map((wo: (typeof w.organizations)[number]) => wo.organization),
      createdBy: w.createdBy
        ? { id: w.createdBy.id, name: w.createdBy.profile?.fullName || w.createdBy.email }
        : null,
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
router.get("/warehouses/organization/:orgId", requireAuth, async (req, res) => {
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
                description: true,
                sku: true,
                barcode: true,
                unit: true,
                price: true,
                costPrice: true,
                businessCategoryId: true,
                supplyType: true,
                preorderLeadTimeDays: true,
                preorderNote: true,
                isActive: true,
                images: {
                  select: { id: true, url: true },
                },
                businessCategory: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
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

// Toggle showOnWeb for a warehouse inventory item
// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.patch("/warehouses/:id/inventory/:invId/show-on-web", requireAuth, requirePlatformPermission(Permission.MANAGE_WAREHOUSES), async (req, res) => {
  try {
    const { invId } = req.params;
    const existing = await (prisma.warehouseInventory as any).findUnique({ where: { id: invId } });
    if (!existing) return res.status(404).json({ message: "Бараа олдсонгүй" });

    const updated = await (prisma.warehouseInventory as any).update({
      where: { id: invId },
      data: { showOnWeb: !existing.showOnWeb },
      select: { id: true, showOnWeb: true },
    });
    return res.json(updated);
  } catch (error) {
    console.error("toggle showOnWeb error", error);
    return res.status(500).json({ message: "Алдаа гарлаа", error: String(error) });
  }
});

// Add/Update inventory for a warehouse
router.post("/warehouses/:id/inventory", requireAuth, requirePlatformPermission(Permission.MANAGE_WAREHOUSES), async (req, res) => {
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

    const inventory = await prisma.$transaction(async (tx) => {
      // Get old quantity for ledger diff
      const existing = await tx.warehouseInventory.findUnique({
        where: { warehouseId_productId: { warehouseId: id, productId } },
        select: { quantity: true },
      });
      const oldQty = existing?.quantity ?? 0;

      // Upsert inventory
      const inv = await tx.warehouseInventory.upsert({
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

      // Ledger entry for the stock change
      const diff = quantity - oldQty;
      if (diff !== 0) {
        await tx.inventoryLedger.create({
          data: {
            productId,
            change: diff,
            reason: existing ? "RESTOCK" : "INITIAL_STOCK",
            note: `Агуулахийн бүртгэл ${existing ? "шинэчилсэн" : "нэмсэн"}`,
          },
        });
      }

      // Sync Product.stock inside same tx
      await syncProductStock(tx, productId);

      return inv;
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
  requireAuth,
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
        name,
        description,
        sku,
        barcode,
        unit,
        price,
        costPrice,
        businessCategoryId,
        supplyType,
        preorderLeadTimeDays,
        preorderNote,
        isActive,
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

      const productUpdateData: any = {};
      if (name !== undefined) {
        const trimmedName = String(name).trim();
        if (!trimmedName) {
          return res.status(400).json({ message: "Барааны нэр хоосон байж болохгүй" });
        }
        productUpdateData.name = trimmedName;
      }
      if (description !== undefined) productUpdateData.description = description ? String(description).trim() : null;
      if (sku !== undefined) productUpdateData.sku = sku ? String(sku).trim() : null;
      if (barcode !== undefined) productUpdateData.barcode = barcode ? String(barcode).trim() : null;
      if (unit !== undefined) productUpdateData.unit = unit ? String(unit).trim() : null;
      if (price !== undefined) {
        const parsedPrice = Number(price);
        if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
          return res.status(400).json({ message: "Үнэ буруу байна" });
        }
        productUpdateData.price = parsedPrice;
      }
      if (costPrice !== undefined) {
        const parsedCostPrice = costPrice === null || costPrice === "" ? null : Number(costPrice);
        if (parsedCostPrice !== null && (!Number.isFinite(parsedCostPrice) || parsedCostPrice < 0)) {
          return res.status(400).json({ message: "Өртөг үнэ буруу байна" });
        }
        productUpdateData.costPrice = parsedCostPrice;
      }
      if (businessCategoryId !== undefined) productUpdateData.businessCategoryId = businessCategoryId || null;
      if (supplyType !== undefined) productUpdateData.supplyType = supplyType;
      if (preorderLeadTimeDays !== undefined) {
        const parsedLeadTime = preorderLeadTimeDays === null || preorderLeadTimeDays === ""
          ? null
          : Number(preorderLeadTimeDays);
        if (parsedLeadTime !== null && (!Number.isInteger(parsedLeadTime) || parsedLeadTime < 0 || parsedLeadTime > 365)) {
          return res.status(400).json({ message: "Ирэх хоног 0-365 хооронд байх ёстой" });
        }
        productUpdateData.preorderLeadTimeDays = parsedLeadTime;
      }
      if (preorderNote !== undefined) productUpdateData.preorderNote = preorderNote ? String(preorderNote).trim() : null;
      if (isActive !== undefined) productUpdateData.isActive = Boolean(isActive);

      const targetInventory = await prisma.warehouseInventory.findUnique({
        where: { warehouseId_productId: { warehouseId, productId } },
        select: { product: { select: { organizationId: true } } },
      });
      if (!targetInventory) {
        return res.status(404).json({ message: "Агуулахын бараа олдсонгүй" });
      }
      const permission = await assertOrgPermission(
        req,
        res,
        targetInventory.product.organizationId,
        Permission.MANAGE_STOCK,
      );
      if (!permission) return;

      const inventory = await prisma.$transaction(async (tx) => {
        // Get old quantity for ledger
        const oldInv = quantity !== undefined
          ? await tx.warehouseInventory.findUnique({
              where: { warehouseId_productId: { warehouseId, productId } },
              select: { quantity: true },
            })
          : null;

        if (Object.keys(productUpdateData).length > 0) {
          await tx.product.update({
            where: { id: productId },
            data: productUpdateData,
          });
        }

        const inv = await tx.warehouseInventory.update({
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
                description: true,
                sku: true,
                barcode: true,
                unit: true,
                price: true,
                costPrice: true,
                businessCategoryId: true,
                supplyType: true,
                preorderLeadTimeDays: true,
                preorderNote: true,
                isActive: true,
                images: {
                  select: { id: true, url: true },
                },
                businessCategory: {
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

        // Ledger + sync only when quantity changed
        if (quantity !== undefined && oldInv) {
          const diff = quantity - oldInv.quantity;
          if (diff !== 0) {
            await tx.inventoryLedger.create({
              data: {
                productId,
                change: diff,
                reason: "MANUAL_ADJUST",
                note: "Агуулахийн тоо хэмжээ шинэчилсэн",
              },
            });
          }
          await syncProductStock(tx, productId);
        }

        return inv;
      });

      res.json(inventory);
    } catch (error: any) {
      if (error?.code === "P2002") {
        return res.status(409).json({
          message: "Ижил SKU-тэй бараа аль хэдийн бүртгэлтэй байна",
        });
      }
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
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_WAREHOUSES),
  async (req, res) => {
    try {
      const { warehouseId, productId } = req.params;

      await prisma.$transaction(async (tx) => {
        // Get quantity before delete for ledger
        const existing = await tx.warehouseInventory.findUnique({
          where: { warehouseId_productId: { warehouseId, productId } },
          select: { quantity: true },
        });

        await tx.warehouseInventory.delete({
          where: {
            warehouseId_productId: {
              warehouseId,
              productId,
            },
          },
        });

        if (existing && existing.quantity !== 0) {
          await tx.inventoryLedger.create({
            data: {
              productId,
              change: -existing.quantity,
              reason: "MANUAL_ADJUST",
              note: "Агуулахийн бүртгэл устгасан",
            },
          });
        }

        // Sync Product.stock inside tx
        await syncProductStock(tx, productId);
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

/* ─── Multer config for Excel file upload ────────────────────────────── */
const excelUpload = multer({
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

/* ─── POST /warehouses/:id/products/import ──────────────────────────── *
 * Bulk import products from Excel into a warehouse.
 * Creates Product + WarehouseInventory + InventoryLedger per row.
 * Organisation resolved from warehouse's WarehouseOrganization link.
 * ──────────────────────────────────────────────────────────────────── */
router.post(
  "/warehouses/:id/products/import",
  excelUpload.single("file"),
  async (req, res) => {
    try {
      const warehouseId = req.params.id;

      // Verify warehouse exists and get its organization
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: warehouseId, deletedAt: null },
        include: { organizations: { select: { organizationId: true }, take: 1 } },
      });
      if (!warehouse) {
        return res.status(404).json({ message: "Агуулах олдсонгүй" });
      }

      const organizationId = warehouse.organizations[0]?.organizationId;
      if (!organizationId) {
        return res.status(400).json({ message: "Агуулахад байгууллага хуваарилагдаагүй байна" });
      }

      // Resolve businessCategoryId from organization
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

      // Extract embedded images
      const embeddedImages = await extractExcelImages(req.file.buffer);

      // Debug info
      let mediaFileCount = 0;
      let hasRichData = false;
      let hasDrawings = false;
      try {
        const z = await JSZip.loadAsync(req.file.buffer);
        const files = Object.keys(z.files);
        mediaFileCount = files.filter((f) => f.startsWith("xl/media/")).length;
        hasRichData = files.some((f) => f.includes("richData/richValueRel.xml"));
        hasDrawings = files.some((f) => /xl\/drawings\/drawing\d+\.xml$/.test(f));
      } catch { /* ignore */ }

      const colMap = PRODUCT_COL_MAP;

      const results: {
        created: number;
        updated: number;
        skipped: number;
        errors: string[];
        products: Array<{ id: string; name: string; sku: string | null; price: number; stock: number }>;
      } = { created: 0, updated: 0, skipped: 0, errors: [], products: [] };

      // Pre-scan: detect duplicate SKUs within the file
      const skusInFile = new Map<string, number>();
      const duplicateSkuRows = new Set<number>();
      for (let i = 0; i < rows.length; i++) {
        const sku = resolveCol(rows[i], colMap.sku);
        if (sku) {
          const normalized = String(sku).trim().toLowerCase();
          if (skusInFile.has(normalized)) {
            results.errors.push(`Мөр ${i + 2}: SKU "${String(sku).trim()}" файл дотор давхардсан (мөр ${skusInFile.get(normalized)})`);
            results.skipped++;
            duplicateSkuRows.add(i);
          } else {
            skusInFile.set(normalized, i + 2);
          }
        }
      }

      for (let i = 0; i < rows.length; i++) {
        if (duplicateSkuRows.has(i)) continue;

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

        try {
          // Parse image URLs from text column
          let imageUrls: string[] = imagesRaw
            ? String(imagesRaw).split(",").map((u) => u.trim()).filter((u) => u.startsWith("http")).slice(0, 5)
            : [];

          // Check for embedded images
          if (imageUrls.length === 0) {
            const rowBuffers = embeddedImages.get(i + 1);
            if (rowBuffers && rowBuffers.length > 0) {
              const uploadPromises = rowBuffers.slice(0, 5).map((buf) => uploadBufferToSupabase(buf));
              const uploaded = await Promise.all(uploadPromises);
              imageUrls = uploaded.filter((u): u is string => u !== null);
            }
          }

          const productData = {
            name: String(name).trim(),
            description: description ? String(description).trim() : null,
            price: priceNum,
            costPrice: costPriceNum,
            stock: stockNum,
            businessCategoryId: orgBusinessCategoryId,
            isActive: true,
          };

          // Create or update product + warehouse inventory in a transaction
          const result = await prisma.$transaction(async (tx) => {
            let product;
            let wasUpdate = false;

            if (normalizedSku) {
              // Free up SKU from any soft-deleted product
              await tx.product.updateMany({
                where: { organizationId, sku: normalizedSku, deletedAt: { not: null } },
                data: { sku: null },
              });

              const existing = await tx.product.findUnique({
                where: { organizationId_sku: { organizationId, sku: normalizedSku } },
                select: { id: true },
              });
              wasUpdate = !!existing;

              product = await tx.product.upsert({
                where: { organizationId_sku: { organizationId, sku: normalizedSku } },
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
              product = await tx.product.create({
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

            // Create or update warehouse inventory
            if (stockNum > 0) {
              const existingInv = await tx.warehouseInventory.findUnique({
                where: { warehouseId_productId: { warehouseId, productId: product.id } },
              });

              if (existingInv) {
                await tx.warehouseInventory.update({
                  where: { warehouseId_productId: { warehouseId, productId: product.id } },
                  data: {
                    quantity: stockNum,
                    lastRestockedAt: new Date(),
                  },
                });
              } else {
                await tx.warehouseInventory.create({
                  data: {
                    warehouseId,
                    productId: product.id,
                    quantity: stockNum,
                    minQuantity: 0,
                    lastRestockedAt: new Date(),
                  },
                });
              }

              // Ledger entry
              await tx.inventoryLedger.create({
                data: {
                  productId: product.id,
                  change: stockNum,
                  reason: wasUpdate ? "RESTOCK" : "INITIAL_STOCK",
                  note: "Excel импортоор нэмсэн",
                },
              });
            }

            // Sync product stock inside the same transaction (always, even if qty=0)
            await syncProductStock(tx, product.id);

            return { product, wasUpdate };
          });

          results.products.push({
            id: result.product.id,
            name: result.product.name,
            sku: result.product.sku,
            price: Number(result.product.price),
            stock: result.product.stock,
          });

          if (result.wasUpdate) {
            results.updated++;
          } else {
            results.created++;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          results.errors.push(`Мөр ${rowNum}: ${msg}`);
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
      console.error("warehouse import products error", error);
      return res.status(500).json({ message: "Excel импорт хийхэд алдаа гарлаа", error: String(error) });
    }
  }
);

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
      barcode,
      unit,
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
          barcode: barcode ? String(barcode).trim() : null,
          unit: unit ? String(unit).trim() : null,
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
