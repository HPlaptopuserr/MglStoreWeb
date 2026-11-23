import type {
  PosCreditListLine,
  PosCreditRepaymentSelection,
} from "../types/credit-repayment";

/** Proportional receipt lines must sum to the payment, including tiny instalments. */
export function allocateCreditReceiptAmounts(
  weights: readonly number[],
  amount: number,
): number[] {
  const total = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
  let remaining = Math.round(amount * 100);
  return weights.map((weight, index) => {
    const cents =
      index === weights.length - 1
        ? remaining
        : Math.min(
            remaining,
            Math.floor(
              total > 0 ? (Math.max(0, weight) / total) * amount * 100 : 0,
            ),
          );
    remaining -= cents;
    return cents / 100;
  });
}

export function creditRepaymentReceiptLines(
  credit: Pick<
    PosCreditRepaymentSelection,
    "lines" | "credits" | "repaymentAllocations"
  >,
  amount: number,
): Array<{ line: PosCreditListLine; amount: number }> {
  if (!credit.credits?.length) {
    const amounts = allocateCreditReceiptAmounts(
      credit.lines.map((item) => item.lineTotal),
      amount,
    );
    return credit.lines.map((line, index) => ({
      line,
      amount: amounts[index]!,
    }));
  }
  let remaining = Math.round(amount * 100);
  return [...credit.credits]
    .sort(
      (a, b) =>
        Date.parse(a.createdAt) - Date.parse(b.createdAt) ||
        a.id.localeCompare(b.id),
    )
    .flatMap((item) => {
      const cents = credit.repaymentAllocations
        ? Math.round(
            (credit.repaymentAllocations.find(
              (allocation) => allocation.creditSaleId === item.id,
            )?.amount ?? 0) * 100,
          )
        : Math.min(remaining, Math.round(item.totalDue * 100));
      remaining -= cents;
      const amounts = allocateCreditReceiptAmounts(
        item.lines.map((line) => line.lineTotal),
        cents / 100,
      );
      return item.lines
        .map((line, index) => ({ line, amount: amounts[index]! }))
        .filter((row) => row.amount > 0);
    });
}
