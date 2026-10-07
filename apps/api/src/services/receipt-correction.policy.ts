import { normalizePosMeasureUnit } from "@mgl/types";
export class ReceiptCorrectionError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export interface ReceiptCorrection {
  version: number;
  reason: string;
  supplierName: string;
  supplierRegisterNo: string | null;
  documentNo: string | null;
  note: string | null;
  items: {
    id: string;
    quantity: number;
    unitCost: number | null;
    salePrice?: number;
    previousSalePrice?: number;
  }[];
}
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ReceiptCorrectionError("Засварын мэдээлэл буруу байна");
  return value as Record<string, unknown>;
};
function text(value: unknown, max: number, required = false): string | null {
  if (value === null || value === undefined) {
    if (!required) return null;
  }
  if (
    typeof value !== "string" ||
    value.trim().length > max ||
    (required && !value.trim())
  )
    throw new ReceiptCorrectionError(
      "Текст талбарууд болон засварын шалтгааныг шалгана уу",
    );
  return value.trim() || null;
}
function price(value: unknown): number | null {
  if (value === null) return null;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1e9 ||
    Math.abs(value * 100 - Math.round(value * 100)) > 1e-5
  )
    throw new ReceiptCorrectionError(
      "Үнэ 0–1,000,000,000₮, хоёр орны нарийвчлалтай байна",
    );
  return value;
}
export function parseReceiptCorrection(value: unknown): ReceiptCorrection {
  const v = object(value);
  if (
    !Number.isSafeInteger(v.version) ||
    Number(v.version) < 1 ||
    !Array.isArray(v.items) ||
    !v.items.length ||
    v.items.length > 100
  )
    throw new ReceiptCorrectionError(
      "Баримтын хувилбар эсвэл мөрүүд буруу байна",
    );
  const ids = new Set<string>();
  const items = v.items.map((raw) => {
    const i = object(raw);
    const id = text(i.id, 100, true)!;
    if (ids.has(id)) throw new ReceiptCorrectionError("Давхардсан мөр байна");
    ids.add(id);
    if (
      typeof i.quantity !== "number" ||
      !Number.isFinite(i.quantity) ||
      i.quantity < 0 ||
      i.quantity > 1e6
    )
      throw new ReceiptCorrectionError("Тоо хэмжээ буруу байна");
    const salePrice =
      i.salePrice === undefined ? undefined : price(i.salePrice);
    const previousSalePrice =
      i.previousSalePrice === undefined
        ? undefined
        : price(i.previousSalePrice);
    if (
      salePrice === null ||
      (salePrice !== undefined && previousSalePrice == null)
    )
      throw new ReceiptCorrectionError(
        "Өмнөх болон шинэ зарах үнийг шалгана уу",
      );
    return {
      id,
      quantity: i.quantity,
      unitCost: price(i.unitCost),
      salePrice,
      previousSalePrice: previousSalePrice ?? undefined,
    };
  });
  return {
    version: Number(v.version),
    reason: text(v.reason, 1000, true)!,
    supplierName: text(v.supplierName, 200, true)!,
    supplierRegisterNo: text(v.supplierRegisterNo, 100),
    documentNo: text(v.documentNo, 100),
    note: text(v.note, 2000),
    items,
  };
}
export function receiptStoredQuantity(
  quantity: number,
  unit: string | null,
): number {
  const stored = quantity * (normalizePosMeasureUnit(unit) === "kg" ? 1000 : 1);
  if (stored > 2147483647 || Math.abs(stored - Math.round(stored)) > 1e-6)
    throw new ReceiptCorrectionError(
      "Ширхэг бүхэл, кг 0.001 нарийвчлалтай байна",
    );
  return Math.round(stored);
}
export function canCorrectReceipt(
  actor: {
    role: string;
    organizationId: string | null;
    orgRole: string | null;
  },
  organizationId: string,
) {
  return (
    actor.role === "SUPER_ADMIN" ||
    actor.role === "ADMIN" ||
    (actor.organizationId === organizationId && actor.orgRole === "OWNER")
  );
}
