export type WarehouseGoodsReceiptLineInput = {
  productId: string;
  quantity: number;
  unitCost: number;
  batchNumber: string | null;
  expiryDate: Date | null;
  location: string | null;
  note: string | null;
};

export type WarehouseGoodsReceiptInput = {
  warehouseId: string;
  supplierName: string;
  supplierRegisterNumber: string | null;
  supplierDocumentNumber: string | null;
  documentDate: Date | null;
  note: string | null;
  confirm: boolean;
  items: WarehouseGoodsReceiptLineInput[];
};

type ParseResult =
  | { success: true; data: WarehouseGoodsReceiptInput }
  | { success: false; message: string };

function optionalText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text.slice(0, maxLength) : null;
}

function optionalDate(value: unknown): Date | null | "INVALID" {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return "INVALID";
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? "INVALID" : date;
}

export function parseWarehouseGoodsReceiptInput(body: unknown): ParseResult {
  if (!body || typeof body !== "object") {
    return { success: false, message: "Орлогын падааны мэдээлэл буруу байна" };
  }
  const input = body as Record<string, unknown>;
  const warehouseId = optionalText(input.warehouseId, 100);
  const supplierName = optionalText(input.supplierName, 200);
  const documentDate = optionalDate(input.documentDate);
  const rawItems = Array.isArray(input.items) ? input.items : [];

  if (!warehouseId) return { success: false, message: "Агуулах шаардлагатай" };
  if (!supplierName)
    return { success: false, message: "Нийлүүлэгчийн нэр шаардлагатай" };
  if (documentDate === "INVALID")
    return { success: false, message: "Падааны огноо буруу байна" };
  if (rawItems.length === 0)
    return { success: false, message: "Дор хаяж нэг бараа оруулна уу" };

  const items: WarehouseGoodsReceiptLineInput[] = [];
  for (const rawItem of rawItems) {
    if (!rawItem || typeof rawItem !== "object")
      return { success: false, message: "Барааны мөр буруу байна" };
    const item = rawItem as Record<string, unknown>;
    const productId = optionalText(item.productId, 100);
    const quantity = Number(item.quantity);
    const unitCost = Number(item.unitCost);
    const expiryDate = optionalDate(item.expiryDate);
    if (!productId || !Number.isInteger(quantity) || quantity <= 0)
      return { success: false, message: "Барааны тоо бүхэл эерэг утга байна" };
    if (!Number.isFinite(unitCost) || unitCost < 0)
      return { success: false, message: "Барааны нэгж өртөг буруу байна" };
    if (expiryDate === "INVALID")
      return { success: false, message: "Дуусах хугацаа буруу байна" };
    items.push({
      productId,
      quantity,
      unitCost,
      batchNumber: optionalText(item.batchNumber, 100),
      expiryDate,
      location: optionalText(item.location, 200),
      note: optionalText(item.note, 500),
    });
  }

  return {
    success: true,
    data: {
      warehouseId,
      supplierName,
      supplierRegisterNumber: optionalText(input.supplierRegisterNumber, 100),
      supplierDocumentNumber: optionalText(input.supplierDocumentNumber, 100),
      documentDate,
      note: optionalText(input.note, 1000),
      confirm: input.confirm === true,
      items,
    },
  };
}
