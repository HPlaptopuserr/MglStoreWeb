import { posRequest, PosApiError } from "./_pos-client";

/** Do not send a financial request to an API that cannot preserve its request ID. */
export async function requirePaymentRecoverySupport(): Promise<void> {
  try {
    const result = await posRequest<{ paymentRecoveryVersion?: number }>("/pos/payments/capabilities", {
      signal: AbortSignal.timeout(10_000),
    });
    if (result.paymentRecoveryVersion === 1) return;
  } catch {
    // No charge was attempted. This error is safe to clear from checkout.
  }
  throw new PosApiError("Төлбөрийн API шинэчлэгдээгүй эсвэл холболтгүй байна. Төлбөр эхлээгүй. Дахин шалгана уу.", 409, "PAYMENT_NOT_STARTED");
}
