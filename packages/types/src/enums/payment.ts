export enum PaymentStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
  CANCELLED = "CANCELLED",
}

export enum PaymentMethod {
  CASH = "CASH",
  CARD = "CARD",
  CREDIT = "CREDIT",
  QPAY = "QPAY",
  BANK_TRANSFER = "BANK_TRANSFER",
}
