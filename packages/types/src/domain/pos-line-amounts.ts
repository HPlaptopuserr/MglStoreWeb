export interface PosLineAmountInput {
  unitPrice: number;
  qty: number;
  /** Discount per unit, matching the sale and frozen-payment contract. */
  discountAmount?: number;
}

/** Round each payable line once, before summing the basket or taking payment. */
export function calculatePosLineAmounts(line: PosLineAmountInput) {
  const discount = line.discountAmount ?? 0;
  if (!Number.isFinite(line.unitPrice) || !Number.isFinite(line.qty) ||
      !Number.isFinite(discount) || line.unitPrice < 0 || line.qty < 0 ||
      discount < 0 || discount > line.unitPrice) {
    throw new Error("Борлуулалтын мөрийн үнэ, тоо хэмжээ эсвэл хөнгөлөлт буруу байна.");
  }
  const subtotalCents = Math.round((line.unitPrice * line.qty + Number.EPSILON) * 100);
  const totalCents = Math.round(((line.unitPrice - discount) * line.qty + Number.EPSILON) * 100);
  if (!Number.isSafeInteger(subtotalCents) || !Number.isSafeInteger(totalCents)) {
    throw new Error("Борлуулалтын мөрийн үнийн дүн зөвшөөрөгдөх хязгаараас хэтэрсэн.");
  }
  return {
    subTotal: subtotalCents / 100,
    discountTotal: (subtotalCents - totalCents) / 100,
    lineTotal: totalCents / 100,
  };
}
