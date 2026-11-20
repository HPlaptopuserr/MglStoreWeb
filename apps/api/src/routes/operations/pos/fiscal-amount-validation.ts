export function fiscalIdentityConflict(
  incoming: unknown,
  existing: { ebarimtBillId: string | null; ebarimtReceiptId: string | null },
): boolean {
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) return false;
  const value = incoming as Record<string, unknown>;
  return ([
    [value.billId, existing.ebarimtBillId],
    [value.receiptId, existing.ebarimtReceiptId],
  ] as const).some(([requested, stored]) =>
    typeof requested === "string" && Boolean(requested.trim()) && Boolean(stored) && requested.trim() !== stored,
  );
}

/** Validate arithmetic supplied by PosAPI without treating VAT as an extra charge. */
export function fiscalAmountError(payload: unknown, saleTotal: number): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const response = payload as Record<string, unknown>;
  if (!("totalAmount" in response)) return null; // Older PosAPI versions omit totals.
  const cents = (value: unknown): number | null => {
    if (typeof value !== "number" && typeof value !== "string") return null;
    if (typeof value === "string" && !/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
    const amount = Number(value);
    const minor = Math.round(amount * 100);
    return Number.isFinite(amount) && amount >= 0 && Number.isSafeInteger(minor) &&
      Math.abs(amount * 100 - minor) < 0.000001 ? minor : null;
  };
  const total = cents(response.totalAmount);
  if (total === null || total !== cents(saleTotal)) {
    return "eBarimt-ийн нийт дүн борлуулалтын дүнтэй таарахгүй байна. Баримтыг тулгаж шалгана уу.";
  }
  let tax = 0;
  for (const key of ["totalVAT", "totalCityTax"]) {
    if (!(key in response)) continue;
    const amount = cents(response[key]);
    if (amount === null) return "eBarimt-ийн татварын дүн буруу байна.";
    tax += amount;
  }
  if (tax > total) return "eBarimt-ийн татварын дүн нийт дүнгээс их байна.";
  if ("payments" in response) {
    if (!Array.isArray(response.payments)) return "eBarimt-ийн төлбөрийн задаргаа буруу байна.";
    let paid = 0;
    for (const value of response.payments) {
      if (!value || typeof value !== "object" || Array.isArray(value)) return "eBarimt-ийн төлбөрийн задаргаа буруу байна.";
      const amount = cents((value as Record<string, unknown>).paidAmount);
      if (amount === null) return "eBarimt-ийн төлбөрийн дүн буруу байна.";
      paid += amount;
    }
    if (!Number.isSafeInteger(paid) || paid !== total) return "eBarimt-ийн төлбөрийн нийлбэр нийт дүнтэй таарахгүй байна.";
  }
  return null;
}
