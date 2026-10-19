import { Router, type Request, type Router as ExpressRouter } from "express";
import { prisma, type Prisma } from "@mgl/database";
import {
  fromPosStoredStockQuantity,
  STORE_MINI_APP_IDS,
  STORE_MINI_APP_TITLES,
  type StoreMiniAppId,
} from "@mgl/types";
import { optionalAuth, type AuthPayload } from "../../middleware/auth";
import {
  canOrderVendorMiniApp,
  readStoreMiniApps,
} from "../../services/store-mini-app-settings";
import {
  areWebProductsGloballyEnabled,
  getWebProductsEnabledOrganizationIds,
  MINI_APP_PRODUCT_STATE_FILTER,
} from "../../services/product-visibility.service";
import { productImageOrderBy } from "../../lib/product-images";
import { onlineProductStock } from "../../services/store-product-stock";
import { reservedStock } from "../../services/stock-reservation.service";

const router: ExpressRouter = Router();
router.get(
  "/store/mini-apps/:id/products",
  optionalAuth,
  async (req: Request, res) => {
    try {
      if (!STORE_MINI_APP_IDS.includes(req.params.id as StoreMiniAppId))
        return res.status(404).json({ message: "Mini app олдсонгүй." });
      const id = req.params.id as StoreMiniAppId;
      const config = await readStoreMiniApps();
      const app = config.settings[id];
      const auth = (req as Request & { user?: AuthPayload }).user;
      const user = auth
        ? await prisma.user.findFirst({
            where: { id: auth.userId, isActive: true, deletedAt: null },
            select: { id: true },
          })
        : null;
      const canOrder =
        id === "shared-store"
          ? Boolean(user)
          : Boolean(user && canOrderVendorMiniApp(config, user.id));
      res.setHeader("Cache-Control", "private, no-store");
      const warehouses =
        id === "shared-store" && app.enabled
          ? await prisma.warehouse.findMany({
              where: {
                id: { in: app.sourceIds },
                isActive: true,
                deletedAt: null,
                type: "CENTRAL",
              },
              select: { id: true, name: true, address: true, phone: true },
              orderBy: { name: "asc" },
            })
          : [];
      const meta = {
        warehouses,
        title: STORE_MINI_APP_TITLES[id],
        configured: app.enabled && app.sourceIds.length > 0,
        canOrder,
      };
      const empty = { ...meta, products: [], total: 0, hasMore: false };
      if (!meta.configured || !(await areWebProductsGloballyEnabled()))
        return res.json(empty);
      const visibleOrgs = await getWebProductsEnabledOrganizationIds();
      const limit = Math.max(
        1,
        Math.min(60, Number.parseInt(String(req.query.limit), 10) || 40),
      );
      const offset = Math.max(
        0,
        Math.min(100000, Number.parseInt(String(req.query.offset), 10) || 0),
      );
      const search = String(req.query.search ?? "")
        .trim()
        .slice(0, 100);
      const organizationIds =
        id === "store-owners"
          ? app.sourceIds.filter((source) => visibleOrgs.includes(source))
          : visibleOrgs;
      const requestedWarehouse = String(req.query.warehouseId ?? "").trim();
      const warehouseSources = requestedWarehouse
        ? app.sourceIds.filter((source) => source === requestedWarehouse)
        : app.sourceIds;
      const sort = String(req.query.sort ?? "name");
      const orderBy: Prisma.ProductOrderByWithRelationInput[] =
        sort === "price_asc"
          ? [{ price: "asc" }, { id: "asc" }]
          : sort === "price_desc"
            ? [{ price: "desc" }, { id: "asc" }]
            : sort === "newest"
              ? [{ createdAt: "desc" }, { id: "asc" }]
              : [{ name: "asc" }, { id: "asc" }];
      const warehouseConditions: Prisma.ProductWhereInput[] =
        warehouseSources.map((warehouseId) => ({
          managedByWarehouseId: warehouseId,
          warehouseInventories: {
            some: {
              warehouseId,
              showOnWeb: true,
              quantity: { gt: 0 },
              warehouse: { isActive: true, deletedAt: null, type: "CENTRAL" },
              OR: [{ expiryDate: null }, { expiryDate: { gt: new Date() } }],
            },
          },
        }));
      const requestedIds = String(req.query.ids ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .slice(0, 60);
      const where: Prisma.ProductWhereInput = {
        ...MINI_APP_PRODUCT_STATE_FILTER,
        ...(requestedIds.length ? { id: { in: requestedIds } } : {}),
        ...(id === "shared-store"
          ? {
              OR: [
                { organizationId: null },
                {
                  organizationId: { in: organizationIds },
                  organization: { deletedAt: null, status: "ACTIVE" as const },
                },
              ],
            }
          : {
              organizationId: { in: organizationIds },
              organization: { deletedAt: null, status: "ACTIVE" as const },
            }),
        AND: [
          id === "shared-store"
            ? { OR: warehouseConditions }
            : { managedByWarehouseId: null },
          ...(search
            ? [
                {
                  OR: [
                    {
                      name: { contains: search, mode: "insensitive" as const },
                    },
                    { sku: { contains: search, mode: "insensitive" as const } },
                    {
                      barcode: {
                        contains: search,
                        mode: "insensitive" as const,
                      },
                    },
                  ],
                },
              ]
            : []),
        ],
      };
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          skip: offset,
          take: limit,
          orderBy,
          select: {
            id: true,
            name: true,
            description: true,
            sku: true,
            price: true,
            unit: true,
            stock: true,
            supplyType: true,
            managedByWarehouseId: true,
            managedByWarehouse: {
              select: {
                id: true,
                name: true,
                address: true,
                phone: true,
                paymentAccountId: true,
              },
            },
            warehouseInventories: {
              where: { warehouse: { isActive: true, deletedAt: null } },
              select: { warehouseId: true, quantity: true },
            },
            images: {
              select: { url: true },
              orderBy: productImageOrderBy(),
              take: 1,
            },
            businessCategory: { select: { id: true, name: true, slug: true } },
            organization: { select: { id: true, name: true } },
            discounts: {
              where: { isActive: true, validUntil: { gte: new Date() } },
              select: { percent: true },
              take: 1,
            },
          },
        }),
        prisma.product.count({ where }),
      ]);
      const reservations = new Map<string, Map<string, number>>();
      if (id === "shared-store") {
        await Promise.all(
          [
            ...new Set(
              products.flatMap((product) =>
                product.managedByWarehouseId
                  ? [product.managedByWarehouseId]
                  : [],
              ),
            ),
          ].map(async (warehouseId) => {
            reservations.set(
              warehouseId,
              await reservedStock(
                warehouseId,
                products
                  .filter(
                    (product) => product.managedByWarehouseId === warehouseId,
                  )
                  .map((product) => product.id),
              ),
            );
          }),
        );
      }
      return res.json({
        ...meta,
        products: products.map(
          ({
            warehouseInventories,
            managedByWarehouseId,
            stock,
            ...product
          }) => ({
            ...product,
            warehouse: product.managedByWarehouse
              ? {
                  id: product.managedByWarehouse.id,
                  name: product.managedByWarehouse.name,
                  address: product.managedByWarehouse.address,
                  phone: product.managedByWarehouse.phone,
                }
              : null,
            managedByWarehouse: undefined,
            orderable:
              id === "shared-store"
                ? Boolean(product.managedByWarehouse?.paymentAccountId) &&
                  product.organization == null
                : product.organization != null,
            stock: fromPosStoredStockQuantity(
              Math.max(
                0,
                onlineProductStock({
                  warehouseInventories,
                  managedByWarehouseId,
                  stock,
                }) -
                  (managedByWarehouseId
                    ? (reservations
                        .get(managedByWarehouseId)
                        ?.get(product.id) ?? 0)
                    : 0),
              ),
              product.unit,
            ),
          }),
        ),
        total,
        hasMore: offset + products.length < total,
      });
    } catch (error: unknown) {
      console.error("Mini app catalog failed", error);
      return res
        .status(500)
        .json({ message: "Каталог ачаалж чадсангүй. Дахин оролдоно уу." });
    }
  },
);
export default router;
