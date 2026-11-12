/** Tax-inclusive amounts sent to a single PosAPI tax-type sub-receipt. */
export interface EbarimtVatLine {
  totalAmount: number;
  totalCityTax: number;
}

export interface EbarimtVatTotals {
  totalVAT: number;
  itemVAT: number[];
}

/** PosAPI validates each item and sub-receipt against its own tax-inclusive amount.
 * Their independently rounded VAT values may differ by a cent; never rebalance items.
 */
export function calculateEbarimtVat(
  items: readonly EbarimtVatLine[],
  vatPayer: boolean,
  taxType: string,
): EbarimtVatTotals {
  if (!vatPayer || taxType !== "VAT_ABLE") {
    return { totalVAT: 0, itemVAT: items.map(() => 0) };
  }

  const taxableAmounts = items.map((item) => {
    const amount = Math.round(item.totalAmount * 100);
    const cityTax = Math.round(item.totalCityTax * 100);
    if (
      !Number.isSafeInteger(amount) ||
      !Number.isSafeInteger(cityTax) ||
      amount < 0 ||
      cityTax < 0 ||
      cityTax > amount
    ) {
      throw new Error("eBarimt НӨАТ тооцох үнийн дүн буруу байна.");
    }
    return amount - cityTax;
  });
  const taxableTotal = taxableAmounts.reduce((sum, amount) => sum + amount, 0);
  if (!Number.isSafeInteger(taxableTotal)) {
    throw new Error("eBarimt НӨАТ тооцох үнийн дүнгийн хязгаар хэтэрсэн.");
  }
  const totalCents = Math.round(taxableTotal / 11);
  return {
    totalVAT: totalCents / 100,
    itemVAT: taxableAmounts.map((amount) => Math.round(amount / 11) / 100),
  };
}
