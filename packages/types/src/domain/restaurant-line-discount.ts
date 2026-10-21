export const RESTAURANT_LINE_DISCOUNT_PERCENTS = [0, 10, 20, 30, 40] as const;
export type RestaurantLineDiscountPercent =
  (typeof RESTAURANT_LINE_DISCOUNT_PERCENTS)[number];

export function isRestaurantLineDiscountPercent(
  value: unknown,
): value is RestaurantLineDiscountPercent {
  return (
    typeof value === "number" &&
    RESTAURANT_LINE_DISCOUNT_PERCENTS.some((percent) => percent === value)
  );
}

/** Only the explicitly selected and saved rate applies to restaurant ticket lines. */
export function calculateRestaurantSelectedUnitDiscount({
  unitPrice,
  discountPercent = 0,
}: {
  unitPrice: number;
  discountPercent?: number;
}): number {
  if (
    !Number.isFinite(unitPrice) ||
    unitPrice <= 0 ||
    !isRestaurantLineDiscountPercent(discountPercent)
  )
    return 0;
  return Math.round(unitPrice * discountPercent) / 100;
}
