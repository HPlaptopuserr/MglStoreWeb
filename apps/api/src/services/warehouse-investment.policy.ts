import { WarehouseViewerError } from "./warehouse-viewer.policy";

export function parseInvestmentInput(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new WarehouseViewerError("Хөрөнгө оруулалтын дүнг зөв оруулна уу.");
  const input = body as Record<string, unknown>;
  if (
    typeof input.amount !== "string" ||
    !/^(0|[1-9]\d{0,11})(\.\d{1,2})?$/.test(input.amount)
  )
    throw new WarehouseViewerError(
      "0–999,999,999,999.99 ₮ хооронд дүн оруулна уу (2 хүртэл бутархай орон).",
    );
  if (
    typeof input.version !== "number" ||
    !Number.isSafeInteger(input.version) ||
    input.version < 0
  )
    throw new WarehouseViewerError("Бүртгэлээ шинэчлээд дахин оролдоно уу.");
  if (
    input.mode !== undefined &&
    input.mode !== "SET" &&
    input.mode !== "TOP_UP"
  )
    throw new WarehouseViewerError("Дүн бүртгэх үйлдэл буруу байна.");
  if (input.mode === "TOP_UP" && Number(input.amount) <= 0)
    throw new WarehouseViewerError("Цэнэглэх дүн 0-ээс их байна.");
  return {
    amount: input.amount,
    version: input.version,
    mode: input.mode === "TOP_UP" ? "TOP_UP" : "SET",
  };
}
