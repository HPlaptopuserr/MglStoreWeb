import crypto from "node:crypto";
import { prisma, Prisma, InventoryReason } from "@mgl/database";
import { toPosStoredStockQuantity } from "@mgl/types";
import { readStoreMiniApps } from "./store-mini-app-settings";
import {
  areWebProductsGloballyEnabled,
  MINI_APP_PRODUCT_STATE_FILTER,
} from "./product-visibility.service";
import { getStockMinuPaymentAccount } from "./stock-minu-payment.service";
import { createSystemQrInvoice, checkSystemQrPayment } from "./systemqr";
import {
  CONTRACT_PAYMENT_ACCOUNTS_SETTING_KEY,
  findUpgradePaymentAccountByMerchantCode,
} from "./upgrade-minu.service";
import { adjustStock } from "./inventory.service";
import { canReserveStock, reservedStock } from "./stock-reservation.service";
import {
  parseRetailCheckout,
  WarehouseRetailError,
} from "./warehouse-retail.policy";

export const retailOrderInclude = {
  items: true,
  warehouse: { select: { id: true, name: true, address: true, phone: true } },
} satisfies Prisma.WarehouseRetailOrderInclude;
export async function createRetailCheckout(customerId: string, body: unknown) {
  const input = parseRetailCheckout(body);
  const customer = await prisma.user.findFirst({
    where: { id: customerId, isActive: true, deletedAt: null },
    select: { id: true },
  });
  if (!customer)
    throw new WarehouseRetailError("Бүртгэлээрээ нэвтэрнэ үү.", 401);
  const previous = await prisma.warehouseRetailOrder.findUnique({
    where: {
      customerId_checkoutKey: { customerId, checkoutKey: input.checkoutKey },
    },
    include: retailOrderInclude,
  });
  if (previous) return previous;
  const { settings } = await readStoreMiniApps();
  const config = settings["shared-store"];
  if (!config.enabled || !(await areWebProductsGloballyEnabled()))
    throw new WarehouseRetailError("Дундын дэлгүүр түр хаалттай байна.", 409);
  const order = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${customerId}:${input.checkoutKey}`}, 0))`;
      const retry = await tx.warehouseRetailOrder.findUnique({
        where: {
          customerId_checkoutKey: {
            customerId,
            checkoutKey: input.checkoutKey,
          },
        },
        include: retailOrderInclude,
      });
      if (retry) return retry;
      const productIds = input.lines.map((line) => line.productId).sort();
      await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id" IN (${Prisma.join(productIds)}) ORDER BY "id" FOR UPDATE`;
      const products = await tx.product.findMany({
        where: {
          ...MINI_APP_PRODUCT_STATE_FILTER,
          id: { in: input.lines.map((line) => line.productId) },
          organizationId: null,
          managedByWarehouseId: { in: config.sourceIds },
          managedByWarehouse: {
            isActive: true,
            deletedAt: null,
            type: "CENTRAL",
          },
        },
        select: {
          id: true,
          name: true,
          price: true,
          costPrice: true,
          unit: true,
          managedByWarehouseId: true,
        },
      });
      if (products.length !== input.lines.length)
        throw new WarehouseRetailError(
          "Зарим бараа худалдаанд байхгүй болсон байна.",
          409,
        );
      const warehouseId = products[0].managedByWarehouseId;
      if (
        !warehouseId ||
        products.some((product) => product.managedByWarehouseId !== warehouseId)
      )
        throw new WarehouseRetailError(
          "Нэг захиалгаар нэг агуулахын барааг сонгоно уу.",
        );
      const items = input.lines.map((line) => {
        const product = products.find((row) => row.id === line.productId);
        if (!product) throw new WarehouseRetailError("Бараа олдсонгүй.");
        return {
          productId: product.id,
          productName: product.name,
          quantity: line.quantity,
          storedQuantity: toPosStoredStockQuantity(line.quantity, product.unit),
          price: product.price,
          costPrice: product.costPrice,
          subtotal: new Prisma.Decimal(product.price).mul(line.quantity),
        };
      });
      const stockItems = items.map((item) => ({
        productId: item.productId,
        quantity: item.storedQuantity,
      }));
      if (!(await canReserveStock(tx, warehouseId, stockItems)))
        throw new WarehouseRetailError(
          "Барааны үлдэгдэл хүрэлцэхгүй байна. Сагсаа шинэчилнэ үү.",
          409,
        );
      const visible = await tx.warehouseInventory.count({
        where: {
          warehouseId,
          productId: { in: products.map((product) => product.id) },
          showOnWeb: true,
          OR: [{ expiryDate: null }, { expiryDate: { gt: new Date() } }],
        },
      });
      if (visible !== products.length)
        throw new WarehouseRetailError(
          "Сонгосон бараа худалдаанд байхгүй болсон байна.",
          409,
        );
      // Validate the warehouse's actual selected account before reserving stock.
      const account = await getStockMinuPaymentAccount(warehouseId);
      return tx.warehouseRetailOrder.create({
        data: {
          orderNumber: `DS-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
          customerId,
          warehouseId,
          checkoutKey: input.checkoutKey,
          phone: input.phone,
          shippingAddress: input.shippingAddress,
          note: input.note || null,
          total: items.reduce(
            (total, item) => total.add(item.subtotal),
            new Prisma.Decimal(0),
          ),
          merchantCode: account.merchantCode,
          expiresAt: new Date(Date.now() + 30 * 60_000),
          items: { create: items },
        },
        include: retailOrderInclude,
      });
    },
    { timeout: 15000 },
  );
  return order;
}

async function paymentAccount(merchantCode: string | null) {
  const setting = await prisma.siteSetting.findUnique({
    where: { key: CONTRACT_PAYMENT_ACCOUNTS_SETTING_KEY },
    select: { value: true },
  });
  const account = merchantCode
    ? findUpgradePaymentAccountByMerchantCode(setting?.value, merchantCode)
    : null;
  if (!account?.username || !account.password)
    throw new WarehouseRetailError("Захиалгын төлбөрийн данс олдсонгүй.", 409);
  return account;
}

export async function createRetailInvoice(orderId: string, customerId: string) {
  // Serialize retries so a timeout or double click cannot create two invoices.
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "WarehouseRetailOrder" WHERE "id" = ${orderId} FOR UPDATE`;
      const order = await tx.warehouseRetailOrder.findFirst({
        where: { id: orderId, customerId },
        include: retailOrderInclude,
      });
      if (!order) throw new WarehouseRetailError("Захиалга олдсонгүй.", 404);
      if (order.paymentStatus === "PAID" || order.invoiceId) return order;
      if (order.expiresAt <= new Date())
        throw new WarehouseRetailError(
          "Төлбөрийн хугацаа дууссан. Шинэ захиалга үүсгэнэ үү.",
          409,
        );
      const account = await paymentAccount(order.merchantCode);
      const invoice = await createSystemQrInvoice(
        {
          merchantCode: account.merchantCode,
          amount: Number(order.total),
          referenceNumber: order.orderNumber,
        },
        account.username,
        account.password,
      );
      return tx.warehouseRetailOrder.update({
        where: { id: order.id },
        data: {
          invoiceId: String(invoice.invoiceId),
          qrText: String(invoice.qrText),
          deepLinks: invoice.urls as Prisma.InputJsonValue,
        },
        include: retailOrderInclude,
      });
    },
    { timeout: 30000 },
  );
}

export async function checkRetailPayment(orderId: string, customerId: string) {
  const order = await prisma.warehouseRetailOrder.findFirst({
    where: { id: orderId, customerId },
    include: retailOrderInclude,
  });
  if (!order) throw new WarehouseRetailError("Захиалга олдсонгүй.", 404);
  if (order.paymentStatus === "PAID" || !order.invoiceId) return order;
  const account = await paymentAccount(order.merchantCode);
  const payment = await checkSystemQrPayment(
    { merchantCode: account.merchantCode, invoiceNumber: order.invoiceId },
    account.username,
    account.password,
  );
  if (!payment.paid) return order;
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "WarehouseRetailOrder" WHERE "id" = ${orderId} FOR UPDATE`;
    const current = await tx.warehouseRetailOrder.findUniqueOrThrow({
      where: { id: orderId },
    });
    if (current.paymentStatus === "PAID")
      return tx.warehouseRetailOrder.findUniqueOrThrow({
        where: { id: orderId },
        include: retailOrderInclude,
      });
    const ids = order.items.map((item) => item.productId).sort();
    await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id" IN (${Prisma.join(ids)}) ORDER BY "id" FOR UPDATE`;
    await tx.$queryRaw`SELECT "productId" FROM "WarehouseInventory" WHERE "warehouseId" = ${order.warehouseId} AND "productId" IN (${Prisma.join(ids)}) ORDER BY "productId" FOR UPDATE`;
    const [inventory, reserved] = await Promise.all([
      tx.warehouseInventory.findMany({
        where: { warehouseId: order.warehouseId, productId: { in: ids } },
      }),
      reservedStock(order.warehouseId, ids, tx),
    ]);
    const ownReservationActive = current.expiresAt > new Date();
    const enough = order.items.every(
      (item) =>
        (inventory.find((row) => row.productId === item.productId)?.quantity ??
          0) -
          (reserved.get(item.productId) ?? 0) +
          (ownReservationActive ? item.storedQuantity : 0) >=
        item.storedQuantity,
    );
    if (enough)
      for (const item of order.items)
        await adjustStock(tx, {
          warehouseId: order.warehouseId,
          productId: item.productId,
          change: -item.storedQuantity,
          reason: InventoryReason.ORDER,
          createdById: customerId,
          referenceId: order.id,
          referenceType: "WAREHOUSE_RETAIL_ORDER",
          note: `Дундын дэлгүүр ${order.orderNumber}`,
        });
    return tx.warehouseRetailOrder.update({
      where: { id: orderId },
      data: {
        paymentStatus: "PAID",
        paidAt: new Date(),
        status: enough ? "CONFIRMED" : "PENDING",
        fulfillmentIssue: enough
          ? null
          : "Хугацаа дууссаны дараа төлөгдсөн, нөөц хүрэлцэхгүй. Харилцагчтай холбогдож шийдвэрлэнэ үү.",
      },
      include: retailOrderInclude,
    });
  });
}

/** Reconcile even when a buyer closes the QR dialog after paying. */
export async function reconcileRetailPayments() {
  const orders = await prisma.warehouseRetailOrder.findMany({
    where: {
      paymentStatus: "PENDING",
      invoiceId: { not: null },
      createdAt: { gt: new Date(Date.now() - 7 * 86_400_000) },
    },
    select: { id: true, customerId: true },
    orderBy: { updatedAt: "asc" },
    take: 20,
  });
  for (const order of orders) {
    try {
      await checkRetailPayment(order.id, order.customerId);
    } catch (error: unknown) {
      console.error(
        "[warehouse retail] payment reconciliation failed",
        order.id,
        error instanceof Error ? error.message : "Unknown error",
      );
    }
    // Rotate pending invoices fairly across batches without logging credentials.
    await prisma.warehouseRetailOrder.updateMany({
      where: { id: order.id, paymentStatus: "PENDING" },
      data: { updatedAt: new Date() },
    });
  }
}
