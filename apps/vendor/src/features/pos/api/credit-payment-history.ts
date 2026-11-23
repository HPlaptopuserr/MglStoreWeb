import { posRequest } from "./_pos-client";
export type CreditPaymentHistoryItem = {
  id: string;
  createdAt: string;
  requestId: string | null;
  paidAmount: number;
  paymentMethod: string;
  shiftId: string | null;
  invoiceId: string | null;
  attemptId: string | null;
  allocations: Array<{ creditSaleId: string; amount: number }>;
  borrowerNames: string[];
  remainingDue: number | null;
  ebarimt: unknown;
};
export type CreditPaymentHistoryPage = {
  payments: CreditPaymentHistoryItem[];
  nextCursor: string | null;
};
export function getCreditPaymentHistory(
  organizationId: string,
  cursor: string,
  signal: AbortSignal,
) {
  const params = new URLSearchParams({ organizationId, limit: "50" });
  if (cursor) params.set("cursor", cursor);
  return posRequest<CreditPaymentHistoryPage>(
    `/pos/credit-payments?${params.toString()}`,
    { signal },
  );
}
