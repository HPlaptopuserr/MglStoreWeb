export type PosGoodsReceiptLine = {
  productId: string;
  quantity: number;
  batchNumber: string | null;
  expiryDate: Date | null;
};

export type PosGoodsReceiptInput = {
  registerId: string;
  supplierName: string;
  supplierRegisterNo: string | null;
  documentNo: string | null;
  note: string | null;
  items: PosGoodsReceiptLine[];
};

export type PosGoodsReceiptParseResult =
  | { ok: true; value: PosGoodsReceiptInput }
  | { ok: false; message: string };

const cleanText = (value: unknown, maxLength: number) => {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, maxLength) : null;
};

const parseExpiryDate = (
  value: unknown,
): { ok: true; value: Date | null } | { ok: false } => {
  const dateText = String(value ?? "").trim();
  if (!dateText) return { ok: true, value: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return { ok: false };

  const date = new Date(`${dateText}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== dateText
  ) {
    return { ok: false };
  }
  return { ok: true, value: date };
};

export function parsePosGoodsReceiptInput(
  body: unknown,
): PosGoodsReceiptParseResult {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "Хүлээн авалтын мэдээлэл буруу байна" };
  }

  const input = body as Record<string, unknown>;
  const registerId = cleanText(input.registerId, 100);
  if (!registerId) {
    return { ok: false, message: "POS касс сонгогдоогүй байна" };
  }

  const supplierName = cleanText(input.supplierName, 160);
  if (!supplierName) {
    return { ok: false, message: "Нийлүүлэгч байгууллагын нэр шаардлагатай" };
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    return { ok: false, message: "Хүлээн авах бараа нэмнэ үү" };
  }
  if (input.items.length > 100) {
    return {
      ok: false,
      message: "Нэг хүлээн авалтаар 100 хүртэл төрлийн бараа бүртгэнэ",
    };
  }

  const linesByLot = new Map<string, PosGoodsReceiptLine>();
  for (const rawItem of input.items) {
    if (!rawItem || typeof rawItem !== "object") {
      return { ok: false, message: "Барааны мөрийн мэдээлэл буруу байна" };
    }

    const item = rawItem as Record<string, unknown>;
    const productId = cleanText(item.productId, 100);
    const quantity = Number(item.quantity);
    const batchNumber = cleanText(item.batchNumber, 80);
    const parsedExpiryDate = parseExpiryDate(item.expiryDate);
    if (!productId) {
      return { ok: false, message: "Барааны дугаар шаардлагатай" };
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1_000_000) {
      return {
        ok: false,
        message: "Хүлээн авах тоо ширхэг 1-1,000,000 хооронд байна",
      };
    }

    if (!parsedExpiryDate.ok) {
      return {
        ok: false,
        message: "Дуусах хугацаа YYYY-MM-DD хэлбэртэй зөв огноо байх ёстой",
      };
    }

    const expiryDate = parsedExpiryDate.value;
    const lotKey = JSON.stringify([
      productId,
      batchNumber,
      expiryDate?.toISOString().slice(0, 10) || null,
    ]);
    const nextQuantity = (linesByLot.get(lotKey)?.quantity || 0) + quantity;
    if (nextQuantity > 1_000_000) {
      return {
        ok: false,
        message: "Нэг барааны нийт тоо ширхэг 1,000,000-аас их байж болохгүй",
      };
    }
    linesByLot.set(lotKey, {
      productId,
      quantity: nextQuantity,
      batchNumber,
      expiryDate,
    });
  }

  return {
    ok: true,
    value: {
      registerId,
      supplierName,
      supplierRegisterNo: cleanText(input.supplierRegisterNo, 32),
      documentNo: cleanText(input.documentNo, 80),
      note: cleanText(input.note, 500),
      items: Array.from(linesByLot.values()),
    },
  };
}
