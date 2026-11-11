/** Tax-inclusive amounts sent to a single PosAPI tax-type sub-receipt. */
export interface EbarimtVatLine {
  totalAmount: number;
  totalCityTax: number;
}

export interface EbarimtVatAllocation {
  totalVAT: number;
  itemVAT: number[];
}

/** Round once per sub-receipt, distributing fractional cents deterministically. */
export function allocateEbarimtVat(
  items: readonly EbarimtVatLine[],
  vatPayer: boolean,
  taxType: string,
): EbarimtVatAllocation {
  if (!vatPayer || taxType !== "VAT_ABLE") {
    return { totalVAT: 0, itemVAT: items.map(() => 0) };
  }

  const bases = items.map((item, index) => {
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
    const taxable = amount - cityTax;
    return {
      index,
      taxable,
      cents: Math.floor(taxable / 11),
      remainder: taxable % 11,
    };
  });
  const taxableTotal = bases.reduce((sum, item) => sum + item.taxable, 0);
  if (!Number.isSafeInteger(taxableTotal)) {
    throw new Error("eBarimt НӨАТ тооцох үнийн дүнгийн хязгаар хэтэрсэн.");
  }
  const totalCents = Math.round(taxableTotal / 11);
  const itemCents = bases.map((item) => item.cents);
  const extraCents =
    totalCents - itemCents.reduce((sum, amount) => sum + amount, 0);
  const ranked = [...bases].sort(
    (a, b) => b.remainder - a.remainder || a.index - b.index,
  );
  for (const item of ranked.slice(0, extraCents)) {
    itemCents[item.index] += 1;
  }
  return {
    totalVAT: totalCents / 100,
    itemVAT: itemCents.map((amount) => amount / 100),
  };
}
