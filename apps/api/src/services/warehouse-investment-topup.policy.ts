import { parseInvestmentInput } from "./warehouse-investment.policy";
import { WarehouseViewerError } from "./warehouse-viewer.policy";

export function parseInvestmentTopUp(body: unknown) {
  const value =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const { amount } = parseInvestmentInput({
    amount: value.amount,
    mode: "TOP_UP",
    version: 0,
  });
  if (value.method !== "QR" && value.method !== "BANK_TRANSFER")
    throw new WarehouseViewerError(
      "QR эсвэл дансаар шилжүүлэх сонголтоо хийнэ үү.",
    );
  if (
    typeof value.requestId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.requestId,
    )
  )
    throw new WarehouseViewerError("Хүсэлтээ шинэчлээд дахин оролдоно уу.");
  return { amount, method: value.method, requestId: value.requestId };
}
