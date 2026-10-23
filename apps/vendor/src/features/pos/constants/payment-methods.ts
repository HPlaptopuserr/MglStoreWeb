export const PAYMENT_METHODS = [
  { value: "CASH", label: "Бэлэн" },
  { value: "CARD", label: "Карт" },
  { value: "QR", label: "QR" },
  { value: "CREDIT", label: "Зээл" },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

export const PAYMENT_SHORTCUTS: Record<PaymentMethod, string> = {
  CASH: "F9",
  CARD: "F10",
  QR: "F11",
  CREDIT: "F8",
};

export function paymentMethodForKey(key: string): PaymentMethod | undefined {
  return PAYMENT_METHODS.find(
    (method) => PAYMENT_SHORTCUTS[method.value] === key,
  )?.value;
}
