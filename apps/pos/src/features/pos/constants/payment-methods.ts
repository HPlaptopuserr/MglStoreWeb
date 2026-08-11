export const PAYMENT_METHODS = [
  { value: "CASH", label: "Бэлэн" },
  { value: "CARD", label: "Карт" },
  { value: "QR", label: "QR" },
  { value: "CREDIT", label: "Зээл" },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

export const POS_FUNCTION_SHORTCUTS = {
  F7: "PRINT_RECEIPT",
  F8: "CREDIT",
  F9: "CASH",
  F10: "CARD",
  F11: "QR",
  F12: "START_CHECKOUT",
} as const;

export type PosFunctionShortcutAction =
  (typeof POS_FUNCTION_SHORTCUTS)[keyof typeof POS_FUNCTION_SHORTCUTS];

export const PAYMENT_METHOD_SHORTCUTS: Record<
  PaymentMethod,
  keyof typeof POS_FUNCTION_SHORTCUTS
> = {
  CASH: "F9",
  CARD: "F10",
  QR: "F11",
  CREDIT: "F8",
};

export function getPosFunctionShortcutAction(
  key: string,
): PosFunctionShortcutAction | null {
  return (
    POS_FUNCTION_SHORTCUTS[
      key.toUpperCase() as keyof typeof POS_FUNCTION_SHORTCUTS
    ] ?? null
  );
}
