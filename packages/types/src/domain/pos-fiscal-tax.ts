/** Read only amounts actually returned by PosAPI, including stored response wrappers. */
export function readPosFiscalTaxTotals(payload: unknown): {
  totalVAT?: number;
  totalCityTax?: number;
} {
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    return {};
  const outer = payload as Record<string, unknown>;
  const response = outer.response;
  const source =
    response && typeof response === "object" && !Array.isArray(response)
      ? (response as Record<string, unknown>)
      : outer;
  const amount = (value: unknown): number | undefined => {
    if (typeof value !== "number" && typeof value !== "string")
      return undefined;
    if (typeof value === "string" && !/^\d+(?:\.\d{1,2})?$/.test(value))
      return undefined;
    const parsed = Number(value);
    const cents = Math.round(parsed * 100);
    return Number.isFinite(parsed) &&
      parsed >= 0 &&
      Number.isSafeInteger(cents) &&
      Math.abs(parsed * 100 - cents) < 0.000001
      ? cents / 100
      : undefined;
  };
  const totalVAT = amount(source.totalVAT);
  const totalCityTax = amount(source.totalCityTax);
  return {
    ...(totalVAT !== undefined ? { totalVAT } : {}),
    ...(totalCityTax !== undefined ? { totalCityTax } : {}),
  };
}
