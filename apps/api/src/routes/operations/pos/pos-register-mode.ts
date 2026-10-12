export const POS_REGISTER_MODES = [
  "RETAIL",
  "RESTAURANT",
  "SELF_SERVICE",
] as const;

export type PosRegisterModeValue = (typeof POS_REGISTER_MODES)[number];

export function normalizePosRegisterMode(
  value: unknown,
): PosRegisterModeValue | null {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();
  return POS_REGISTER_MODES.includes(normalized as PosRegisterModeValue)
    ? (normalized as PosRegisterModeValue)
    : null;
}

export function getRequestedShiftMode(source: unknown): PosRegisterModeValue {
  const normalized = String(source ?? "")
    .trim()
    .toUpperCase();
  if (normalized === "SELF_SERVICE") return "SELF_SERVICE";
  if (normalized === "RESTAURANT") return "RESTAURANT";
  return "RETAIL";
}

export function getRequiredSaleRegisterMode(input: {
  isSelfService: boolean;
  restaurantTicketId: string | null;
}): PosRegisterModeValue {
  if (input.isSelfService) return "SELF_SERVICE";
  if (input.restaurantTicketId) return "RESTAURANT";
  return "RETAIL";
}

export function buildShiftModeScope(mode: PosRegisterModeValue) {
  return { mode };
}

export function usesRestaurantTicketLifecycle(input: {
  shiftMode: PosRegisterModeValue;
}) {
  return input.shiftMode !== "RETAIL";
}
