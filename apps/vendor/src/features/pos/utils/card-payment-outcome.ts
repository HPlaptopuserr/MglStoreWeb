import type { CardAttemptStatus } from "@mgl/types";

export function cardRequestFailureIsDefinitive(input: {
  hasAttemptId: boolean;
  authorizationAccepted: boolean;
  httpStatus: number;
}): boolean {
  if (input.authorizationAccepted) return false;
  return !input.hasAttemptId || [400, 401, 403, 404, 422].includes(input.httpStatus);
}

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
