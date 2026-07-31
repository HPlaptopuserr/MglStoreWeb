const DELIVERY_SIZE_CATEGORIES = new Set([
  "SMALL",
  "MEDIUM",
  "LARGE",
  "OVERSIZED",
]);

const positiveNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export function parseDeliveryPackageDetails(body: unknown) {
  const input =
    body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : ({} as Record<string, unknown>);
  const data = {
    packageCount: Math.floor(Number(input.packageCount)),
    totalWeightKg: positiveNumber(input.totalWeightKg),
    packageLengthCm: positiveNumber(input.packageLengthCm),
    packageWidthCm: positiveNumber(input.packageWidthCm),
    packageHeightCm: positiveNumber(input.packageHeightCm),
    sizeCategory:
      typeof input.sizeCategory === "string"
        ? input.sizeCategory.toUpperCase()
        : "",
    isFragile: input.isFragile === true,
    handlingInstructions:
      typeof input.handlingInstructions === "string"
        ? input.handlingInstructions.trim().slice(0, 500)
        : "",
  };

  const valid =
    Number.isInteger(data.packageCount) &&
    data.packageCount >= 1 &&
    data.totalWeightKg !== null &&
    data.packageLengthCm !== null &&
    data.packageWidthCm !== null &&
    data.packageHeightCm !== null &&
    DELIVERY_SIZE_CATEGORIES.has(data.sizeCategory);

  return valid ? { data, error: null } : { data: null, error: "INVALID" };
}
