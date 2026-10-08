export type PosDiscountProfileType = "REGULAR_CUSTOMER" | "EMPLOYEE";

const TRUE_VALUES = new Set(["1", "true", "on", "yes"]);

export function resolvePosDiscountProfileType(
  enabledValue: unknown,
  modeValue: unknown,
): PosDiscountProfileType | null {
  const enabled = TRUE_VALUES.has(
    String(enabledValue ?? "")
      .trim()
      .toLowerCase(),
  );
  if (!enabled) return null;

  const mode = String(modeValue ?? "RESTAURANT")
    .trim()
    .toUpperCase();
  return mode === "CAFE" ? "REGULAR_CUSTOMER" : "EMPLOYEE";
}
