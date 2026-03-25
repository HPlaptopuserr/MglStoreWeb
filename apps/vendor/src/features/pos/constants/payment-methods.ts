export const PAYMENT_METHODS = [
  { value: "CASH", label: "Бэлэн" },
  { value: "CARD", label: "Карт" },
  { value: "QR", label: "QR" },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];
