/** Integer MNT arithmetic. Tax rates are business configuration, not legal advice. */
export interface PricingPolicy {
  usdMnt: number;
  fxAt: number;
  vatBps: number;
  incomeTaxReserveBps: number;
  qrFeeBps: number;
  fundingFeeBps: number;
  refundReserveBps: number;
  additionalSupplierTaxBps: number;
  overheadPerOrderMnt: number;
  profitMarkupBps: number;
  roundingMnt: number;
}
export interface PriceBreakdown {
  totalMnt: number;
  supplierCostMnt: number;
  fundingFeeMnt: number;
  supplierTaxReserveMnt: number;
  refundReserveMnt: number;
  overheadMnt: number;
  vatMnt: number;
  qrFeeMnt: number;
  incomeTaxReserveMnt: number;
  estimatedProfitMnt: number;
}
const BP = 10000n;
const ceil = (a: bigint, b: bigint) => (a + b - 1n) / b;
function natural(value: number, name: string): bigint {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error(`Invalid ${name}`);
  return BigInt(value);
}
export function priceOffer(
  usdTenThousandths: number,
  policy: PricingPolicy,
  now = Date.now(),
): PriceBreakdown {
  if (
    !Number.isFinite(policy.usdMnt) ||
    policy.usdMnt <= 0 ||
    policy.usdMnt > 1000000 ||
    !Number.isFinite(policy.fxAt) ||
    now - policy.fxAt > 86400000 ||
    policy.fxAt > now + 60000
  ) {
    throw new Error("Missing or expired FX rate");
  }
  const costUsd = natural(usdTenThousandths, "supplier price");
  if (costUsd === 0n) throw new Error("Supplier price must be positive");
  for (const field of [
    "vatBps",
    "incomeTaxReserveBps",
    "qrFeeBps",
    "fundingFeeBps",
    "refundReserveBps",
    "additionalSupplierTaxBps",
    "profitMarkupBps",
  ] as const) {
    natural(policy[field], field);
    if (policy[field] > 10000) throw new Error(`Invalid ${field}`);
  }
  if (policy.incomeTaxReserveBps === 10000)
    throw new Error("Unachievable profit policy");
  const rounding = natural(policy.roundingMnt, "rounding");
  if (rounding === 0n) throw new Error("Rounding must be positive");
  const supplier = ceil(
    costUsd * BigInt(Math.ceil(policy.usdMnt * 100)),
    1000000n,
  );
  const funding = ceil(supplier * BigInt(policy.fundingFeeBps), BP);
  const supplierTax = ceil(
    supplier * BigInt(policy.additionalSupplierTaxBps),
    BP,
  );
  const reserve = ceil(
    (supplier + funding + supplierTax) * BigInt(policy.refundReserveBps),
    BP,
  );
  const overhead = natural(policy.overheadPerOrderMnt, "overhead");
  const base = supplier + funding + supplierTax + reserve + overhead;
  const vatRate = BigInt(policy.vatBps);
  const feeRate = BigInt(policy.qrFeeBps);
  const taxRate = BigInt(policy.incomeTaxReserveBps);
  const markup = BigInt(policy.profitMarkupBps);
  const remainingTax = BP - taxRate;
  // Net contribution must grow faster than the requested markup on payment fees.
  if (
    BP * BP * remainingTax <=
    (BP + vatRate) * feeRate * (remainingTax + markup)
  ) {
    throw new Error("Unachievable profit policy");
  }
  function breakdown(total: bigint) {
    const vat = ceil(total * vatRate, BP + vatRate);
    const qr = ceil(total * feeRate, BP);
    const operatingProfit = total - vat - qr - base;
    const incomeTax =
      operatingProfit > 0n ? ceil(operatingProfit * taxRate, BP) : 0n;
    return { vat, qr, incomeTax, profit: operatingProfit - incomeTax };
  }
  // Conservative closed-form bound, including four MNT for per-line rounding.
  const denominator =
    BP * BP * remainingTax - (BP + vatRate) * feeRate * (remainingTax + markup);
  let total = ceil(
    (base * (remainingTax + markup) + 4n * BP) * (BP + vatRate) * BP,
    denominator,
  );
  total = ceil(total, rounding) * rounding;
  let result = breakdown(total);
  while (result.profit * BP < (base + result.qr) * markup) {
    total += rounding;
    result = breakdown(total);
  }
  const safeNumber = (value: bigint) => {
    if (value > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error("Price exceeds safe limit");
    return Number(value);
  };
  return {
    totalMnt: safeNumber(total),
    supplierCostMnt: safeNumber(supplier),
    fundingFeeMnt: safeNumber(funding),
    supplierTaxReserveMnt: safeNumber(supplierTax),
    refundReserveMnt: safeNumber(reserve),
    overheadMnt: safeNumber(overhead),
    vatMnt: safeNumber(result.vat),
    qrFeeMnt: safeNumber(result.qr),
    incomeTaxReserveMnt: safeNumber(result.incomeTax),
    estimatedProfitMnt: safeNumber(result.profit),
  };
}
export function monthlyResult(
  contributionMnt: number,
  orders: number,
  fixedCostMnt: number,
): number {
  const contribution = natural(contributionMnt, "contribution");
  const count = natural(orders, "orders");
  const fixed = natural(fixedCostMnt, "fixed cost");
  const result = contribution * count - fixed;
  if (result > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error("Result exceeds safe limit");
  return Number(result);
}
