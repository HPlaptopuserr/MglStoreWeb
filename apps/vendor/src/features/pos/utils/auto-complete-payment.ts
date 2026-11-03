interface PaymentCompletionInput {
  status: "confirmed" | "pending";
  amount: number;
  remaining: number;
  loyaltyReady: boolean;
}

/** Only a verified payment covering the entire current balance may finish a sale. */
export function canAutoCompletePayment({
  status,
  amount,
  remaining,
  loyaltyReady,
}: PaymentCompletionInput): boolean {
  return (
    status === "confirmed" &&
    loyaltyReady &&
    Number.isFinite(amount) &&
    Number.isFinite(remaining) &&
    amount > 0 &&
    remaining > 0 &&
    Math.round(amount * 100) === Math.round(remaining * 100)
  );
}
