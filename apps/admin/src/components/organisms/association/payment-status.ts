export type AssociationPaymentStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "CANCELLED";

export const PAYMENT_STATUS_LABELS: Record<AssociationPaymentStatus, string> = {
  PENDING: "Хүлээгдэж буй",
  PAID: "Төлсөн",
  FAILED: "Амжилтгүй",
  REFUNDED: "Буцаагдсан",
  CANCELLED: "Цуцлагдсан",
};

export const PAYMENT_STATUS_BADGE_LABELS: Record<
  AssociationPaymentStatus,
  string
> = {
  PENDING: "Төлбөр хүлээгдэж буй",
  PAID: "Төлсөн",
  FAILED: "Амжилтгүй",
  REFUNDED: "Буцаагдсан",
  CANCELLED: "Цуцлагдсан",
};

export const PAYMENT_STATUS_COLORS: Record<AssociationPaymentStatus, string> = {
  PENDING: "text-amber-700 bg-amber-50 border-amber-200",
  PAID: "text-emerald-700 bg-emerald-50 border-emerald-200",
  FAILED: "text-red-700 bg-red-50 border-red-200",
  REFUNDED: "text-blue-700 bg-blue-50 border-blue-200",
  CANCELLED: "text-slate-600 bg-slate-50 border-slate-200",
};

export const PAYMENT_STATUS_FILTERS: {
  value: AssociationPaymentStatus | "";
  label: string;
}[] = [
  { value: "", label: "Бүх төлбөр" },
  { value: "PAID", label: PAYMENT_STATUS_LABELS.PAID },
  { value: "PENDING", label: PAYMENT_STATUS_LABELS.PENDING },
  { value: "FAILED", label: PAYMENT_STATUS_LABELS.FAILED },
  { value: "REFUNDED", label: PAYMENT_STATUS_LABELS.REFUNDED },
  { value: "CANCELLED", label: PAYMENT_STATUS_LABELS.CANCELLED },
];
