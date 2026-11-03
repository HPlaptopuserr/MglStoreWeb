import type { Prisma } from "@mgl/database";

export class StockLifecycleConflictError extends Error {
  readonly status = 409;

  constructor(message = "Баримтын төлөв өөрчлөгдсөн байна. Шинэчилж дахин шалгана уу.") {
    super(message);
    this.name = "StockLifecycleConflictError";
  }
}

/** All request/dispatch transitions use request -> dispatch -> item lock order. */
async function lockRequest(tx: Prisma.TransactionClient, requestId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "WarehouseStockRequest" WHERE id=${requestId} FOR UPDATE
  `;
  if (rows.length !== 1) throw new StockLifecycleConflictError("Хүсэлт олдсонгүй");
  await tx.$queryRaw`
    SELECT id FROM "StockDispatch" WHERE "requestId"=${requestId} ORDER BY id FOR UPDATE
  `;
  // Lock the document lines before reading them. Isolation repairs remap these
  // product IDs; a pre-transaction snapshot must never be used for a stock change.
  await tx.$queryRaw`
    SELECT id FROM "WarehouseStockRequestItem" WHERE "requestId"=${requestId} ORDER BY id FOR UPDATE
  `;
  await tx.$queryRaw`
    SELECT id FROM "StockRequestPayment" WHERE "requestId"=${requestId} ORDER BY id FOR UPDATE
  `;
}

export async function lockStockRequestLifecycle(
  tx: Prisma.TransactionClient,
  requestId: string,
) {
  await lockRequest(tx, requestId);
  return tx.warehouseStockRequest.findUniqueOrThrow({
    where: { id: requestId },
    include: { items: true, dispatch: true, payment: true },
  });
}

export async function lockStockDispatchLifecycle(
  tx: Prisma.TransactionClient,
  dispatchId: string,
) {
  const identity = await tx.stockDispatch.findUnique({
    where: { id: dispatchId },
    select: { requestId: true },
  });
  if (!identity) throw new StockLifecycleConflictError("Илгээмж олдсонгүй");
  await lockRequest(tx, identity.requestId);
  return tx.stockDispatch.findUniqueOrThrow({
    where: { id: dispatchId },
    include: { request: { include: { items: true, payment: true } } },
  });
}

export function assertActiveStockRequest(status: string) {
  if (["COMPLETED", "CANCELLED", "REJECTED"].includes(status)) {
    throw new StockLifecycleConflictError("Дууссан эсвэл цуцалсан хүсэлтийн үлдэгдлийг дахин өөрчлөх боломжгүй");
  }
}
