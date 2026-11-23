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
  hasConfirmedBankPayment, canFinalizeSale, hasBasket, blocked = false,
}: { hasConfirmedBankPayment: boolean; canFinalizeSale: boolean; hasBasket: boolean; blocked?: boolean }): boolean {
  return hasConfirmedBankPayment && canFinalizeSale && hasBasket && !blocked;
}

/** Only a plain full-QR basket contains all context needed by server recovery. */
export function canFinalizeQrWithoutBrowser(input: {
  amount: number;
  basketTotal: number;
  priorPaymentCount: number;
  loyaltyMode: string;
  companyReceipt: boolean;
  creditRepayment: boolean;
}): boolean {
  return Number.isFinite(input.amount) && Number.isFinite(input.basketTotal) &&
    input.amount > 0 && Math.round(input.amount * 100) === Math.round(input.basketTotal * 100) &&
    input.priorPaymentCount === 0 && input.loyaltyMode === "NONE" &&
    !input.companyReceipt && !input.creditRepayment;
}
