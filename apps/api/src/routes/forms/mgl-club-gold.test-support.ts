/** Test-only verified payment fixture; never creates a provider invoice. */
export function activeGoldInvoice(companyId: string) {
  return {
    id: "verified-test-gold-invoice",
    saleReference: `MGL_CLUB_GOLD:${companyId}`,
    status: "PAID",
    amount: 1_200_000,
    paidAt: new Date(Date.now() - 24 * 60 * 60_000),
    webhookPayload: {
      kind: "MGL_CLUB_GOLD",
      accessExpiresAt: new Date(
        Date.now() + 30 * 24 * 60 * 60_000,
      ).toISOString(),
    },
  };
}
