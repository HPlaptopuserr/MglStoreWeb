/** Format payment text at display boundaries without rewriting persisted records. */
export function formatPaymentBranding(text: string | null | undefined): string {
  return (text ?? "").replace(/\bqpay\b/gi, "Minu");
}
