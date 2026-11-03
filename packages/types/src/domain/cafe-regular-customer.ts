export type CafeRegularCustomerDiscountLine = {
  unitPrice: number;
  quantity: number;
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;

export function normalizeCafeRegularCustomerPhone(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");
  const localPhone =
    digits.length === 11 && digits.startsWith("976") ? digits.slice(3) : digits;
  return /^\d{8}$/.test(localPhone) ? localPhone : null;
}

export function normalizeCafeRegularCustomerDiscount(value: unknown) {
  if (value == null || String(value).trim() === "") return null;
  const percent = Number(value);
  if (
    !Number.isFinite(percent) ||
    percent < 0 ||
    percent > 100 ||
    Math.abs(percent * 100 - Math.round(percent * 100)) > 0.000001
  ) {
    return null;
  }
  return Math.round(percent * 100) / 100;
}

export function calculateCafeRegularCustomerUnitDiscount(
  unitPrice: number,
  discountPercent: number,
) {
  const price = Number(unitPrice);
  const percent = normalizeCafeRegularCustomerDiscount(discountPercent);
  if (!Number.isFinite(price) || price <= 0 || percent === null) return 0;
  return roundMoney((price * percent) / 100);
}

export function calculateCafeRegularCustomerDiscount(
  lines: CafeRegularCustomerDiscountLine[],
  discountPercent: number,
) {
  return roundMoney(
    lines.reduce(
      (sum, line) =>
        sum +
        calculateCafeRegularCustomerUnitDiscount(
          line.unitPrice,
          discountPercent,
        ) *
          Number(line.quantity || 0),
      0,
    ),
  );
}
