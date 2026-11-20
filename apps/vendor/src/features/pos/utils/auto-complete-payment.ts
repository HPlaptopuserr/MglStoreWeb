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

/** Resumption only finalizes saved funds; it never dispatches a bank request. */
export function canResumePaidCheckout({
  hasConfirmedBankPayment, canFinalizeSale, hasBasket,
}: { hasConfirmedBankPayment: boolean; canFinalizeSale: boolean; hasBasket: boolean }): boolean {
  return hasConfirmedBankPayment && canFinalizeSale && hasBasket;
}
