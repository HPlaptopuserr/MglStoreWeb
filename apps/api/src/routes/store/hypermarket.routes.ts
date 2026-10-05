import { Router, type Router as ExpressRouter } from 'express';
import { prisma, type Prisma } from '@mgl/database';
import { fromPosStoredStockQuantity } from '@mgl/types';
import { areWebProductsGloballyEnabled, getWebProductsEnabledOrganizationIds, MINI_APP_PRODUCT_STATE_FILTER } from '../../services/product-visibility.service';
import { reservedStock, stockAvailability } from '../../services/stock-reservation.service';
import { productImageOrderBy } from '../../lib/product-images';

const router: ExpressRouter = Router();

// Customer catalog: no organization membership or employee permissions needed.
router.get('/store/hypermarket/products', async (req, res) => {
  try {
    const offset = Math.max(0, Math.min(100000, Number.parseInt(String(req.query.offset), 10) || 0));
    const limit = Math.max(1, Math.min(60, Number.parseInt(String(req.query.limit), 10) || 40));
    const search = String(req.query.search ?? '').trim().slice(0, 100);
    const warehouses = await prisma.warehouse.findMany({
      where: { name: { equals: 'Hypermarket', mode: 'insensitive' }, deletedAt: null, isActive: true },
      select: { id: true, name: true }, take: 2,
    });
    if (warehouses.length !== 1) {
      return res.status(warehouses.length ? 409 : 404).json({ message: warehouses.length ? 'Hypermarket агуулахын тохиргоо давхардсан байна.' : 'Hypermarket агуулах олдсонгүй.' });
    }
    const warehouse = warehouses[0];
    const empty = { warehouse, products: [], total: 0, hasMore: false };
    if (!(await areWebProductsGloballyEnabled())) return res.json(empty);
    const organizationIds = await getWebProductsEnabledOrganizationIds();
    if (!organizationIds.length) return res.json(empty);
    const where: Prisma.WarehouseInventoryWhereInput = {
      warehouseId: warehouse.id, quantity: { gt: 0 }, showOnWeb: true,
      AND: [{ OR: [{ expiryDate: null }, { expiryDate: { gt: new Date() } }] }],
      product: {
        ...MINI_APP_PRODUCT_STATE_FILTER,
        managedByWarehouseId: warehouse.id,
        organizationId: { in: organizationIds },
        organization: { deletedAt: null, status: 'ACTIVE' },
        ...(search ? { OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ] } : {}),
      },
    };
    const [rows, total] = await Promise.all([
      prisma.warehouseInventory.findMany({ where, skip: offset, take: limit, orderBy: [{ product: { name: 'asc' } }, { id: 'asc' }], select: {
        productId: true, quantity: true,
        product: { select: {
          id: true, name: true, description: true, sku: true, price: true, unit: true,
          images: { select: { url: true }, orderBy: productImageOrderBy(), take: 1 },
          businessCategory: { select: { id: true, name: true, slug: true } },
          organization: { select: { name: true } },
          discounts: { where: { isActive: true, validUntil: { gte: new Date() } }, select: { percent: true }, take: 1 },
        } },
      } }),
      prisma.warehouseInventory.count({ where }),
    ]);
    const reserved = await reservedStock(warehouse.id, rows.map(row => row.productId));
    return res.json({ warehouse, products: rows.map(row => ({ ...row.product,
      stock: fromPosStoredStockQuantity(stockAvailability(row.quantity, reserved.get(row.productId) ?? 0).quantity, row.product.unit),
    })), total, hasMore: offset + rows.length < total });
  } catch (error: unknown) {
    console.error('Hypermarket public catalog failed', error);
    return res.status(500).json({ message: 'Hypermarket-ийн барааг ачаалж чадсангүй.' });
  }
});
export default router;
