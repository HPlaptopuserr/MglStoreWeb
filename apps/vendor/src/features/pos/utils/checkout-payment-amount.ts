import { parseCashReceivedAmount } from "@mgl/types";

export interface CheckoutPaymentAmount {
  amount: number;
  balanceAfter: number;
  partial: boolean;
  error: string;
}

/** Bank payments must use the chosen amount exactly, never silently clamp it. */
export function checkoutPaymentAmount(
  input: string,
  remaining: number,
): CheckoutPaymentAmount {
  const balance = Math.round(remaining * 100);
  const invalid = (error: string): CheckoutPaymentAmount => ({
    amount: 0,
    balanceAfter: Math.max(0, remaining),
    partial: false,
    error,
  });
  if (!Number.isFinite(remaining) || balance <= 0) return invalid("");
  let amount: number;
  try {
    amount = input.trim() ? parseCashReceivedAmount(input) : remaining;
  } catch {
    return invalid(
      "Төлөх дүнгээ энгийн тоогоор, хамгийн ихдээ хоёр бутархай оронтой оруулна уу.",
    );
  }
  const cents = Math.round(amount * 100);
  if (cents <= 0) return invalid("Төлөх дүн 0-оос их байна.");
  if (cents > balance) return invalid("Төлөх дүн үлдэгдлээс их байж болохгүй.");
  return {
    amount: cents / 100,
    balanceAfter: (balance - cents) / 100,
    partial: cents < balance,
    error: "",
  };
}
