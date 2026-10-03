import '../config/env';
import { prisma } from '@mgl/database';
import { adjustStock } from '../services/inventory.service';
import { areWebProductsGloballyEnabled, isOrgWebProductsEnabled } from '../services/product-visibility.service';

const fixtures = [
  { sku: 'TEST-HYPERMARKET-5L', name: 'MGL Цэвэр ус 5 л', price: 5000 },
  { sku: 'TEST-HYPERMARKET-10L', name: 'MGL Цэвэр ус 10 л', price: 9000 },
] as const;

async function main() {
  const database = new URL(process.env.DATABASE_URL || '');
  if (process.env.NODE_ENV === 'production' ||
      !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname)) {
    throw new Error('Hypermarket fixtures are restricted to a local database.');
  }
  const warehouses = await prisma.warehouse.findMany({
    where: { name: { equals: 'hypermarket', mode: 'insensitive' }, isActive: true, deletedAt: null },
    select: { id: true, name: true }, take: 2,
  });
  const organizations = await prisma.organization.findMany({
    where: { name: 'Test', type: 'SUPPLIER', status: 'ACTIVE', deletedAt: null },
    select: { id: true, name: true }, take: 2,
  });
  if (warehouses.length !== 1 || organizations.length !== 1) {
    throw new Error('Exactly one active Hypermarket warehouse and Test supplier are required.');
  }
  const warehouse = warehouses[0];
  const organization = organizations[0];
  if (!(await areWebProductsGloballyEnabled()) || !(await isOrgWebProductsEnabled(organization.id))) {
    throw new Error('Enable public products for Test before seeding.');
  }

  // Re-running preserves existing fixture stock and orders; only missing rows are created.
  const products = await prisma.$transaction(async (tx) => {
    const result = [];
    for (const fixture of fixtures) {
      const existing = await tx.product.findUnique({
        where: { organizationId_sku: { organizationId: organization.id, sku: fixture.sku } },
      });
      if (existing) {
        if (existing.managedByWarehouseId !== warehouse.id) throw new Error('Fixture belongs to another warehouse.');
        result.push(existing);
        continue;
      }
      const source = await tx.product.findFirst({
        where: { name: fixture.name, deletedAt: null, images: { some: {} } },
        select: { images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true } } },
      });
      if (!source?.images[0]) throw new Error(`Missing catalog image: ${fixture.name}`);
      const product = await tx.product.create({ data: {
        organizationId: organization.id, managedByWarehouseId: warehouse.id,
        sku: fixture.sku, name: `[TEST] ${fixture.name}`, price: fixture.price, unit: 'ш',
        description: 'Hypermarket-ийн локал туршилтын бараа. Бодитоор хүргэхгүй.',
        images: { create: { url: source.images[0].url } },
      } });
      await adjustStock(tx, {
        productId: product.id, warehouseId: warehouse.id, change: 20,
        reason: 'INITIAL_STOCK', note: 'Local Hypermarket checkout test fixture',
        referenceType: 'HYPERMARKET_TEST', referenceId: fixture.sku,
      });
      await tx.warehouseInventory.update({
        where: { warehouseId_productId: { warehouseId: warehouse.id, productId: product.id } },
        data: { showOnWeb: true, lastRestockedAt: new Date() },
      });
      result.push(product);
    }
    return result;
  });
  console.log(JSON.stringify({ warehouse, organization, products: products.map(p => ({ id: p.id, name: p.name, price: p.price })) }, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
