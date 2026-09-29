export interface PaymentRequestIdentity {
  organizationId: string | null;
  registerId: string | null;
  amount: number | { toString(): string };
}

export function isPaymentRequestId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function matchesPaymentRequest(existing: PaymentRequestIdentity, requested: PaymentRequestIdentity): boolean {
  const amount = Number(requested.amount);
  return Number.isFinite(amount) && amount > 0 &&
    existing.organizationId === requested.organizationId &&
    existing.registerId === requested.registerId &&
    Number(existing.amount) === amount;
}
