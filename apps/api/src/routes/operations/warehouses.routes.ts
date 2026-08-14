import { Router, type Router as ExpressRouter } from "express";
import crypto from "crypto";
import multer from "multer";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import {
  DeliverySourceType,
  InventoryReason,
  OrderStatus,
  PaymentStatus,
  Prisma,
  prisma,
  WarehouseType,
} from "@mgl/database";
import { Permission, hasPlatformPermission, isFullAdmin } from "@mgl/types";
import { requireAuth, requirePlatformPermission } from "../../middleware/auth";
import {
  extractExcelImages,
  uploadBufferToSupabase,
  PRODUCT_COL_MAP,
  PRODUCT_IMPORT_FILE_SIZE_LIMIT_BYTES,
  normalizeExcelRow,
  resolveCol,
  buildBusinessCategoryChoices,
  resolveBusinessCategoryIdFromChoices,
} from "../../lib/excel-import";
import {
  adjustStock,
  resolveOrgWarehouse,
  syncProductStock,
} from "../../services/inventory.service";
import {
  hasPlatformWarehouseAccess,
  hasWarehouseAccess,
} from "../../services/warehouse-access.service";
import {
  addMasterProductAlias,
  resolveMasterProduct,
} from "../../services/master-product.service";
import { getWarehouseAdminSummary } from "../../services/warehouse-admin-summary.service";
import {
  notifyAssignedOrderDelivery,
  routeOrderDelivery,
} from "../../services/delivery-routing.service";
import { parseDeliveryPackageDetails } from "../../services/delivery-package.service";
import { notifyCustomerOrderStage } from "../../services/order-notification.service";
import {
  buildProductSearchWhere,
  scoreProductForSearch,
} from "../../services/product-discovery.service";
import { getSalesStoreLocationSources } from "../../services/sales-store-portfolio.service";
import {
  CONTRACT_PAYMENT_ACCOUNTS_SETTING_KEY,
  readMinuPaymentAccounts,
} from "../../services/upgrade-minu.service";

const router: ExpressRouter = Router();

// The database enum keeps its historical names, while these aliases express
// the actual ownership boundary used by the applications.
const ADMIN_MANAGED_WAREHOUSE = WarehouseType.CENTRAL;
const PARTNER_MANAGED_WAREHOUSE = WarehouseType.VENDOR_INTERNAL;

const ONLINE_ORDER_STATUS_FLOW: Partial<Record<OrderStatus, OrderStatus>> = {
  [OrderStatus.CONFIRMED]: OrderStatus.PREPARING,
  [OrderStatus.PREPARING]: OrderStatus.PREPARED,
  [OrderStatus.PREPARED]: OrderStatus.SHIPPING,
};

function createDeliveryCode(): string {
  return String(crypto.randomInt(100000, 999999));
}

type ManualDispatchItemInput = {
  productId: string;
  quantity: number;
};

type DispatchAddressSuggestion = {
  address: string;
  recipientName: string | null;
  recipientPhone: string | null;
  lat: number | null;
  lng: number | null;
  lastUsedAt: Date;
};

class InsufficientWarehouseStockError extends Error {
  constructor(readonly productId: string) {
    super("Агуулахын үлдэгдэл хүрэлцэхгүй байна");
  }
}

function cleanOptionalText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function parseCoordinate(
  value: unknown,
  minimum: number,
  maximum: number,
): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}

function createManualDispatchNumber(): string {
  const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `WD-${timestamp}-${random}`;
}

async function assertWarehouseMutationPermission(
  req: Parameters<typeof requireAuth>[0],
  res: Parameters<typeof requireAuth>[1],
  warehouseId: string,
) {
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
            warehouseId,
            usedAt: { not: null },
          },
          select: { id: true },
        }),
      )
    : false;
  if (!platformAllowed && !operatorAllowed) {
    res.status(403).json({
      message: "Энэ агуулахын барааг өөрчлөх эрхгүй байна",
    });
    return false;
  }
  return true;
}

async function getAccessibleWarehouseIds(
  req: Parameters<typeof requireAuth>[0],
): Promise<string[]> {
  const actor = (
    req as typeof req & { user?: { userId?: string; role?: string } }
  ).user;
  if (!actor?.userId) return [];

  const where = {
    deletedAt: null,
    isActive: true,
    type: ADMIN_MANAGED_WAREHOUSE,
    ...(!hasPlatformWarehouseAccess(actor.role)
      ? {
          setupTokens: {
            some: { userId: actor.userId, usedAt: { not: null } },
          },
        }
      : {}),
  };
  const warehouses = await prisma.warehouse.findMany({
    where,
    select: { id: true },
  });
  return warehouses.map((warehouse) => warehouse.id);
}

async function assertWarehouseCategoryPermission(
  req: Parameters<typeof requireAuth>[0],
  res: Parameters<typeof requireAuth>[1],
) {
  const actor = (
    req as typeof req & { user?: { userId?: string; role?: string } }
  ).user;

  if (hasPlatformWarehouseAccess(actor?.role)) return true;

  const operatorAssignment = actor?.userId
    ? await prisma.warehouseSetupToken.findFirst({
        where: {
          userId: actor.userId,
          usedAt: { not: null },
          warehouse: {
            deletedAt: null,
            isActive: true,
            type: ADMIN_MANAGED_WAREHOUSE,
          },
        },
        select: { id: true },
      })
    : null;

  if (!operatorAssignment) {
    res.status(403).json({
      message: "Агуулахын ангилал үүсгэх эрхгүй байна",
    });
    return false;
  }

  return true;
}

async function getImportBusinessCategoryChoices() {
  const categories = await prisma.businessCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, parentId: true },
  });
  return buildBusinessCategoryChoices(categories);
}

// Warehouses created and operated by admins through the standalone WMS.
router.get("/warehouses", requireAuth, async (req, res) => {
  try {
    const { organizationId, isActive, summary } = req.query;
    const actor = (
      req as typeof req & { user?: { userId?: string; role?: string } }
    ).user;

    const where: any = {
      deletedAt: null,
      type: ADMIN_MANAGED_WAREHOUSE,
    };

    // Operators may only access the admin-managed warehouse explicitly assigned
    // during setup. Platform warehouse admins can see every admin-managed one.
    if (!hasPlatformWarehouseAccess(actor?.role)) {
      if (!actor?.userId) {
        return res.status(403).json({ message: "Агуулахын эрх олдсонгүй" });
      }
      where.setupTokens = {
        some: { userId: actor.userId, usedAt: { not: null } },
      };
    }

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

    const inventoryStats =
      summary === "true" && warehouses.length > 0
        ? await prisma.warehouseInventory.findMany({
            where: { warehouseId: { in: warehouses.map(({ id }) => id) } },
            select: { warehouseId: true, quantity: true, minQuantity: true },
          })
        : [];
    const statsByWarehouse = new Map<
      string,
      {
        totalProducts: number;
        totalQuantity: number;
        lowStockCount: number;
        outOfStockCount: number;
      }
    >();
    for (const inventory of inventoryStats) {
      const current = statsByWarehouse.get(inventory.warehouseId) ?? {
        totalProducts: 0,
        totalQuantity: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
      };
      current.totalProducts += 1;
      current.totalQuantity += inventory.quantity;
      if (inventory.quantity === 0) current.outOfStockCount += 1;
      else if (inventory.quantity <= inventory.minQuantity)
        current.lowStockCount += 1;
      statsByWarehouse.set(inventory.warehouseId, current);
    }

    // Transform to include organizations array and optional lightweight stock summary.
    const result = warehouses.map((w: (typeof warehouses)[number]) => ({
      ...w,
      organizations: w.organizations.map(
        (wo: (typeof w.organizations)[number]) => wo.organization,
      ),
      ...(summary === "true"
        ? {
            summary: statsByWarehouse.get(w.id) ?? {
              totalProducts: 0,
              totalQuantity: 0,
              lowStockCount: 0,
              outOfStockCount: 0,
            },
          }
        : {}),
      createdBy: w.createdBy
        ? {
            id: w.createdBy.id,
            name: w.createdBy.profile?.fullName || w.createdBy.email,
          }
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

// Warehouse operators may select an account, but never receive its password.
router.get("/warehouses/payment-accounts", requireAuth, async (req, res) => {
  const warehouseIds = await getAccessibleWarehouseIds(req);
  if (warehouseIds.length === 0) {
    return res.status(403).json({ message: "Агуулахын эрх олдсонгүй" });
  }
  const setting = await prisma.siteSetting.findUnique({
    where: { key: CONTRACT_PAYMENT_ACCOUNTS_SETTING_KEY },
    select: { value: true },
  });
  const accounts = readMinuPaymentAccounts(setting?.value).map((account) => ({
    id: account.id,
    merchantCode: account.merchantCode,
  }));
  return res.json({ accounts });
});

router.put(
  "/warehouses/:id/payment-account",
  requireAuth,
  async (req, res) => {
    const { id } = req.params;
    if (!(await assertWarehouseMutationPermission(req, res, id))) return;
    const accountId =
      typeof req.body?.accountId === "string" ? req.body.accountId.trim() : "";
    if (accountId) {
      const setting = await prisma.siteSetting.findUnique({
        where: { key: CONTRACT_PAYMENT_ACCOUNTS_SETTING_KEY },
        select: { value: true },
      });
      if (!readMinuPaymentAccounts(setting?.value).some((a) => a.id === accountId)) {
        return res.status(400).json({ message: "Сонгосон Minu данс олдсонгүй" });
      }
    }
    const warehouse = await prisma.warehouse.update({
      where: { id },
      data: { paymentAccountId: accountId || null },
      select: { id: true, paymentAccountId: true },
    });
    return res.json(warehouse);
  },
);

// Unified delivery destinations for WMS operators. MGL Business registers
// stores as SalesVisitLocation records, while admin-managed stores use Branch.
// Keep this merge on the server so WMS clients receive one deduplicated source.
router.get("/warehouses/store-locations", requireAuth, async (req, res) => {
  try {
    const accessibleWarehouseIds = await getAccessibleWarehouseIds(req);
    if (accessibleWarehouseIds.length === 0) {
      return res.status(403).json({
        message: "Дэлгүүрийн байршил харах агуулахын эрх олдсонгүй",
      });
    }

    const locations = await getSalesStoreLocationSources("");
    return res.json({
      stores: locations.map((location) => ({
        id: location.id,
        name: location.name,
        address: location.address,
        lat: location.latitude,
        lng: location.longitude,
        contactName: location.contactName,
        contactPhone: location.contactPhone,
        locationSource: location.locationSource,
        organization: {
          id: location.vendorOrganization.id,
          name: location.vendorOrganization.name,
        },
      })),
    });
  } catch (error) {
    console.error("get warehouse store locations error", error);
    return res.status(500).json({
      message: "Дэлгүүрийн байршлуудыг татахад алдаа гарлаа",
    });
  }
});

router.get("/warehouse-online-orders", requireAuth, async (req, res) => {
  try {
    const warehouseIds = await getAccessibleWarehouseIds(req);
    if (warehouseIds.length === 0) {
      return res.status(403).json({ message: "Агуулахын эрх олдсонгүй" });
    }

    const status =
      typeof req.query.status === "string" ? req.query.status : undefined;
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    const take = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);

    const orders = await prisma.order.findMany({
      where: {
        deletedAt: null,
        paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.PAID] },
        ...(status &&
        Object.values(OrderStatus).includes(status as OrderStatus)
          ? { status: status as OrderStatus }
          : {
              status: {
                in: [
                  OrderStatus.PENDING,
                  OrderStatus.CONFIRMED,
                  OrderStatus.PREPARING,
                  OrderStatus.PREPARED,
                  OrderStatus.SHIPPING,
                  OrderStatus.COMPLETED,
                ],
              },
            }),
        ...(search
          ? {
              OR: [
                { orderNumber: { contains: search, mode: "insensitive" } },
                { phone: { contains: search } },
                {
                  items: {
                    some: {
                      productName: { contains: search, mode: "insensitive" },
                    },
                  },
                },
              ],
            }
          : {}),
        items: {
          some: {
            product: { managedByWarehouseId: { in: warehouseIds } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        organization: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true, address: true } },
        payments: {
          where: { status: "PAID" },
          orderBy: { paidAt: "desc" },
          take: 1,
          select: {
            method: true,
            status: true,
            amount: true,
            providerRef: true,
            paidAt: true,
          },
        },
        customer: {
          select: {
            id: true,
            email: true,
            profile: { select: { fullName: true, phoneNumber: true } },
          },
        },
        delivery: {
          select: {
            id: true,
            status: true,
            packageCount: true,
            totalWeightKg: true,
            packageLengthCm: true,
            packageWidthCm: true,
            packageHeightCm: true,
            sizeCategory: true,
            isFragile: true,
            handlingInstructions: true,
            readyAt: true,
            partnershipId: true,
            providerOrganization: { select: { id: true, name: true } },
            courier: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: { fullName: true, phoneNumber: true },
                },
              },
            },
          },
        },
        items: {
          select: {
            id: true,
            productName: true,
            quantity: true,
            price: true,
            subtotal: true,
            product: {
              select: {
                id: true,
                sku: true,
                barcode: true,
                unit: true,
                managedByWarehouseId: true,
                images: { select: { url: true }, take: 1 },
              },
            },
          },
        },
      },
    });

    const visibleOrders = orders
      .map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        isOrderRequest:
          order.status === OrderStatus.PENDING &&
          order.paymentStatus === PaymentStatus.PENDING,
        paymentMethod: order.paymentMethod,
        subtotal: Number(order.subtotal),
        discountAmount: Number(order.discountAmount),
        deliveryFee: Number(order.deliveryFee),
        total: Number(order.total),
        phone: order.phone,
        shippingAddress: order.shippingAddress,
        note: order.note,
        createdAt: order.createdAt.toISOString(),
        customerLocation:
          order.customerLat !== null && order.customerLng !== null
            ? { lat: order.customerLat, lng: order.customerLng }
            : null,
        payment: order.payments[0]
          ? {
              ...order.payments[0],
              amount: Number(order.payments[0].amount),
              paidAt: order.payments[0].paidAt?.toISOString() || null,
            }
          : null,
        organization: order.organization,
        branch: order.branch,
        customer: {
          id: order.customer.id,
          name: order.customer.profile?.fullName || order.customer.email,
          email: order.customer.email,
          phone: order.customer.profile?.phoneNumber || order.phone,
        },
        delivery: order.delivery
          ? {
              ...order.delivery,
              totalWeightKg: order.delivery.totalWeightKg
                ? Number(order.delivery.totalWeightKg)
                : null,
              packageLengthCm: order.delivery.packageLengthCm
                ? Number(order.delivery.packageLengthCm)
                : null,
              packageWidthCm: order.delivery.packageWidthCm
                ? Number(order.delivery.packageWidthCm)
                : null,
              packageHeightCm: order.delivery.packageHeightCm
                ? Number(order.delivery.packageHeightCm)
                : null,
              readyAt: order.delivery.readyAt?.toISOString() || null,
            }
          : null,
        items: order.items
          .filter((item) =>
            warehouseIds.includes(item.product.managedByWarehouseId || ""),
          )
          .map((item) => ({
            id: item.id,
            productId: item.product.id,
            name: item.productName,
            sku: item.product.sku,
            barcode: item.product.barcode,
            unit: item.product.unit,
            imageUrl: item.product.images[0]?.url || null,
            quantity: item.quantity,
            price: Number(item.price),
            subtotal: Number(item.subtotal),
          })),
      }))
      .filter((order) => order.items.length > 0);

    return res.json({ orders: visibleOrders, total: visibleOrders.length });
  } catch (error) {
    console.error("warehouse online orders error", error);
    return res
      .status(500)
      .json({ message: "Онлайн захиалга авахад алдаа гарлаа" });
  }
});

router.patch(
  "/warehouse-online-orders/:orderId/status",
  requireAuth,
  async (req, res) => {
    try {
      const actor = (
        req as typeof req & { user?: { userId?: string; role?: string } }
      ).user;
      if (!actor?.userId) {
        return res.status(403).json({ message: "Агуулахын эрх олдсонгүй" });
      }
      const warehouseIds = await getAccessibleWarehouseIds(req);
      const order = await prisma.order.findFirst({
        where: {
          id: req.params.orderId,
          deletedAt: null,
          paymentStatus: "PAID",
          items: {
            some: {
              product: { managedByWarehouseId: { in: warehouseIds } },
            },
          },
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
        },
      });
      if (!order) {
        return res.status(404).json({ message: "Захиалга олдсонгүй" });
      }

      const nextStatus = ONLINE_ORDER_STATUS_FLOW[order.status];
      if (!nextStatus) {
        return res.status(409).json({
          message: `"${order.status}" төлвөөс агуулах шилжүүлэх боломжгүй`,
        });
      }

      const parsedPackage =
        nextStatus === OrderStatus.SHIPPING
          ? parseDeliveryPackageDetails(req.body)
          : null;
      if (parsedPackage?.error) {
        return res.status(400).json({
          code: "DELIVERY_PACKAGE_DETAILS_REQUIRED",
          message:
            "Хайрцгийн тоо, жин, урт, өргөн, өндөр болон оворын ангиллыг бүрэн оруулна уу.",
        });
      }
      const deliveryCode =
        nextStatus === OrderStatus.SHIPPING ? createDeliveryCode() : undefined;

      const assignment = await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: nextStatus, ...(deliveryCode ? { deliveryCode } : {}) },
        });
        await tx.orderHistory.create({
          data: {
            orderId: order.id,
            fromStatus: order.status,
            toStatus: nextStatus,
            changedById: actor.userId!,
            note:
              nextStatus === OrderStatus.PREPARING
                ? "Агуулах барааг бэлтгэж эхэлсэн"
                : nextStatus === OrderStatus.PREPARED
                  ? "Агуулах барааг бэлтгэж дууссан"
                  : "Агуулах багцын мэдээллийг баталж хүргэлтэд шилжүүлсэн",
          },
        });
        if (nextStatus !== OrderStatus.SHIPPING) return null;

        const delivery = await routeOrderDelivery(tx, {
          orderId: order.id,
          sourceType: DeliverySourceType.WEBSITE_ORDER,
        });
        const updated = await tx.delivery.update({
          where: { id: delivery.id },
          data: {
            ...parsedPackage?.data,
            handlingInstructions:
              parsedPackage?.data?.handlingInstructions || null,
            readyAt: new Date(),
          },
          select: { id: true, courierId: true },
        });
        return updated;
      });

      if (assignment) {
        await notifyAssignedOrderDelivery({
          courierId: assignment.courierId,
          deliveryId: assignment.id,
          orderNumber: order.orderNumber,
        });
      }
      if (nextStatus === OrderStatus.PREPARING) {
        await notifyCustomerOrderStage(order.id, "PREPARING", {
          email: true,
        }).catch((error: unknown) => {
          console.error("Warehouse preparing notification failed", error);
        });
      }

      return res.json({
        orderId: order.id,
        previousStatus: order.status,
        newStatus: nextStatus,
      });
    } catch (error) {
      console.error("warehouse online order status error", error);
      return res
        .status(500)
        .json({ message: "Захиалгын төлөв шинэчлэхэд алдаа гарлаа" });
    }
  },
);

router.get(
  "/warehouse-delivery-assignment-options",
  requireAuth,
  async (req, res) => {
    try {
      const warehouseIds = await getAccessibleWarehouseIds(req);
      if (warehouseIds.length === 0) {
        return res.status(403).json({ message: "Агуулахын эрх олдсонгүй" });
      }
      const partnerships = await prisma.deliveryPartnership.findMany({
        where: {
          warehouseId: { in: warehouseIds },
          status: "ACCEPTED",
        },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          warehouseId: true,
          providerOrganization: { select: { id: true, name: true } },
          courierAssignments: {
            where: {
              isActive: true,
              courier: { isActive: true, deletedAt: null },
            },
            orderBy: { createdAt: "asc" },
            select: {
              courier: {
                select: {
                  id: true,
                  email: true,
                  profile: {
                    select: { fullName: true, phoneNumber: true },
                  },
                  deliveryDriverProfile: {
                    select: { vehiclePlateNumber: true },
                  },
                },
              },
            },
          },
        },
      });
      return res.json({
        partnerships: partnerships.map((partnership) => ({
          id: partnership.id,
          warehouseId: partnership.warehouseId,
          provider: partnership.providerOrganization,
          couriers: partnership.courierAssignments.map(
            (assignment) => assignment.courier,
          ),
        })),
      });
    } catch (error) {
      console.error("warehouse delivery assignment options error", error);
      return res
        .status(500)
        .json({ message: "Хүргэлтийн сонголт авахад алдаа гарлаа" });
    }
  },
);

router.patch(
  "/warehouse-online-orders/:orderId/assignment",
  requireAuth,
  async (req, res) => {
    try {
      const warehouseIds = await getAccessibleWarehouseIds(req);
      const partnershipId =
        typeof req.body.partnershipId === "string"
          ? req.body.partnershipId
          : "";
      const courierId =
        typeof req.body.courierId === "string" ? req.body.courierId : "";
      if (!partnershipId || !courierId) {
        return res
          .status(400)
          .json({ message: "Хүргэлтийн компани болон хүргэгч сонгоно уу" });
      }

      const [delivery, partnership] = await Promise.all([
        prisma.delivery.findFirst({
          where: {
            orderId: req.params.orderId,
            sourceType: DeliverySourceType.WEBSITE_ORDER,
            readyAt: { not: null },
            order: {
              items: {
                some: {
                  product: { managedByWarehouseId: { in: warehouseIds } },
                },
              },
            },
          },
          select: { id: true, order: { select: { orderNumber: true } } },
        }),
        prisma.deliveryPartnership.findFirst({
          where: {
            id: partnershipId,
            warehouseId: { in: warehouseIds },
            status: "ACCEPTED",
          },
          select: {
            id: true,
            warehouseId: true,
            providerOrganizationId: true,
            courierAssignments: {
              where: { courierId, isActive: true },
              select: { id: true },
              take: 1,
            },
          },
        }),
      ]);
      if (!delivery) {
        return res.status(409).json({
          message:
            "Багцын мэдээллийг баталж хүргэлтийн ажил үүсгэсний дараа хуваарилна.",
        });
      }
      if (!partnership || partnership.courierAssignments.length === 0) {
        return res.status(400).json({
          message:
            "Сонгосон компани эсвэл хүргэгч энэ агуулахад идэвхтэй бүртгэлгүй байна",
        });
      }

      const updated = await prisma.delivery.update({
        where: { id: delivery.id },
        data: {
          partnershipId: partnership.id,
          providerOrganizationId: partnership.providerOrganizationId,
          warehouseId: partnership.warehouseId,
          courierId,
        },
        select: {
          id: true,
          providerOrganization: { select: { id: true, name: true } },
          courier: {
            select: {
              id: true,
              email: true,
              profile: { select: { fullName: true, phoneNumber: true } },
            },
          },
        },
      });
      await notifyAssignedOrderDelivery({
        courierId,
        deliveryId: updated.id,
        orderNumber: delivery.order?.orderNumber || req.params.orderId,
      });
      return res.json(updated);
    } catch (error) {
      console.error("warehouse online order assignment error", error);
      return res
        .status(500)
        .json({ message: "Хүргэлт хуваарилахад алдаа гарлаа" });
    }
  },
);

router.get("/warehouse-notifications", requireAuth, async (req, res) => {
  try {
    const actor = (
      req as typeof req & { user?: { userId?: string; role?: string } }
    ).user;
    if (!actor?.userId) {
      return res.status(403).json({ message: "Агуулахын эрх олдсонгүй" });
    }

    const warehouseWhere: any = {
      deletedAt: null,
      isActive: true,
      type: ADMIN_MANAGED_WAREHOUSE,
    };
    if (!hasPlatformWarehouseAccess(actor.role)) {
      warehouseWhere.setupTokens = {
        some: { userId: actor.userId, usedAt: { not: null } },
      };
    }

    const warehouses = await prisma.warehouse.findMany({
      where: warehouseWhere,
      select: { id: true },
      take: 25,
    });
    const warehouseIds = warehouses.map((warehouse) => warehouse.id);
    if (warehouseIds.length === 0) {
      return res.json({ notifications: [], generatedAt: new Date().toISOString() });
    }

    const expiryLimit = new Date();
    expiryLimit.setDate(expiryLimit.getDate() + 7);

    const [inventoryCandidates, pendingRequests, expiringInventory, paidOrders] =
      await Promise.all([
        prisma.warehouseInventory.findMany({
          where: {
            warehouseId: { in: warehouseIds },
            OR: [{ quantity: 0 }, { minQuantity: { gt: 0 } }],
          },
          orderBy: [{ quantity: "asc" }, { updatedAt: "desc" }],
          take: 100,
          select: {
            id: true,
            quantity: true,
            minQuantity: true,
            updatedAt: true,
            warehouse: { select: { name: true } },
            product: { select: { name: true, sku: true } },
          },
        }),
        prisma.warehouseStockRequest.findMany({
          where: {
            warehouseId: { in: warehouseIds },
            status: "PENDING",
          },
          orderBy: { requestedAt: "desc" },
          take: 10,
          select: {
            id: true,
            requestNumber: true,
            requestedAt: true,
            organization: { select: { name: true } },
          },
        }),
        prisma.warehouseInventory.findMany({
          where: {
            warehouseId: { in: warehouseIds },
            quantity: { gt: 0 },
            expiryDate: { gte: new Date(), lte: expiryLimit },
          },
          orderBy: { expiryDate: "asc" },
          take: 10,
          select: {
            id: true,
            expiryDate: true,
            warehouse: { select: { name: true } },
            product: { select: { name: true, sku: true } },
          },
        }),
        prisma.order.findMany({
          where: {
            deletedAt: null,
            paymentStatus: "PAID",
            status: OrderStatus.CONFIRMED,
            items: {
              some: {
                product: { managedByWarehouseId: { in: warehouseIds } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            orderNumber: true,
            createdAt: true,
            items: {
              where: {
                product: { managedByWarehouseId: { in: warehouseIds } },
              },
              select: { quantity: true },
            },
            payments: {
              where: { status: "PAID" },
              orderBy: { paidAt: "desc" },
              take: 1,
              select: { paidAt: true },
            },
          },
        }),
      ]);

    const stockNotifications = inventoryCandidates
      .filter(
        (item) =>
          item.quantity === 0 ||
          (item.minQuantity > 0 && item.quantity <= item.minQuantity),
      )
      .slice(0, 10)
      .map((item) => ({
        id: `stock:${item.id}:${item.quantity}`,
        type: item.quantity === 0 ? "OUT_OF_STOCK" : "LOW_STOCK",
        severity: item.quantity === 0 ? "critical" : "warning",
        title:
          item.quantity === 0
            ? "Барааны нөөц дууссан"
            : "Барааны нөөц багассан",
        message:
          item.quantity === 0
            ? `${item.product.name} — үлдэгдэл дууссан`
            : `${item.product.name} — ${item.quantity}/${item.minQuantity} үлдэгдэл`,
        detail: `${item.warehouse.name}${item.product.sku ? ` · ${item.product.sku}` : ""}`,
        href: "/inventory?status=low",
        occurredAt: item.updatedAt.toISOString(),
      }));

    const requestNotifications = pendingRequests.map((request) => ({
      id: `request:${request.id}`,
      type: "STOCK_REQUEST",
      severity: "info",
      title: "Шинэ барааны хүсэлт",
      message: `${request.organization.name} · ${request.requestNumber}`,
      detail: "Хянаж шийдвэрлэх шаардлагатай",
      href: "/dispatch-orders",
      occurredAt: request.requestedAt.toISOString(),
    }));

    const expiryNotifications = expiringInventory.map((item) => ({
      id: `expiry:${item.id}:${item.expiryDate?.toISOString()}`,
      type: "EXPIRING",
      severity: "warning",
      title: "Хугацаа дуусах гэж байна",
      message: item.product.name,
      detail: `${item.warehouse.name}${item.product.sku ? ` · ${item.product.sku}` : ""}`,
      href: "/inventory?status=expiring",
      occurredAt: item.expiryDate?.toISOString() || new Date().toISOString(),
    }));

    const orderNotifications = paidOrders.map((order) => {
      const itemCount = order.items.reduce(
        (total, item) => total + item.quantity,
        0,
      );
      return {
        id: `online-order:${order.id}`,
        type: "ONLINE_ORDER",
        severity: "info",
        title: "Шинэ онлайн захиалга",
        message: `${order.orderNumber} · ${itemCount} ширхэг бараа`,
        detail: "Төлбөр баталгаажсан · Бэлтгэх шаардлагатай",
        href: "/online-orders",
        occurredAt: (
          order.payments[0]?.paidAt || order.createdAt
        ).toISOString(),
      };
    });

    const notifications = [
      ...orderNotifications,
      ...stockNotifications,
      ...requestNotifications,
      ...expiryNotifications,
    ]
      .sort(
        (left, right) =>
          new Date(right.occurredAt).getTime() -
          new Date(left.occurredAt).getTime(),
      )
      .slice(0, 20);

    res.setHeader("Cache-Control", "private, max-age=15");
    return res.json({
      notifications,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("warehouse notifications error", error);
    return res.status(500).json({ message: "Мэдэгдэл авахад алдаа гарлаа" });
  }
});

// Get partner-managed warehouses for that organization's own portal.
router.get("/warehouses/organization/:orgId", requireAuth, async (req, res) => {
  try {
    const { orgId } = req.params;
    const actor = (
      req as typeof req & { user?: { userId?: string; role?: string } }
    ).user;

    if (!hasPlatformWarehouseAccess(actor?.role)) {
      const hasOrganizationAccess = actor?.userId
        ? await prisma.organizationMember.findFirst({
            where: {
              userId: actor.userId,
              organizationId: orgId,
              isActive: true,
            },
            select: { id: true },
          })
        : null;
      if (!hasOrganizationAccess) {
        return res.status(403).json({
          message: "Энэ байгууллагын агуулахыг харах эрхгүй байна",
        });
      }
    }

    const warehouses = await prisma.warehouse.findMany({
      where: {
        type: PARTNER_MANAGED_WAREHOUSE,
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

// Admin-managed central warehouses from which this organization may order stock.
// This is intentionally separate from the organization's own VENDOR_INTERNAL
// warehouses returned above: ownership and procurement are different workflows.
router.get(
  "/warehouses/organization/:orgId/order-sources",
  requireAuth,
  async (req, res) => {
    try {
      const { orgId } = req.params;
      const actor = (
        req as typeof req & { user?: { userId?: string; role?: string } }
      ).user;

      if (!hasPlatformWarehouseAccess(actor?.role)) {
        const membership = actor?.userId
          ? await prisma.organizationMember.findFirst({
              where: {
                userId: actor.userId,
                organizationId: orgId,
                isActive: true,
              },
              select: { id: true },
            })
          : null;
        if (!membership) {
          return res.status(403).json({
            message: "Энэ байгууллагын захиалгын агуулахыг харах эрхгүй байна",
          });
        }
      }

      const warehouses = await prisma.warehouse.findMany({
        where: {
          type: ADMIN_MANAGED_WAREHOUSE,
          organizations: { some: { organizationId: orgId } },
          deletedAt: null,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          district: true,
          phone: true,
        },
        orderBy: [{ name: "asc" }],
      });

      return res.json(warehouses);
    } catch (error) {
      console.error("get stock order source warehouses error", error);
      return res.status(500).json({
        message: "Захиалга авах төв агуулахуудыг татахад алдаа гарлаа",
      });
    }
  },
);

// Create warehouse (Admin creates)
router.post(
  "/warehouses",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_WAREHOUSES),
  async (req, res) => {
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
          type: ADMIN_MANAGED_WAREHOUSE,
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
        organizations: warehouse.organizations.map(
          (wo: (typeof warehouse.organizations)[number]) => wo.organization,
        ),
      });
    } catch (error) {
      console.error("create warehouse error", error);
      res.status(500).json({
        message: "Агуулах үүсгэхэд алдаа гарлаа",
      });
    }
  },
);

// Update warehouse
router.patch(
  "/warehouses/:id",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_WAREHOUSES),
  async (req, res) => {
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
        organizations: updated.organizations.map(
          (wo: (typeof updated.organizations)[number]) => wo.organization,
        ),
      });
    } catch (error) {
      console.error("update warehouse error", error);
      res.status(500).json({
        message: "Агуулах шинэчлэхэд алдаа гарлаа",
      });
    }
  },
);

// Assign/update organizations for a warehouse (Admin)
router.post(
  "/warehouses/:id/assign",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_WAREHOUSES),
  async (req, res) => {
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
        organizations: updated.organizations.map(
          (wo: (typeof updated.organizations)[number]) => wo.organization,
        ),
      });
    } catch (error) {
      console.error("assign warehouse error", error);
      res.status(500).json({
        message: "Агуулах оноохд алдаа гарлаа",
      });
    }
  },
);

// Delete warehouse (soft delete)
router.delete(
  "/warehouses/:id",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_WAREHOUSES),
  async (req, res) => {
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
  },
);
// Lightweight admin view backed by aggregate queries in the service layer.
router.get(
  "/warehouses/:id/admin-summary",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_WAREHOUSES),
  async (req, res) => {
    try {
      const summary = await getWarehouseAdminSummary(req.params.id);
      if (!summary) {
        return res.status(404).json({ message: "Агуулах олдсонгүй" });
      }
      return res.json(summary);
    } catch (error) {
      console.error("get warehouse admin summary error", error);
      return res.status(500).json({
        message: "Агуулахын хураангуй мэдээлэл авахад алдаа гарлаа",
      });
    }
  },
);
router.get("/warehouses/:id/detail", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const actor = (
      req as typeof req & { user?: { userId?: string; role?: string } }
    ).user;
    if (!(await hasWarehouseAccess(actor, id))) {
      return res.status(403).json({
        message: "Энэ агуулахын мэдээллийг харах эрхгүй байна",
      });
    }

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
        setupTokens: {
          orderBy: { createdAt: "desc" },
          select: {
            createdAt: true,
            expiresAt: true,
            usedAt: true,
            user: {
              select: {
                id: true,
                email: true,
                registerNumber: true,
                isActive: true,
                lastLoginAt: true,
                createdAt: true,
                profile: {
                  select: {
                    fullName: true,
                    phoneNumber: true,
                    avatarUrl: true,
                  },
                },
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
      (sum: number, inv: (typeof warehouse.inventories)[number]) =>
        sum + inv.quantity,
      0,
    );
    const lowStockItems = warehouse.inventories.filter(
      (inv: (typeof warehouse.inventories)[number]) =>
        inv.quantity <= inv.minQuantity,
    ).length;

    const employeesById = new Map<
      string,
      {
        id: string;
        fullName: string;
        email: string;
        phoneNumber: string | null;
        avatarUrl: string | null;
        operatorId: string | null;
        isActive: boolean;
        lastLoginAt: Date | null;
        assignedAt: Date;
        setupCompletedAt: Date | null;
        setupExpiresAt: Date;
      }
    >();
    for (const setupToken of warehouse.setupTokens) {
      if (employeesById.has(setupToken.user.id)) continue;
      employeesById.set(setupToken.user.id, {
        id: setupToken.user.id,
        fullName: setupToken.user.profile?.fullName || "Нэр оруулаагүй",
        email: setupToken.user.email,
        phoneNumber: setupToken.user.profile?.phoneNumber || null,
        avatarUrl: setupToken.user.profile?.avatarUrl || null,
        operatorId: setupToken.user.registerNumber || null,
        isActive: setupToken.user.isActive,
        lastLoginAt: setupToken.user.lastLoginAt,
        assignedAt: setupToken.createdAt,
        setupCompletedAt: setupToken.usedAt,
        setupExpiresAt: setupToken.expiresAt,
      });
    }
    const responsibleEmployees = Array.from(employeesById.values());

    const { setupTokens: _setupTokens, ...warehouseDetail } = warehouse;

    res.json({
      ...warehouseDetail,
      organizations: warehouse.organizations.map(
        (wo: (typeof warehouse.organizations)[number]) => wo.organization,
      ),
      responsibleEmployees,
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
router.patch(
  "/warehouses/:id/inventory/:invId/show-on-web",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_WAREHOUSES),
  async (req, res) => {
    try {
      const { invId } = req.params;
      const existing = await (prisma.warehouseInventory as any).findUnique({
        where: { id: invId },
      });
      if (!existing)
        return res.status(404).json({ message: "Бараа олдсонгүй" });

      const updated = await (prisma.warehouseInventory as any).update({
        where: { id: invId },
        data: { showOnWeb: !existing.showOnWeb },
        select: { id: true, showOnWeb: true },
      });
      return res.json(updated);
    } catch (error) {
      console.error("toggle showOnWeb error", error);
      return res
        .status(500)
        .json({ message: "Алдаа гарлаа", error: String(error) });
    }
  },
);

// Lightweight inventory catalog for the WMS inventory screen.
router.get("/warehouses/:id/inventory", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const actor = (
      req as typeof req & { user?: { userId?: string; role?: string } }
    ).user;
    if (!(await hasWarehouseAccess(actor, id))) {
      return res.status(403).json({
        message: "Энэ агуулахын барааг харах эрхгүй байна",
      });
    }

    const page = Math.max(
      1,
      Number.parseInt(String(req.query.page ?? "1"), 10) || 1,
    );
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(String(req.query.limit ?? "20"), 10) || 20),
    );
    const search = String(req.query.search ?? "")
      .trim()
      .slice(0, 100);
    const smartSearch = search.length > 0 && req.query.smartSearch === "true";
    const status = String(req.query.status ?? "all");
    const baseWhere: Prisma.WarehouseInventoryWhereInput = {
      warehouseId: id,
      product: { deletedAt: null },
    };
    const where: Prisma.WarehouseInventoryWhereInput = {
      ...baseWhere,
      ...(search
        ? {
            OR: [
              { product: { OR: buildProductSearchWhere(search) } },
              { location: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(status === "out"
        ? { quantity: 0 }
        : status === "low"
          ? {
              quantity: {
                gt: 0,
                lte: prisma.warehouseInventory.fields.minQuantity,
              },
            }
          : status === "healthy"
            ? {
                quantity: {
                  gt: prisma.warehouseInventory.fields.minQuantity,
                },
              }
            : {}),
    };

    const [
      rawRecords,
      total,
      totalCount,
      outCount,
      lowCount,
      stockAggregate,
      locatedCount,
    ] = await Promise.all([
      prisma.warehouseInventory.findMany({
        where,
        select: {
          id: true,
          quantity: true,
          minQuantity: true,
          maxQuantity: true,
          location: true,
          batchNumber: true,
          expiryDate: true,
          note: true,
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
              businessCategory: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  parent: { select: { id: true, name: true, slug: true } },
                },
              },
              organization: { select: { id: true, name: true } },
              supplyType: true,
              preorderLeadTimeDays: true,
              preorderNote: true,
              isActive: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip: smartSearch ? 0 : (page - 1) * limit,
        take: smartSearch ? Math.min(Math.max(limit * 8, 60), 200) : limit,
      }),
      prisma.warehouseInventory.count({ where }),
      prisma.warehouseInventory.count({ where: baseWhere }),
      prisma.warehouseInventory.count({ where: { ...baseWhere, quantity: 0 } }),
      prisma.warehouseInventory.count({
        where: {
          ...baseWhere,
          quantity: {
            gt: 0,
            lte: prisma.warehouseInventory.fields.minQuantity,
          },
        },
      }),
      prisma.warehouseInventory.aggregate({
        where: baseWhere,
        _sum: { quantity: true },
      }),
      prisma.warehouseInventory.count({
        where: { ...baseWhere, location: { not: null } },
      }),
    ]);

    const records = smartSearch
      ? rawRecords
          .map((record) => ({
            record,
            score: scoreProductForSearch(record.product, search),
          }))
          .filter(({ score }) => score > 0)
          .sort(
            (left, right) =>
              right.score - left.score ||
              right.record.quantity - left.record.quantity,
          )
          .slice(0, limit)
          .map(({ record }) => record)
      : rawRecords;

    // Fetch images in one batch. A limited nested image relation per inventory
    // row produces an expensive lateral query on large warehouses.
    const productIds = records.map((record) => record.product.id);
    const productImages = productIds.length
      ? await prisma.productImage.findMany({
          where: { productId: { in: productIds } },
          select: { id: true, url: true, productId: true },
        })
      : [];
    const imagesByProductId = new Map<
      string,
      Array<{ id: string; url: string }>
    >();
    for (const image of productImages) {
      const images = imagesByProductId.get(image.productId) ?? [];
      if (images.length < 5) {
        images.push({ id: image.id, url: image.url });
        imagesByProductId.set(image.productId, images);
      }
    }

    const inventory = records.map((record) => ({
      ...record,
      product: {
        ...record.product,
        images: imagesByProductId.get(record.product.id) ?? [],
      },
    }));

    res.setHeader("Cache-Control", "private, max-age=15");
    return res.json({
      inventory,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      summary: {
        total: totalCount,
        healthy: totalCount - outCount - lowCount,
        low: lowCount,
        out: outCount,
        totalStock: stockAggregate._sum.quantity ?? 0,
        located: locatedCount,
      },
    });
  } catch (error) {
    console.error("get warehouse inventory catalog error", error);
    return res.status(500).json({
      message: "Агуулахын бараа татахад алдаа гарлаа",
    });
  }
});

// Add/Update inventory for a warehouse
router.post(
  "/warehouses/:id/inventory",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_WAREHOUSES),
  async (req, res) => {
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
  },
);

// Reuse destinations from both manual dispatches and historical stock requests.
router.get(
  "/warehouses/:warehouseId/dispatch-addresses",
  requireAuth,
  async (req, res) => {
    try {
      const { warehouseId } = req.params;
      if (!(await assertWarehouseMutationPermission(req, res, warehouseId))) {
        return;
      }

      const query =
        typeof req.query.query === "string"
          ? req.query.query.trim().slice(0, 120)
          : "";
      const requestedLimit = Number(req.query.limit);
      const limit = Number.isInteger(requestedLimit)
        ? Math.min(20, Math.max(1, requestedLimit))
        : 8;
      const addressFilter = query
        ? { contains: query, mode: "insensitive" as const }
        : undefined;

      const [manualDispatches, stockRequests] = await Promise.all([
        prisma.warehouseManualDispatch.findMany({
          where: {
            warehouseId,
            ...(addressFilter ? { address: addressFilter } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: limit * 3,
          select: {
            address: true,
            recipientName: true,
            recipientPhone: true,
            lat: true,
            lng: true,
            createdAt: true,
          },
        }),
        prisma.warehouseStockRequest.findMany({
          where: {
            warehouseId,
            deliveryAddress: {
              not: null,
              ...(addressFilter ?? {}),
            },
          },
          orderBy: { createdAt: "desc" },
          take: limit * 3,
          select: {
            deliveryAddress: true,
            deliveryPhone: true,
            createdAt: true,
            organization: { select: { name: true } },
          },
        }),
      ]);

      const suggestions = new Map<string, DispatchAddressSuggestion>();
      for (const dispatch of manualDispatches) {
        const key = dispatch.address.trim().toLocaleLowerCase("mn");
        if (!suggestions.has(key)) {
          suggestions.set(key, {
            address: dispatch.address,
            recipientName: dispatch.recipientName,
            recipientPhone: dispatch.recipientPhone,
            lat: dispatch.lat,
            lng: dispatch.lng,
            lastUsedAt: dispatch.createdAt,
          });
        }
      }
      for (const request of stockRequests) {
        const address = request.deliveryAddress?.trim();
        if (!address) continue;
        const key = address.toLocaleLowerCase("mn");
        if (!suggestions.has(key)) {
          suggestions.set(key, {
            address,
            recipientName: request.organization.name,
            recipientPhone: request.deliveryPhone,
            lat: null,
            lng: null,
            lastUsedAt: request.createdAt,
          });
        }
      }

      return res.json(
        Array.from(suggestions.values())
          .sort(
            (left, right) =>
              right.lastUsedAt.getTime() - left.lastUsedAt.getTime(),
          )
          .slice(0, limit),
      );
    } catch (error) {
      console.error("get dispatch address suggestions error", error);
      return res.status(500).json({
        message: "Өмнөх хүргэлтийн хаяг авахад алдаа гарлаа",
      });
    }
  },
);

router.post(
  "/warehouses/:warehouseId/manual-dispatches",
  requireAuth,
  async (req, res) => {
    try {
      const { warehouseId } = req.params;
      if (!(await assertWarehouseMutationPermission(req, res, warehouseId))) {
        return;
      }

      const actor = (req as typeof req & { user?: { userId?: string } }).user;
      if (!actor?.userId) {
        return res.status(401).json({ message: "Нэвтрэх шаардлагатай" });
      }
      const actorId = actor.userId;

      const address = cleanOptionalText(req.body.address, 500);
      const lat = parseCoordinate(req.body.lat, -90, 90);
      const lng = parseCoordinate(req.body.lng, -180, 180);
      const rawItems: unknown[] = Array.isArray(req.body.items)
        ? req.body.items
        : [];
      const items: ManualDispatchItemInput[] = rawItems
        .map((raw): ManualDispatchItemInput | null => {
          if (!raw || typeof raw !== "object") return null;
          const candidate = raw as Record<string, unknown>;
          const productId =
            typeof candidate.productId === "string"
              ? candidate.productId.trim()
              : "";
          const quantity = Number(candidate.quantity);
          return productId && Number.isInteger(quantity) && quantity > 0
            ? { productId, quantity }
            : null;
        })
        .filter((item): item is ManualDispatchItemInput => item !== null);

      if (!address) {
        return res.status(400).json({ message: "Хүргэх хаяг шаардлагатай" });
      }
      if (lat === null || lng === null) {
        return res.status(400).json({
          message: "Газрын зураг дээр хүргэх цэгээ тэмдэглэнэ үү",
        });
      }
      if (items.length === 0 || items.length !== rawItems.length) {
        return res.status(400).json({
          message: "Гаргах бараа болон тоо ширхэг буруу байна",
        });
      }
      if (new Set(items.map((item) => item.productId)).size !== items.length) {
        return res.status(400).json({
          message: "Нэг барааг давхар оруулах боломжгүй",
        });
      }

      const dispatch = await prisma.$transaction(async (tx) => {
        const warehouse = await tx.warehouse.findFirst({
          where: {
            id: warehouseId,
            deletedAt: null,
            isActive: true,
            type: ADMIN_MANAGED_WAREHOUSE,
          },
          select: { id: true },
        });
        if (!warehouse) throw new Error("WAREHOUSE_NOT_FOUND");

        const dispatchNumber = createManualDispatchNumber();
        const created = await tx.warehouseManualDispatch.create({
          data: {
            dispatchNumber,
            warehouseId,
            recipientName: cleanOptionalText(req.body.recipientName, 160),
            recipientPhone: cleanOptionalText(req.body.recipientPhone, 40),
            address,
            lat,
            lng,
            reason: cleanOptionalText(req.body.reason, 250),
            note: cleanOptionalText(req.body.note, 1000),
            createdById: actorId,
            items: {
              create: items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
              })),
            },
          },
          include: {
            items: {
              include: {
                product: { select: { id: true, name: true, sku: true } },
              },
            },
          },
        });

        for (const item of items) {
          const update = await tx.warehouseInventory.updateMany({
            where: {
              warehouseId,
              productId: item.productId,
              quantity: { gte: item.quantity },
            },
            data: { quantity: { decrement: item.quantity } },
          });
          if (update.count !== 1) {
            throw new InsufficientWarehouseStockError(item.productId);
          }
          await tx.inventoryLedger.create({
            data: {
              productId: item.productId,
              change: -item.quantity,
              reason: InventoryReason.MANUAL_ADJUST,
              note: `${dispatchNumber} · ${address}`,
              createdById: actorId,
              referenceId: created.id,
              referenceType: "WAREHOUSE_MANUAL_DISPATCH",
            },
          });
          await syncProductStock(tx, item.productId);
        }

        return created;
      });

      return res.status(201).json(dispatch);
    } catch (error) {
      if (error instanceof InsufficientWarehouseStockError) {
        return res.status(409).json({
          message: "Нэг буюу хэд хэдэн барааны үлдэгдэл хүрэлцэхгүй байна",
          productId: error.productId,
        });
      }
      if (error instanceof Error && error.message === "WAREHOUSE_NOT_FOUND") {
        return res.status(404).json({ message: "Агуулах олдсонгүй" });
      }
      console.error("create warehouse manual dispatch error", error);
      return res.status(500).json({
        message: "Бараа гаргалт бүртгэхэд алдаа гарлаа",
      });
    }
  },
);

// Update inventory quantity
router.patch(
  "/warehouses/:warehouseId/inventory/:productId",
  requireAuth,
  async (req, res) => {
    try {
      const { warehouseId, productId } = req.params;
      if (!(await assertWarehouseMutationPermission(req, res, warehouseId))) {
        return;
      }
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
        images,
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
          return res
            .status(400)
            .json({ message: "Барааны нэр хоосон байж болохгүй" });
        }
        productUpdateData.name = trimmedName;
      }
      if (description !== undefined)
        productUpdateData.description = description
          ? String(description).trim()
          : null;
      if (sku !== undefined)
        productUpdateData.sku = sku ? String(sku).trim() : null;
      if (barcode !== undefined)
        productUpdateData.barcode = barcode ? String(barcode).trim() : null;
      if (unit !== undefined)
        productUpdateData.unit = unit ? String(unit).trim() : null;
      if (price !== undefined) {
        const parsedPrice = Number(price);
        if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
          return res.status(400).json({ message: "Үнэ буруу байна" });
        }
        productUpdateData.price = parsedPrice;
      }
      if (costPrice !== undefined) {
        const parsedCostPrice =
          costPrice === null || costPrice === "" ? null : Number(costPrice);
        if (
          parsedCostPrice !== null &&
          (!Number.isFinite(parsedCostPrice) || parsedCostPrice < 0)
        ) {
          return res.status(400).json({ message: "Өртөг үнэ буруу байна" });
        }
        productUpdateData.costPrice = parsedCostPrice;
      }
      if (businessCategoryId !== undefined)
        productUpdateData.businessCategoryId = businessCategoryId || null;
      if (supplyType !== undefined) productUpdateData.supplyType = supplyType;
      if (preorderLeadTimeDays !== undefined) {
        const parsedLeadTime =
          preorderLeadTimeDays === null || preorderLeadTimeDays === ""
            ? null
            : Number(preorderLeadTimeDays);
        if (
          parsedLeadTime !== null &&
          (!Number.isInteger(parsedLeadTime) ||
            parsedLeadTime < 0 ||
            parsedLeadTime > 365)
        ) {
          return res
            .status(400)
            .json({ message: "Ирэх хоног 0-365 хооронд байх ёстой" });
        }
        productUpdateData.preorderLeadTimeDays = parsedLeadTime;
      }
      if (preorderNote !== undefined)
        productUpdateData.preorderNote = preorderNote
          ? String(preorderNote).trim()
          : null;
      if (isActive !== undefined)
        productUpdateData.isActive = Boolean(isActive);

      let imageUrls: string[] | undefined;
      if (images !== undefined) {
        if (!Array.isArray(images)) {
          return res.status(400).json({
            message: "Зургийн мэдээлэл буруу байна",
          });
        }
        if (images.length > 5) {
          return res.status(400).json({
            message: "Нэг бараанд 5 хүртэл зураг хадгалах боломжтой",
          });
        }
        imageUrls = images.map((image) => String(image).trim());
        if (imageUrls.some((url) => !url)) {
          return res.status(400).json({
            message: "Зургийн холбоос хоосон байж болохгүй",
          });
        }
      }

      const targetInventory = await prisma.warehouseInventory.findUnique({
        where: { warehouseId_productId: { warehouseId, productId } },
        select: { productId: true },
      });
      if (!targetInventory) {
        return res.status(404).json({ message: "Агуулахын бараа олдсонгүй" });
      }
      const inventory = await prisma.$transaction(async (tx) => {
        // Get old quantity for ledger
        const oldInv =
          quantity !== undefined
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

        if (imageUrls !== undefined) {
          await tx.productImage.deleteMany({ where: { productId } });
          if (imageUrls.length > 0) {
            await tx.productImage.createMany({
              data: imageUrls.map((url) => ({ productId, url })),
            });
          }
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
  async (req, res) => {
    try {
      const { warehouseId, productId } = req.params;
      if (!(await assertWarehouseMutationPermission(req, res, warehouseId))) {
        return;
      }

      const targetInventory = await prisma.warehouseInventory.findUnique({
        where: { warehouseId_productId: { warehouseId, productId } },
        select: { productId: true },
      });
      if (!targetInventory) {
        return res.status(404).json({ message: "Агуулахын бараа олдсонгүй" });
      }

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
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit as string, 10) || 50),
    );
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
      where.productId = {
        in: warehouseProducts.map(
          (wp: (typeof warehouseProducts)[number]) => wp.productId,
        ),
      };
    }

    const [entries, total] = await Promise.all([
      prisma.inventoryLedger.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true } },
          createdBy: {
            select: {
              id: true,
              email: true,
              profile: { select: { fullName: true } },
            },
          },
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
    const prefix = ((req.query.prefix as string) || "").trim().toUpperCase();

    if (!prefix || prefix.length < 3) {
      return res.json([]);
    }

    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId, deletedAt: null },
      include: { organizations: { select: { organizationId: true }, take: 1 } },
    });

    if (!warehouse)
      return res.status(404).json({ message: "Агуулах олдсонгүй" });

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

/* ─── POST /warehouses/:id/products/import ──────────────────────────── *
 * Bulk import products from Excel into a warehouse.
 * Creates Product + WarehouseInventory + InventoryLedger per row.
 * Organisation resolved from warehouse's WarehouseOrganization link.
 * ──────────────────────────────────────────────────────────────────── */
router.post(
  "/warehouses/:id/products/import",
  requireAuth,
  excelUpload.single("file"),
  async (req, res) => {
    try {
      const warehouseId = req.params.id;
      if (!(await assertWarehouseMutationPermission(req, res, warehouseId))) {
        return;
      }

      // Verify warehouse exists and get its organization
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: warehouseId, deletedAt: null },
        include: {
          organizations: { select: { organizationId: true }, take: 1 },
        },
      });
      if (!warehouse) {
        return res.status(404).json({ message: "Агуулах олдсонгүй" });
      }

      const organizationId = warehouse.organizations[0]?.organizationId;
      if (!organizationId) {
        return res
          .status(400)
          .json({ message: "Агуулахад байгууллага хуваарилагдаагүй байна" });
      }

      // Resolve businessCategoryId from organization
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

      if (!req.file) {
        return res
          .status(400)
          .json({ message: "Excel файл шаардлагатай (.xlsx, .xls)" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return res.status(400).json({ message: "Excel файл хоосон байна" });
      }

      const rows = XLSX.utils
        .sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName])
        .map(normalizeExcelRow);
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
        hasRichData = files.some((f) =>
          f.includes("richData/richValueRel.xml"),
        );
        hasDrawings = files.some((f) =>
          /xl\/drawings\/drawing\d+\.xml$/.test(f),
        );
      } catch {
        /* ignore */
      }

      const colMap = PRODUCT_COL_MAP;
      const categoryChoices = await getImportBusinessCategoryChoices();

      const results: {
        created: number;
        updated: number;
        skipped: number;
        errors: string[];
        products: Array<{
          id: string;
          name: string;
          sku: string | null;
          price: number;
          stock: number;
        }>;
      } = { created: 0, updated: 0, skipped: 0, errors: [], products: [] };

      // Pre-scan: detect duplicate SKUs within the file
      const skusInFile = new Map<string, number>();
      const duplicateSkuRows = new Set<number>();
      for (let i = 0; i < rows.length; i++) {
        const sku = resolveCol(rows[i], colMap.sku);
        if (sku) {
          const normalized = String(sku).trim().toLowerCase();
          if (skusInFile.has(normalized)) {
            results.errors.push(
              `Мөр ${i + 2}: SKU "${String(sku).trim()}" файл дотор давхардсан (мөр ${skusInFile.get(normalized)})`,
            );
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
        const businessCategoryRaw = resolveCol(row, colMap.businessCategory);
        const price = resolveCol(row, colMap.price);
        const costPrice = resolveCol(row, colMap.costPrice);
        const stock = resolveCol(row, colMap.stock);
        const description = resolveCol(row, colMap.description);
        const imagesRaw = resolveCol(row, colMap.images);

        if (!name || price === undefined) {
          results.errors.push(
            `Мөр ${rowNum}: Нэр болон үнэ заавал шаардлагатай`,
          );
          results.skipped++;
          continue;
        }

        const priceNum = parseFloat(String(price));
        if (isNaN(priceNum) || priceNum < 0) {
          results.errors.push(`Мөр ${rowNum}: Үнэ буруу — "${price}"`);
          results.skipped++;
          continue;
        }

        const costPriceNum =
          costPrice !== undefined ? parseFloat(String(costPrice)) : null;
        if (
          costPriceNum !== null &&
          (isNaN(costPriceNum) || costPriceNum < 0)
        ) {
          results.errors.push(
            `Мөр ${rowNum}: Өртөг үнэ буруу — "${costPrice}"`,
          );
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
        const rowBusinessCategoryId = resolveBusinessCategoryIdFromChoices(
          businessCategoryRaw,
          categoryChoices,
        );
        if (rowBusinessCategoryId === undefined) {
          results.errors.push(
            `Мөр ${rowNum}: Ангилал олдсонгүй — "${String(businessCategoryRaw).trim()}"`,
          );
          results.skipped++;
          continue;
        }

        try {
          // Parse image URLs from text column
          let imageUrls: string[] = imagesRaw
            ? String(imagesRaw)
                .split(",")
                .map((u) => u.trim())
                .filter((u) => u.startsWith("http"))
                .slice(0, 5)
            : [];

          // Check for embedded images
          if (imageUrls.length === 0) {
            const rowBuffers = embeddedImages.get(i + 1);
            if (rowBuffers && rowBuffers.length > 0) {
              const uploadPromises = rowBuffers
                .slice(0, 5)
                .map((buf) => uploadBufferToSupabase(buf));
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
            businessCategoryId: rowBusinessCategoryId || orgBusinessCategoryId,
            isActive: true,
          };

          // Create or update product + warehouse inventory in a transaction
          const result = await prisma.$transaction(async (tx) => {
            let product;
            let wasUpdate = false;

            if (normalizedSku) {
              // Free up SKU from any soft-deleted product
              await tx.product.updateMany({
                where: {
                  organizationId,
                  sku: normalizedSku,
                  deletedAt: { not: null },
                },
                data: { sku: null },
              });

              const existing = await tx.product.findUnique({
                where: {
                  organizationId_sku: { organizationId, sku: normalizedSku },
                },
                select: { id: true, masterProductId: true },
              });
              wasUpdate = !!existing;

              const masterProduct = await resolveMasterProduct(tx, {
                masterProductId: existing?.masterProductId,
                name: productData.name,
                description: productData.description,
                imageUrl: imageUrls[0] || null,
              });
              if (!masterProduct) throw new Error("MASTER_PRODUCT_NOT_FOUND");
              await addMasterProductAlias(
                tx,
                masterProduct.id,
                productData.name,
              );

              product = await tx.product.upsert({
                where: {
                  organizationId_sku: { organizationId, sku: normalizedSku },
                },
                update: {
                  ...productData,
                  masterProductId: masterProduct.id,
                  managedByWarehouseId: warehouseId,
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
                  managedByWarehouseId: warehouseId,
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
              const masterProduct = await resolveMasterProduct(tx, {
                name: productData.name,
                description: productData.description,
                imageUrl: imageUrls[0] || null,
              });
              if (!masterProduct) throw new Error("MASTER_PRODUCT_NOT_FOUND");
              await addMasterProductAlias(
                tx,
                masterProduct.id,
                productData.name,
              );
              product = await tx.product.create({
                data: {
                  organizationId,
                  sku: null,
                  ...productData,
                  masterProductId: masterProduct.id,
                  managedByWarehouseId: warehouseId,
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

            // Create or update warehouse inventory
            if (stockNum > 0) {
              const existingInv = await tx.warehouseInventory.findUnique({
                where: {
                  warehouseId_productId: { warehouseId, productId: product.id },
                },
              });

              if (existingInv) {
                await tx.warehouseInventory.update({
                  where: {
                    warehouseId_productId: {
                      warehouseId,
                      productId: product.id,
                    },
                  },
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
        _debug: {
          embeddedImageRows: embeddedImages.size,
          mediaFiles: mediaFileCount,
          hasRichData,
          hasDrawings,
        },
      });
    } catch (error) {
      console.error("warehouse import products error", error);
      return res.status(500).json({
        message: "Excel импорт хийхэд алдаа гарлаа",
        error: String(error),
      });
    }
  },
);

/* ─── POST /warehouses/:id/products ─────────────────────────────────── *
 * Warehouse operator creates a NEW product and adds it to inventory.
 * No organization permission required — product is created under the
 * warehouse's first assigned organization.
 * ──────────────────────────────────────────────────────────────────── */
router.post("/warehouses/:id/products", requireAuth, async (req, res) => {
  try {
    const warehouseId = req.params.id;
    if (!(await assertWarehouseMutationPermission(req, res, warehouseId))) {
      return;
    }
    const {
      name,
      description,
      sku,
      barcode,
      unit,
      price,
      costPrice,
      businessCategoryId,
      images, // string[] of URLs
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
      return res
        .status(400)
        .json({ message: "Агуулахад байгууллага хуваарилагдаагүй байна" });
    }

    const priceNum = parseFloat(String(price));
    if (isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({ message: "Үнэ буруу байна" });
    }

    const costPriceNum =
      costPrice != null && costPrice !== ""
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
        return res
          .status(409)
          .json({ message: "Ижил SKU-тэй бараа бүртгэлтэй байна" });
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
      const masterProduct = await resolveMasterProduct(tx, {
        name: String(name),
        barcode: barcode ? String(barcode) : null,
        unit: unit ? String(unit) : null,
        description: description ? String(description) : null,
        imageUrl: imageUrls[0] || null,
      });
      if (!masterProduct) throw new Error("MASTER_PRODUCT_NOT_FOUND");
      const newProduct = await tx.product.create({
        data: {
          organizationId,
          masterProductId: masterProduct.id,
          managedByWarehouseId: warehouseId,
          name: masterProduct.canonicalName,
          description: description ? String(description).trim() : null,
          sku: normalizedSku,
          barcode:
            masterProduct.barcode || (barcode ? String(barcode).trim() : null),
          unit: masterProduct.unit || (unit ? String(unit).trim() : null),
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
      await addMasterProductAlias(tx, masterProduct.id, String(name));

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
      return res
        .status(409)
        .json({ message: "Давхардсан SKU эсвэл бараа байна" });
    }
    console.error("create warehouse product error", error);
    return res.status(500).json({ message: "Бараа үүсгэхэд алдаа гарлаа" });
  }
});

/* ─── POST /warehouses/categories ───────────────────────────────────── *
 * Quick category creation from WMS — operator creates a new category.
 * ──────────────────────────────────────────────────────────────────── */
router.post("/warehouses/categories", requireAuth, async (req, res) => {
  try {
    if (!(await assertWarehouseCategoryPermission(req, res))) return;

    const { name, parentId } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Ангилалын нэр шаардлагатай" });
    }

    const slug =
      String(name)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9\u0400-\u04ff-]/g, "") +
      "-" +
      Date.now().toString(36);

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
        return res
          .status(400)
          .json({ message: "Хамгийн ихдээ 3 түвшин (0,1,2)" });
      }
    }

    const normalizedName = String(name).trim();
    const duplicate = await prisma.businessCategory.findFirst({
      where: {
        name: { equals: normalizedName, mode: "insensitive" },
        parentId: parentId || null,
        isActive: true,
      },
      select: { id: true },
    });
    if (duplicate) {
      return res.status(409).json({
        message: "Ижил түвшинд ийм нэртэй ангилал бүртгэлтэй байна",
      });
    }

    const category = await prisma.businessCategory.create({
      data: {
        slug,
        name: normalizedName,
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
