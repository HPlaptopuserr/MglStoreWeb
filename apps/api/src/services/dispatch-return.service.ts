import { InventoryReason, PaymentStatus, type Prisma } from "@mgl/database";
import { adjustStock, resolveOrgWarehouse } from "./inventory.service";
import {
  adjustedInvoiceTotalAfterReturn,
  canCreateUnpaidDispatchReturn,
} from "./dispatch-return.policy";
import { approvedStockRequestQuantity } from "./stock-reservation.service";
import {
  findVendorTransferProduct,
  StockTransferConflictError,
} from "./stock-transfer.service";
import { lockStockDispatchLifecycle } from "./stock-lifecycle-lock.service";

export class DispatchReturnConflictError extends Error {}

export interface DispatchReturnLineInput {
  productId: string;
  quantity: number;
  reason?: string;
}

export async function createDispatchReturn(
  tx: Prisma.TransactionClient,
  dispatchId: string,
  input: { items: DispatchReturnLineInput[]; reason?: string; note?: string },
) {
  await lockStockDispatchLifecycle(tx, dispatchId);
  const dispatch = await tx.stockDispatch.findUniqueOrThrow({
    where: { id: dispatchId },
    include: {
      request: { include: { items: true, payment: true } },
      returns: { include: { items: true } },
    },
  });
  if (dispatch.status !== "DELIVERED")
    throw new DispatchReturnConflictError(
      "Зөвхөн хүргэгдсэн илгээмжээс буцаалт хийх боломжтой",
    );
  if (!canCreateUnpaidDispatchReturn(dispatch.request.payment))
    throw new Error("RETURN_PAYMENT_RECEIVED");
  if (
    input.items.length === 0 ||
    new Set(input.items.map((item) => item.productId)).size !==
      input.items.length
  ) {
    throw new DispatchReturnConflictError(
      "Буцаах барааг давхардуулахгүй сонгоно уу",
    );
  }
  for (const item of input.items) {
    const delivered = dispatch.request.items.find(
      (line) => line.productId === item.productId,
    );
    const reserved = dispatch.returns
      .filter((record) => record.status !== "REJECTED")
      .flatMap((record) => record.items)
      .filter((line) => line.productId === item.productId)
      .reduce((total, line) => total + line.quantity, 0);
    if (
      !delivered ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity + reserved > approvedStockRequestQuantity(delivered)
    ) {
      throw new DispatchReturnConflictError(
        "Буцаах тоо хүргэгдсэн болон өмнө буцаасан тоотой зөрүүтэй байна",
      );
    }
  }
  // Numbers are shared across dispatches; counting without this lock races.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('dispatch-return-number'))`;
  const date = new Date();
  const prefix = `RTN-${String(date.getFullYear()).slice(-2)}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const count = await tx.dispatchReturn.count({
    where: { returnNumber: { startsWith: prefix } },
  });
  return tx.dispatchReturn.create({
    data: {
      returnNumber: `${prefix}${String(count + 1).padStart(4, "0")}`,
      dispatchId,
      warehouseId: dispatch.warehouseId,
      organizationId: dispatch.organizationId,
      reason: input.reason ?? null,
      note: input.note ?? null,
      items: { create: input.items },
    },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true, price: true } },
        },
      },
      dispatch: { select: { dispatchNumber: true } },
      organization: { select: { id: true, name: true } },
      warehouse: { select: { id: true, name: true } },
    },
  });
}

/** The dispatch lock serializes separate returns; the return lock handles retries. */
export async function approveDispatchReturn(
  tx: Prisma.TransactionClient,
  id: string,
  actorId: string | null,
) {
  const identity = await tx.dispatchReturn.findUniqueOrThrow({
    where: { id },
    select: { dispatchId: true },
  });
  await lockStockDispatchLifecycle(tx, identity.dispatchId);
  await tx.$queryRaw`SELECT "id" FROM "DispatchReturn" WHERE "id" = ${id} FOR UPDATE`;
  await tx.$queryRaw`SELECT "id" FROM "DispatchReturnItem" WHERE "returnId" = ${id} ORDER BY "id" FOR UPDATE`;
  const current = await tx.dispatchReturn.findUniqueOrThrow({
    where: { id },
    include: {
      items: { include: { product: true } },
      dispatch: { include: { request: { include: { items: true } } } },
    },
  });
  if (current.status !== "PENDING") {
    throw new DispatchReturnConflictError("Буцаалтын төлөв өөрчлөгдсөн байна");
  }
  if (current.dispatch.status !== "DELIVERED") {
    throw new DispatchReturnConflictError(
      "Илгээмж хүргэгдсэн төлөвт байх шаардлагатай",
    );
  }
  await tx.$queryRaw`SELECT "id" FROM "StockRequestPayment" WHERE "requestId" = ${current.dispatch.requestId} FOR UPDATE`;
  const payment = await tx.stockRequestPayment.findUnique({
    where: { requestId: current.dispatch.requestId },
  });
  if (!canCreateUnpaidDispatchReturn(payment))
    throw new Error("RETURN_PAYMENT_RECEIVED");
  const previouslyApproved = await tx.dispatchReturnItem.findMany({
    where: { return: { dispatchId: current.dispatchId, status: "APPROVED" } },
    select: { productId: true, quantity: true },
  });
  await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${current.organizationId} FOR UPDATE`;
  // Different stores may return the same central products in a different line
  // order. Lock the complete central set before resolving any store product.
  await tx.$queryRaw`
    SELECT "id" FROM "Product"
    WHERE "id" IN (
      SELECT "productId" FROM "DispatchReturnItem" WHERE "returnId" = ${id}
    )
    ORDER BY "id" FOR UPDATE
  `;
  for (const item of current.items) {
    const requestItem = current.dispatch.request.items.find(
      (line) => line.productId === item.productId,
    );
    const returnedQuantity = previouslyApproved
      .filter((line) => line.productId === item.productId)
      .reduce((total, line) => total + line.quantity, 0);
    if (
      !requestItem ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity <= 0 ||
      item.quantity + returnedQuantity >
        approvedStockRequestQuantity(requestItem)
    ) {
      throw new DispatchReturnConflictError(
        "Буцаах тоо хүргэгдсэн барааны тооноос хэтэрсэн байна",
      );
    }
    const vendorProduct = await findVendorTransferProduct(
      tx,
      current.organizationId,
      item.product,
      current.dispatch.request.requestNumber,
    );
    if (!vendorProduct)
      throw new StockTransferConflictError(
        "Дэлгүүрийн хүлээн авсан бараа олдсонгүй",
      );
    const warehouseId = await resolveOrgWarehouse(
      tx,
      current.organizationId,
      vendorProduct.id,
    );
    if (!warehouseId)
      throw new StockTransferConflictError(
        "Дэлгүүрийн үндсэн агуулах олдсонгүй",
      );
    await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id" = ${vendorProduct.id} FOR UPDATE`;
    const stock = await tx.warehouseInventory.findUnique({
      where: {
        warehouseId_productId: { warehouseId, productId: vendorProduct.id },
      },
      select: { quantity: true },
    });
    if (!stock || stock.quantity < item.quantity)
      throw new Error(`VENDOR_STOCK_INSUFFICIENT:${item.product.name}`);
    const movement = {
      reason: InventoryReason.RETURN,
      note: `Буцаалт ${current.returnNumber}`,
      createdById: actorId,
      referenceId: current.returnNumber,
      referenceType: "DISPATCH_RETURN",
    };
    await adjustStock(tx, {
      ...movement,
      productId: vendorProduct.id,
      warehouseId,
      change: -item.quantity,
    });
    await adjustStock(tx, {
      ...movement,
      productId: item.productId,
      warehouseId: current.warehouseId,
      change: item.quantity,
    });
  }
  const returnAmount = current.items.reduce(
    (total, item) => total + Number(item.product.price) * item.quantity,
    0,
  );
  if (payment) {
    const adjustedTotal = adjustedInvoiceTotalAfterReturn({
      currentTotal: payment.totalAmount,
      paidAmount: payment.paidAmount,
      returnAmount,
    });
    await tx.stockRequestPayment.update({
      where: { id: payment.id },
      data: {
        totalAmount: adjustedTotal,
        status:
          adjustedTotal === 0 ? PaymentStatus.CANCELLED : PaymentStatus.PENDING,
        note: `Буцаалт ${current.returnNumber}: -${returnAmount.toLocaleString("mn-MN")}₮`,
      },
    });
  }
  return tx.dispatchReturn.update({
    where: { id },
    data: { status: "APPROVED", approvedAt: new Date(), approvedById: actorId },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true, price: true } },
        },
      },
      organization: { select: { id: true, name: true } },
      warehouse: { select: { id: true, name: true } },
    },
  });
}
