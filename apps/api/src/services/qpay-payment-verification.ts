import type { QPayPaymentCheckResponse } from "./qpay";

/** Only a complete, successful provider payment can settle an invoice. */
export function verifiedQPayPaymentId(result: QPayPaymentCheckResponse, amount: number): string | null {
  if (!Number.isFinite(amount) || amount <= 0 || !Array.isArray(result.rows)) return null;
  const paid = result.rows.filter(row =>
    ["PAID", "SUCCESS"].includes(String(row.payment_status).toUpperCase()) &&
    Boolean(row.payment_id) && Number.isFinite(Number(row.payment_amount)) && Number(row.payment_amount) > 0,
  );
  if (!paid.length || new Set(paid.map(row => row.payment_id)).size !== paid.length) return null;
  const total = paid.reduce((sum, row) => sum + Number(row.payment_amount), 0);
  if (Math.abs(total - amount) > 0.01 || !Number.isFinite(Number(result.paid_amount)) ||
      Math.abs(Number(result.paid_amount) - amount) > 0.01) return null;
  return paid[0].payment_id;
}
