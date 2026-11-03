export class WarehouseRetailError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}
export interface RetailLine {
  productId: string;
  quantity: number;
}
export function parseRetailCheckout(value: unknown) {
  if (!value || typeof value !== "object")
    throw new WarehouseRetailError("Захиалгын мэдээлэл буруу байна.");
  const data = value as Record<string, unknown>;
  const text = (key: string, max: number) =>
    typeof data[key] === "string" ? data[key].trim().slice(0, max) : "";
  const phone = text("phone", 20)
    .replace(/[\s()+-]/g, "")
    .replace(/^976(?=\d{8}$)/, "");
  const shippingAddress = text("shippingAddress", 1000);
  const checkoutKey = text("checkoutKey", 100);
  if (!/^\d{8}$/.test(phone))
    throw new WarehouseRetailError("Утасны дугаараа 8 оронтой оруулна уу.");
  if (shippingAddress.length < 5)
    throw new WarehouseRetailError(
      "Хүлээн авах хаягаа дэлгэрэнгүй оруулна уу.",
    );
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(checkoutKey))
    throw new WarehouseRetailError("Захиалгын түлхүүр буруу байна.");
  if (
    !Array.isArray(data.lines) ||
    !data.lines.length ||
    data.lines.length > 60
  )
    throw new WarehouseRetailError("Сагсанд 1–60 төрлийн бараа сонгоно уу.");
  const ids = new Set<string>();
  const lines = data.lines.map((raw: unknown): RetailLine => {
    if (!raw || typeof raw !== "object")
      throw new WarehouseRetailError("Барааны мэдээлэл буруу байна.");
    const row = raw as Record<string, unknown>;
    if (
      typeof row.productId !== "string" ||
      !row.productId ||
      row.productId.length > 100 ||
      ids.has(row.productId)
    )
      throw new WarehouseRetailError(
        "Барааны жагсаалт буруу эсвэл давхардсан байна.",
      );
    if (
      typeof row.quantity !== "number" ||
      !Number.isSafeInteger(row.quantity) ||
      row.quantity < 1 ||
      row.quantity > 10000
    )
      throw new WarehouseRetailError("Барааны тоо хэмжээ буруу байна.");
    ids.add(row.productId);
    return { productId: row.productId, quantity: row.quantity };
  });
  return {
    phone,
    shippingAddress,
    checkoutKey,
    note: text("note", 1000),
    lines,
  };
}
