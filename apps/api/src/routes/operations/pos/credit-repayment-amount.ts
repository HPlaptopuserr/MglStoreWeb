/** Currency boundaries use integer cents; a floating tolerance can erase a cent. */
export function creditRepaymentCents(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !/^\d+(?:\.\d{1,2})?$/.test(value))
    return null;
  const amount = Number(value);
  const cents = Math.round(amount * 100);
  return Number.isFinite(amount) &&
    amount >= 0 &&
    Number.isSafeInteger(cents) &&
    Math.abs(amount * 100 - cents) < 0.000001
    ? cents
    : null;
}

export function sameCreditRepaymentAmount(
  left: unknown,
  right: unknown,
): boolean {
  const leftCents = creditRepaymentCents(left);
  return leftCents !== null && leftCents === creditRepaymentCents(right);
}

/** Allocate oldest-first without losing the final cent between loans. */
export function allocateCreditRepayment(
  balances: readonly number[],
  amount: number,
): number[] {
  const payment = creditRepaymentCents(amount);
  const dues = balances.map(creditRepaymentCents);
  const total = dues.reduce<number>((sum, due) => sum + (due ?? 0), 0);
  if (
    payment === null ||
    payment <= 0 ||
    dues.some((due) => due === null) ||
    !Number.isSafeInteger(total) ||
    payment > total
  ) {
    throw new Error(
      "Төлөх дүн 0-оос их, зээлийн үлдэгдлээс хэтрэхгүй байх ёстой",
    );
  }
  let remaining = payment;
  return dues.map((due) => {
    const allocated = Math.min(due!, remaining);
    remaining -= allocated;
    return allocated / 100;
  });
}
