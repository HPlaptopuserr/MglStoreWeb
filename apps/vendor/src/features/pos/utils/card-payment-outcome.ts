import type { CardAttemptStatus } from "@mgl/types";

/** A lost response is not evidence that a bank payment failed. */
export function cardPaymentOutcome(
  status: CardAttemptStatus,
  message?: string,
): "confirmed" | "failed" | "pending" {
  if (status === "APPROVED") return "confirmed";
  if (status === "PENDING") return "pending";
  if (
    status === "FAILED" &&
    /timeout|timed out|abort|fetch|network|ECONN|холболт|хугацаа/iu.test(
      message || "",
    )
  )
    return "pending";
  return "failed";
}
