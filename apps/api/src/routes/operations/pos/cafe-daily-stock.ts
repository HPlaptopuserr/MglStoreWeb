const ULAANBAATAR_OFFSET_MINUTES = 8 * 60;
const DAY_MS = 24 * 60 * 60 * 1000;

export type CafeDailyStockNumbers = {
  openingQty: number;
  receivedQty: number;
  soldQty: number;
  wasteQty: number;
};

export function parseCafeBusinessDate(value: unknown) {
  const dateKey = String(value ?? "").trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utcMidnightMs = Date.UTC(year, month - 1, day);
  const validationDate = new Date(utcMidnightMs);
  if (
    validationDate.getUTCFullYear() !== year ||
    validationDate.getUTCMonth() !== month - 1 ||
    validationDate.getUTCDate() !== day
  ) {
    return null;
  }

  const startMs = utcMidnightMs - ULAANBAATAR_OFFSET_MINUTES * 60 * 1000;
  return {
    dateKey,
    databaseDate: new Date(utcMidnightMs),
    startUtc: new Date(startMs),
    endUtc: new Date(startMs + DAY_MS),
  };
}

export function roundCafeQuantity(value: number) {
  return Math.round((Number(value) || 0) * 1000) / 1000;
}

export function calculateCafeRemaining(input: CafeDailyStockNumbers) {
  return roundCafeQuantity(
    input.openingQty + input.receivedQty - input.soldQty - input.wasteQty,
  );
}

export function calculateCafeTotals(items: CafeDailyStockNumbers[]) {
  const totals = items.reduce(
    (sum, item) => ({
      openingQty: sum.openingQty + item.openingQty,
      receivedQty: sum.receivedQty + item.receivedQty,
      soldQty: sum.soldQty + item.soldQty,
      wasteQty: sum.wasteQty + item.wasteQty,
    }),
    { openingQty: 0, receivedQty: 0, soldQty: 0, wasteQty: 0 },
  );
  return {
    openingQty: roundCafeQuantity(totals.openingQty),
    receivedQty: roundCafeQuantity(totals.receivedQty),
    soldQty: roundCafeQuantity(totals.soldQty),
    wasteQty: roundCafeQuantity(totals.wasteQty),
    remainingQty: calculateCafeRemaining(totals),
  };
}

export function sumCafeReceivedQuantities(
  receipts: Array<{
    productId: string;
    quantity: number;
    voidedAt?: Date | string | null;
  }>,
) {
  const totals = new Map<string, number>();
  for (const receipt of receipts) {
    if (receipt.voidedAt) continue;
    totals.set(
      receipt.productId,
      roundCafeQuantity(
        (totals.get(receipt.productId) ?? 0) + Number(receipt.quantity),
      ),
    );
  }
  return totals;
}
