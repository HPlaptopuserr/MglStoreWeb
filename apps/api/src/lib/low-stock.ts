export function normalizeLowStockThreshold(
  value: unknown,
  unit: unknown,
  fallback = 5,
) {
  const parsed =
    value === undefined || value === null || value === ""
      ? fallback
      : Number(value);
  const isKilogram =
    String(unit ?? "")
      .trim()
      .toLowerCase() === "kg";
  const maximum = isKilogram ? 2_147_483.647 : 2_147_483_647;
  const hasValidPrecision = isKilogram
    ? Math.abs(parsed * 1_000 - Math.round(parsed * 1_000)) <= 0.000001
    : Number.isInteger(parsed);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0 ||
    parsed > maximum ||
    !hasValidPrecision
  ) {
    return undefined;
  }

  return parsed;
}

export function isLowStock(quantity: unknown, threshold: unknown) {
  const normalizedQuantity = Number(quantity);
  const normalizedThreshold = Number(threshold);
  return (
    Number.isFinite(normalizedQuantity) &&
    Number.isFinite(normalizedThreshold) &&
    normalizedQuantity <= normalizedThreshold
  );
}
