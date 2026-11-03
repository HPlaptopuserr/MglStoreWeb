export function receiptAction({
  enabled,
  creditSale,
  companyReceipt,
}: {
  enabled: boolean;
  creditSale: boolean;
  companyReceipt: boolean;
}): "NONE" | "ISSUE_PERSONAL" | "ASK_COMPANY" {
  if (!enabled || creditSale) return "NONE";
  return companyReceipt ? "ASK_COMPANY" : "ISSUE_PERSONAL";
}
