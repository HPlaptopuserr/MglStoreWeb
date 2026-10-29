import { currentWarehouseMonth } from "@mgl/types";
import { parseInvestmentInput } from "./warehouse-investment.policy";
import { WarehouseViewerError } from "./warehouse-viewer.policy";

export function parseDividendInput(
  body: unknown,
  currentMonth = currentWarehouseMonth(),
) {
  const input = parseInvestmentInput(body);
  const record = body as Record<string, unknown>;
  if (record.month !== currentMonth)
    throw new WarehouseViewerError(
      "Зөвхөн энэ сарын ногдол ашгийг бүртгэнэ. Жагсаалтыг шинэчлээд дахин оролдоно уу.",
      409,
    );
  if (record.mode !== undefined && record.mode !== "SET")
    throw new WarehouseViewerError("Сарын ногдол ашгийн нийт дүнг оруулна уу.");
  return { amount: input.amount, version: input.version, month: currentMonth };
}
