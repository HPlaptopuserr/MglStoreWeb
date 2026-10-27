export interface PurchaseScheduleRow {
  date: string;
  amount: string;
  kind: "DOWN_PAYMENT" | "MONTHLY" | "FULL_PAYMENT";
}
export interface PurchaseTerms {
  unitId: string;
  buyerEmail: string;
  customerName: string;
  customerPhone: string;
  total: string;
  terms: string;
  schedule: PurchaseScheduleRow[];
  requestKey: string;
}
export interface PurchaseSnapshot extends PurchaseTerms {
  project: string;
  block: string;
  floor: number;
  unitNo: string;
  area: string | null;
  seller: string;
}
export interface PurchaseContract {
  id: string;
  status: string;
  snapshot: PurchaseSnapshot;
  sellerAcceptedAt: string | null;
  buyerAcceptedAt: string | null;
  reservationId: string | null;
  createdAt: string;
}
export function moneyCents(value: string): bigint {
  if (!/^\d{1,14}(\.\d{1,2})?$/.test(value))
    throw new Error("Мөнгөн дүнг зөв оруулна уу.");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
}
export function centsMoney(value: bigint): string {
  return `${value / BigInt(100)}.${(value % BigInt(100)).toString().padStart(2, "0")}`;
}
export function validatePurchaseTerms(value: unknown): PurchaseTerms {
  if (!value || typeof value !== "object")
    throw new Error("Захиалгын мэдээлэл буруу.");
  const v = value as Record<string, unknown>;
  for (const key of [
    "unitId",
    "buyerEmail",
    "customerName",
    "customerPhone",
    "total",
    "terms",
    "requestKey",
  ]) {
    if (
      typeof v[key] !== "string" ||
      (v[key] as string).length > (key === "terms" ? 10000 : 254)
    )
      throw new Error("Талбаруудыг зөв бөглөнө үү.");
  }
  const p = v as unknown as PurchaseTerms;
  if (
    !p.unitId ||
    !p.requestKey ||
    !p.customerName.trim() ||
    !/^\S+@\S+\.\S+$/.test(p.buyerEmail) ||
    !p.terms.trim()
  )
    throw new Error("Байр, захиалагч, гэрээний нөхцөл шаардлагатай.");
  const total = moneyCents(p.total);
  if (
    total <= BigInt(0) ||
    !Array.isArray(p.schedule) ||
    !p.schedule.length ||
    p.schedule.length > 120
  )
    throw new Error("Үнэ, төлбөрийн хуваарь оруулна уу.");
  let sum = BigInt(0);
  let last = "";
  for (const row of p.schedule) {
    if (
      !row ||
      typeof row.date !== "string" ||
      typeof row.amount !== "string" ||
      !["DOWN_PAYMENT", "MONTHLY", "FULL_PAYMENT"].includes(row.kind)
    )
      throw new Error("Төлбөрийн мөр буруу.");
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(row.date) ||
      Number.isNaN(Date.parse(row.date)) ||
      new Date(row.date).toISOString().slice(0, 10) !== row.date ||
      row.date < last
    )
      throw new Error("Төлөх огноог өсөх дарааллаар зөв оруулна уу.");
    if (moneyCents(row.amount) <= BigInt(0))
      throw new Error("Төлөх дүн 0-ээс их байна.");
    last = row.date;
    sum += moneyCents(row.amount);
  }
  if (sum !== total)
    throw new Error("Хуваарийн нийлбэр нийт үнэтэй тэнцэх ёстой.");
  return p;
}
