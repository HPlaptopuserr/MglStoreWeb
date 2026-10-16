import type { AcceptanceLine, TransferLine } from "./transfer-types";
export function markupPrice(
  base: string | number | null | undefined,
  percent: number,
): string {
  if (base == null || base === "") return "";
  const cost = Number(base);
  if (
    !Number.isFinite(cost) ||
    cost < 0 ||
    !Number.isFinite(percent) ||
    percent < 0 ||
    percent > 1000
  )
    return "";
  const price =
    Math.round(((cost * (100 + percent)) / 100 + Number.EPSILON) * 100) / 100;
  return price <= 1e12 ? String(price) : "";
}
export function isReceiptLineValid(
  row: TransferLine,
  line: AcceptanceLine,
): boolean {
  const price = Number(line.salePrice);
  return (
    line.quantity.trim() !== "" &&
    Number(line.quantity) === row.quantity &&
    line.salePrice.trim() !== "" &&
    Number.isFinite(price) &&
    price >= 0 &&
    price <= 1e12 &&
    Math.abs(price * 100 - Math.round(price * 100)) < 0.0001 &&
    Boolean(line.targetProductId)
  );
}
export function initialReceiptLine(row: TransferLine): AcceptanceLine {
  const match =
    row.matches?.length === 1 && row.matches[0].isActive !== false
      ? row.matches[0]
      : null;
  return {
    id: row.id,
    quantity: String(row.quantity),
    salePrice: markupPrice(row.unitCost, 0),
    targetProductId: match?.id ?? (row.matches?.length ? "" : "NEW"),
    confirmed: false,
  };
}
export function editReceiptLine(
  current: AcceptanceLine,
  change: Partial<
    Pick<AcceptanceLine, "quantity" | "salePrice" | "targetProductId">
  >,
): AcceptanceLine {
  return { ...current, ...change, confirmed: false };
}
export const receiptMoney = (value: string | number | null | undefined) => {
  if (value == null || value === "" || !Number.isFinite(Number(value)))
    return "—";
  return new Intl.NumberFormat("mn-MN", { maximumFractionDigits: 2 }).format(
    Number(value),
  );
};
