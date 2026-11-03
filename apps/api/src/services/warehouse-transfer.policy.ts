export class TransferError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new TransferError("Мэдээлэл буруу байна");
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.length > 200)
    throw new TransferError("Талбарын утга буруу байна");
  return value.trim();
}
function quantity(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > 2147483647
  )
    throw new TransferError("Тоо ширхэг эерэг бүхэл тоо байна");
  return value;
}
function rows(value: unknown): unknown[] {
  if (!Array.isArray(value) || !value.length || value.length > 100)
    throw new TransferError("1–100 бараа сонгоно уу");
  return value;
}
export function parseTransfer(value: unknown) {
  const body = record(value);
  const id = text(body.id);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  )
    throw new TransferError("Хүсэлтийн дугаар буруу байна");
  const sourceWarehouseId = text(body.sourceWarehouseId);
  const destinationWarehouseId = text(body.destinationWarehouseId);
  if (sourceWarehouseId === destinationWarehouseId)
    throw new TransferError("Өөр агуулах сонгоно уу");
  const items = rows(body.items).map((value) => {
    const row = record(value);
    return { productId: text(row.productId), quantity: quantity(row.quantity) };
  });
  if (new Set(items.map((item) => item.productId)).size !== items.length)
    throw new TransferError("Бараа давхардсан байна");
  if (
    body.note != null &&
    (typeof body.note !== "string" || body.note.length > 1000)
  )
    throw new TransferError("Тэмдэглэл 1000 тэмдэгтээс хэтрэхгүй байна");
  return {
    id,
    sourceWarehouseId,
    destinationWarehouseId,
    items,
    note: typeof body.note === "string" ? body.note.trim() : "",
  };
}
export function parseTransferAcceptance(value: unknown) {
  const body = record(value);
  const items = rows(body.items).map((value) => {
    const row = record(value);
    if (
      typeof row.salePrice !== "number" ||
      !Number.isFinite(row.salePrice) ||
      row.salePrice < 0 ||
      row.salePrice > 1e12 ||
      Math.abs(row.salePrice * 100 - Math.round(row.salePrice * 100)) > 0.0001
    )
      throw new TransferError(
        "Зарах үнэ 0 буюу түүнээс их, хоёр орны нарийвчлалтай байна",
      );
    return {
      id: text(row.id),
      quantity: quantity(row.quantity),
      salePrice: row.salePrice,
      targetProductId:
        row.targetProductId == null ? null : text(row.targetProductId),
    };
  });
  if (new Set(items.map((item) => item.id)).size !== items.length)
    throw new TransferError("Мөр давхардсан байна");
  const targets = items.flatMap((item) =>
    item.targetProductId ? [item.targetProductId] : [],
  );
  if (new Set(targets).size !== targets.length)
    throw new TransferError("Хоёр мөрийг нэг бараанд холбох боломжгүй");
  return items;
}
export function assertTransferCounts(
  expected: readonly { id: string; quantity: number }[],
  actual: readonly { id: string; quantity: number }[],
) {
  if (
    expected.length !== actual.length ||
    expected.some(
      (row) =>
        actual.find((item) => item.id === row.id)?.quantity !== row.quantity,
    )
  ) {
    throw new TransferError(
      "Илгээсэн ба хүлээн авсан тоо зөрсөн байна. Зөрүүг шийдсэний дараа батална уу.",
      409,
    );
  }
}
