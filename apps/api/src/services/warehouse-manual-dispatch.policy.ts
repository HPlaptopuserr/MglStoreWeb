import type {
  WarehouseDispatchPaymentMethod,
  WarehouseDispatchPaymentStatus,
} from "@mgl/types";

export class ManualDispatchError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly productId?: string,
  ) {
    super(message);
  }
}

function text(value: unknown, limit: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.trim().length > limit)
    throw new ManualDispatchError(
      "Хүлээн авагчийн мэдээллийн уртыг шалгана уу.",
    );
  return value.trim() || null;
}

function coordinate(value: unknown, min: number, max: number) {
  if (value === undefined || value === null || value === "") return null;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    throw new ManualDispatchError("Газрын зургийн координат буруу байна.");
  return value;
}

function parsePayment(body: Record<string, unknown>): {
  paymentStatus: WarehouseDispatchPaymentStatus | null;
  paymentMethod: WarehouseDispatchPaymentMethod | null;
  paymentNote: string | null;
} {
  const { paymentStatus, paymentMethod } = body;
  const paymentNote = text(body.paymentNote, 500);
  // Allow older clients during rollout without assuming that money was received.
  if (paymentStatus === undefined || paymentStatus === null) {
    if (paymentMethod != null || paymentNote !== null)
      throw new ManualDispatchError("Төлбөрийн төлөвөө сонгоно уу.");
    return { paymentStatus: null, paymentMethod: null, paymentNote: null };
  }
  if (paymentStatus !== "PAID" && paymentStatus !== "CREDIT")
    throw new ManualDispatchError("Төлбөрийн төлөв буруу байна.");
  if (paymentStatus === "CREDIT") {
    if (paymentMethod != null)
      throw new ManualDispatchError(
        "Зээлээр гаргахад төлбөрийн арга сонгохгүй.",
      );
    return { paymentStatus, paymentMethod: null, paymentNote };
  }
  if (
    paymentMethod !== "CASH" &&
    paymentMethod !== "BANK_TRANSFER" &&
    paymentMethod !== "CARD" &&
    paymentMethod !== "QPAY" &&
    paymentMethod !== "OTHER"
  )
    throw new ManualDispatchError("Төлсөн төлбөрийн аргаа сонгоно уу.");
  return { paymentStatus, paymentMethod, paymentNote };
}

export function parseManualDispatch(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ManualDispatchError("Гаргалтын мэдээлэл буруу байна.");
  const body = value as Record<string, unknown>;
  const storeName = text(body.storeName, 160);
  const recipientName = text(body.recipientName, 160);
  const recipientPhone = text(body.recipientPhone, 40);
  const address = text(body.address, 500);
  const lat = coordinate(body.lat, -90, 90),
    lng = coordinate(body.lng, -180, 180);
  // The deployed Warehouse client sends an address and pin without storeName.
  const legacyAddress =
    body.storeName === undefined && address && lat !== null && lng !== null;
  if (!legacyAddress && (!storeName || !recipientName || !recipientPhone))
    throw new ManualDispatchError(
      "Дэлгүүрийн нэр, хүлээн авагчийн нэр болон утсаа оруулна уу.",
    );
  if (
    recipientPhone &&
    (!/^[+\d\s()-]+$/.test(recipientPhone) ||
      !/^\d{8,15}$/.test(recipientPhone.replace(/\D/g, "")))
  )
    throw new ManualDispatchError("Хүлээн авагчийн утасны дугаар буруу байна.");
  if ((lat === null) !== (lng === null))
    throw new ManualDispatchError(
      "Байршлын хоёр координатыг хамтад нь сонгоно уу.",
    );
  const requestId = text(body.requestId, 36);
  if (
    requestId &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      requestId,
    )
  )
    throw new ManualDispatchError("Хүсэлтийн дугаар буруу байна.");
  if (
    !Array.isArray(body.items) ||
    !body.items.length ||
    body.items.length > 200
  )
    throw new ManualDispatchError("1–200 төрлийн гаргах бараа сонгоно уу.");
  const items = body.items
    .map((raw: unknown) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw))
        throw new ManualDispatchError("Барааны мэдээлэл буруу байна.");
      const item = raw as Record<string, unknown>;
      if (
        typeof item.productId !== "string" ||
        !item.productId.trim() ||
        typeof item.quantity !== "number" ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity <= 0 ||
        item.quantity > 1000000000
      )
        throw new ManualDispatchError(
          "Гаргах бараа болон тоо ширхэг буруу байна.",
        );
      return { productId: item.productId.trim(), quantity: item.quantity };
    })
    .sort((a, b) => a.productId.localeCompare(b.productId));
  if (new Set(items.map((item) => item.productId)).size !== items.length)
    throw new ManualDispatchError("Нэг барааг давхар оруулах боломжгүй.");
  return {
    storeName: storeName || (legacyAddress ? recipientName || address : null),
    recipientName,
    recipientPhone,
    lat,
    lng,
    requestId,
    address,
    ...parsePayment(body),
    reason: text(body.reason, 250),
    note: text(body.note, 1000),
    items,
  };
}

export function parseDispatchHistoryQuery(query: Record<string, unknown>) {
  const page = query.page === undefined ? 1 : Number(query.page);
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000)
    throw new ManualDispatchError("Жагсаалтын хуудас буруу байна.");
  return {
    page,
    pageSize: 10,
    search:
      typeof query.search === "string" ? query.search.trim().slice(0, 120) : "",
  };
}
