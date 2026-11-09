import { Prisma } from "@mgl/database";
import { normalizePosMeasureUnit, toPosStoredStockQuantity } from "@mgl/types";
import { lockOrganizationInventory } from "./vendor-inventory-warehouse.service";
import { assertProductInventoryOwnership } from "./warehouse-product-ownership";

export interface CardCheckoutLine {
  productId: string;
  qty: number;
  unitPrice: number;
  priceType?: "UNIT" | "WHOLESALE" | "ORDER";
  discountAmount?: number;
}
export interface CardCheckout {
  clientSaleId: string;
  branchId: string;
  shiftId: string;
  lines: CardCheckoutLine[];
}
function fail(message: string): never {
  throw { status: 409, message };
}

export function parseCardCheckout(value: unknown): CardCheckout {
  if (!value || typeof value !== "object")
    return fail("Сагсны мэдээлэл буруу байна");
  const input = value as Record<string, unknown>;
  if (
    ![input.clientSaleId, input.branchId, input.shiftId].every(
      (v) => typeof v === "string" && v.trim().length > 0,
    ) ||
    !Array.isArray(input.lines) ||
    input.lines.length === 0 ||
    input.lines.length > 500
  )
    return fail("Сагс, кассын ээлжийн мэдээлэл дутуу байна");
  const lines = input.lines.map((value: unknown): CardCheckoutLine => {
    if (!value || typeof value !== "object")
      return fail("Сагсны мөр буруу байна");
    const line = value as Record<string, unknown>;
    if (
      typeof line.productId !== "string" ||
      !line.productId.trim() ||
      typeof line.qty !== "number" ||
      !Number.isFinite(line.qty) ||
      line.qty <= 0 ||
      Math.abs(line.qty * 1000 - Math.round(line.qty * 1000)) > 0.000001 ||
      typeof line.unitPrice !== "number" ||
      !Number.isSafeInteger(Math.round(line.unitPrice * 100)) ||
      line.unitPrice < 0 ||
      Math.abs(line.unitPrice * 100 - Math.round(line.unitPrice * 100)) >
        0.000001 ||
      (line.priceType !== undefined &&
        !["UNIT", "WHOLESALE", "ORDER"].includes(String(line.priceType)))
    )
      return fail("Сагсны үнэ, тоо хэмжээ буруу байна");
    const discountAmount = line.discountAmount ?? 0;
    if (
      typeof discountAmount !== "number" ||
      !Number.isFinite(discountAmount) ||
      discountAmount < 0 ||
      discountAmount > line.unitPrice
    )
      return fail("Сагсны хөнгөлөлт буруу байна");
    return {
      productId: line.productId,
      qty: line.qty,
      unitPrice: line.unitPrice,
      priceType: (line.priceType ?? "UNIT") as CardCheckoutLine["priceType"],
      discountAmount,
    };
  });
  if (new Set(lines.map((l) => l.productId)).size !== lines.length)
    return fail("Сагсанд давхардсан бараа байна");
  return {
    clientSaleId: input.clientSaleId as string,
    branchId: input.branchId as string,
    shiftId: input.shiftId as string,
    lines,
  };
}

export function checkoutFromPayload(
  payload: Prisma.JsonValue,
): CardCheckout | null {
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    payload.provider !== "MINU_AGENT" ||
    !payload.checkout
  )
    return null;
  return parseCardCheckout(payload.checkout);
}

export function sameCheckout(a: CardCheckout, b: CardCheckout): boolean {
  const normalized = (c: CardCheckout) =>
    JSON.stringify({
      clientSaleId: c.clientSaleId,
      branchId: c.branchId,
      shiftId: c.shiftId,
      lines: [...c.lines]
        .map((l) => ({
          productId: l.productId,
          qty: l.qty,
          unitPrice: l.unitPrice,
          priceType: l.priceType ?? "UNIT",
          discountAmount: l.discountAmount ?? 0,
        }))
        .sort((x, y) => x.productId.localeCompare(y.productId)),
    });
  return normalized(a) === normalized(b);
}

export async function reserveCardCheckout(
  tx: Prisma.TransactionClient,
  input: {
    checkout: CardCheckout;
    organizationId: string;
    registerId: string;
    amount: number;
    cashierId: string;
  },
): Promise<void> {
  const { checkout, organizationId, registerId, amount } = input;
  await lockOrganizationInventory(tx, organizationId);
  const completedSale = await tx.posSaleIdempotency.findUnique({ where: {
    organizationId_clientSaleId: { organizationId, clientSaleId: checkout.clientSaleId },
  } });
  if (completedSale) fail("Энэ борлуулалт бүртгэгдсэн эсвэл боловсруулагдаж байна. Дахин төлбөр авахгүй.");
  const register = await tx.posRegister.findUnique({
    where: { id: registerId },
    select: { branchId: true, mode: true },
  });
  const shift = await tx.posShift.findFirst({
    where: {
      id: checkout.shiftId,
      organizationId,
      branchId: checkout.branchId,
      registerId,
      status: "OPEN",
      cashierId: input.cashierId,
      mode: "RETAIL",
    },
  });
  if (
    register?.mode !== "RETAIL" ||
    register.branchId !== checkout.branchId ||
    !shift
  )
    fail("Касс, салбар, нээлттэй ээлжээ шалгана уу");
  const previous = await tx.cardPaymentAttempt.findFirst({
    where: {
      organizationId,
      registerId,
      status: { in: ["PENDING", "APPROVED", "FAILED"] },
      providerPayload: {
        path: ["checkout", "clientSaleId"],
        equals: checkout.clientSaleId,
      },
    },
  });
  const frozen = previous
    ? checkoutFromPayload(previous.providerPayload)
    : null;
  const unresolved = await tx.cardPaymentAttempt.findFirst({ where: {
    organizationId, status: { in: ["PENDING", "FAILED"] }, consumedAt: null,
    providerPayload: { path: ["checkout", "clientSaleId"], equals: checkout.clientSaleId },
  } });
  if (unresolved) fail("Энэ сагсны өмнөх картын төлбөр шалгагдаж байна. Дахин төлбөр авахгүй.");
  if (frozen && !sameCheckout(frozen, checkout))
    fail("Төлбөртэй сагсны мэдээлэл өөрчлөгдсөн байна");
  const ids = checkout.lines.map((l) => l.productId).sort();
  await tx.$queryRaw(
    Prisma.sql`SELECT "id" FROM "Product" WHERE "id" IN (${Prisma.join(ids)}) ORDER BY "id" FOR UPDATE`,
  );
  await assertProductInventoryOwnership(tx, ids);
  const products = await tx.product.findMany({
    where: { id: { in: ids }, organizationId, isActive: true, deletedAt: null },
    select: {
      id: true,
      name: true,
      unit: true,
      stock: true,
      isRestaurantMenuItem: true,
      price: true,
      wholesalePrice: true,
      orderPrice: true,
    },
  });
  const setting = await tx.siteSetting.findUnique({
    where: { key: `multi-price-sales-enabled-${organizationId}` },
  });
  const multiPrice = ["1", "true", "on", "yes"].includes(
    String(setting?.value ?? "")
      .trim()
      .toLowerCase(),
  );
  let total = 0;
  for (const line of checkout.lines) {
    const product = products.find((p) => p.id === line.productId);
    if (!product || product.isRestaurantMenuItem)
      fail("Сагсны бараа олдсонгүй эсвэл retail бараа биш байна");
    const price =
      line.priceType === "WHOLESALE"
        ? product.wholesalePrice
        : line.priceType === "ORDER"
          ? product.orderPrice
          : product.price;
    if (
      !frozen &&
      ((!multiPrice && line.priceType !== "UNIT") ||
        price == null ||
        Math.round(Number(price) * 100) !== Math.round(line.unitPrice * 100))
    )
      fail(
        `"${product.name}" барааны үнэ шинэчлэгдсэн байна. Төлбөр эхлээгүй.`,
      );
    if (
      normalizePosMeasureUnit(product.unit) === "pcs" &&
      !Number.isInteger(line.qty)
    )
      fail("Барааны тоо ширхэг бүхэл байна");
    const quantity = toPosStoredStockQuantity(line.qty, product.unit);
    if (
      !Number.isSafeInteger(quantity) ||
      quantity <= 0 ||
      quantity > 2_147_483_647
    )
      fail("Барааны тоо хэмжээ зөвшөөрөгдөх хязгаараас их байна");
    const reserved = await tx.posCardStockReservation.aggregate({
      where: {
        productId: product.id,
        NOT: { organizationId, clientSaleId: checkout.clientSaleId },
      },
      _sum: { quantity: true },
    });
    if (product.stock - (reserved._sum.quantity ?? 0) < quantity)
      fail(
        `"${product.name}" барааны боломжит нөөц хүрэлцэхгүй. Төлбөр эхлээгүй.`,
      );
    total += (line.unitPrice - (line.discountAmount ?? 0)) * line.qty;
    await tx.posCardStockReservation.upsert({
      where: {
        organizationId_clientSaleId_productId: {
          organizationId,
          clientSaleId: checkout.clientSaleId,
          productId: product.id,
        },
      },
      create: {
        organizationId,
        registerId,
        clientSaleId: checkout.clientSaleId,
        productId: product.id,
        quantity,
      },
      update: {},
    });
  }
  const approved = await tx.cardPaymentAttempt.aggregate({
    where: {
      organizationId,
      status: "APPROVED",
      consumedAt: null,
      providerPayload: {
        path: ["checkout", "clientSaleId"],
        equals: checkout.clientSaleId,
      },
    },
    _sum: { amount: true },
  });
  if (
    Math.round((Number(approved._sum.amount ?? 0) + amount) * 100) >
    Math.round(total * 100)
  )
    fail("Картын төлбөр сагсны нийт дүнгээс их байна");
}
