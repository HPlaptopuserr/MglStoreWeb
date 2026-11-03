import type {
  PaymentDisplayStatus,
  PaymentFailureFeedback,
} from "../types/payment-status.types";

export function paymentDisplayStatus(
  status: "confirmed" | "pending" | "draft",
  amount: number,
  feedback?: PaymentFailureFeedback,
): PaymentDisplayStatus {
  if (status === "confirmed") return "success";
  if (status === "pending")
    return feedback?.kind === "unknown" ? "unknown" : "pending";
  if (amount <= 0) return "unused";
  return feedback?.kind ?? "unpaid";
}
