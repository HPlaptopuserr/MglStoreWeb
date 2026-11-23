import type { PosCreditRepaymentSelection } from "../types/credit-repayment";
export type CreditRepaymentContext = {
  credit: PosCreditRepaymentSelection;
  requestId: string;
  shiftId?: string;
};
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const nonnegative = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
function isCreditItem(value: unknown): boolean {
  if (!object(value)) return false;
  return (
    ["id", "saleId", "receiptNo", "borrowerName", "createdAt"].every(
      (key) => typeof value[key] === "string" && Boolean(value[key]),
    ) &&
    Number.isFinite(Date.parse(String(value.createdAt))) &&
    nonnegative(value.principalAmount) &&
    nonnegative(value.totalDue) &&
    (value.paidAmount === undefined ||
      value.paidAmount === null ||
      nonnegative(value.paidAmount)) &&
    Array.isArray(value.lines) &&
    value.lines.length > 0 &&
    value.lines.every(
      (line: unknown) =>
        object(line) &&
        ["id", "productId", "productName"].every(
          (key) => typeof line[key] === "string" && Boolean(line[key]),
        ) &&
        typeof line.qty === "number" &&
        Number.isFinite(line.qty) &&
        line.qty > 0 &&
        nonnegative(line.unitPrice) &&
        nonnegative(line.lineTotal),
    )
  );
}
export function isCreditRepaymentContext(
  value: unknown,
): value is CreditRepaymentContext {
  if (
    !object(value) ||
    typeof value.requestId !== "string" ||
    !value.requestId ||
    !object(value.credit)
  )
    return false;
  if (
    value.shiftId !== undefined &&
    (typeof value.shiftId !== "string" || !value.shiftId)
  )
    return false;
  const credit = value.credit;
  return (
    isCreditItem(credit) &&
    nonnegative(credit.repaymentAmount) &&
    Number(credit.repaymentAmount) > 0 &&
    Number(credit.repaymentAmount) <= Number(credit.totalDue) &&
    (credit.creditIds === undefined ||
      (Array.isArray(credit.creditIds) &&
        credit.creditIds.every(
          (id) => typeof id === "string" && Boolean(id),
        ))) &&
    (credit.credits === undefined ||
      (Array.isArray(credit.credits) &&
        credit.credits.length > 0 &&
        credit.credits.every(isCreditItem))) &&
    (credit.repaymentAllocations === undefined ||
      (Array.isArray(credit.repaymentAllocations) &&
        credit.repaymentAllocations.every(
          (item: unknown) =>
            object(item) &&
            typeof item.creditSaleId === "string" &&
            Boolean(item.creditSaleId) &&
            nonnegative(item.amount),
        )))
  );
}
