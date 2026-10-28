import type { PaymentMethod } from "../constants/payment-methods";

export interface PaymentFailureFeedback {
  kind: "failed" | "unknown";
  message: string;
}
export type PaymentFeedback = Partial<
  Record<PaymentMethod, PaymentFailureFeedback>
>;
export type PaymentDisplayStatus =
  | "success"
  | "failed"
  | "pending"
  | "unknown"
  | "unpaid"
  | "unused";
