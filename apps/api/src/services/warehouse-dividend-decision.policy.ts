import type { WarehouseDividendChoice } from "@mgl/types";
import { WarehouseViewerError } from "./warehouse-viewer.policy";

export interface DividendChoiceInput {
  choice: WarehouseDividendChoice;
  version: number;
  bankName: string | null;
  bankAccount: string | null;
  bankAccountName: string | null;
}
export function parseDividendChoice(body: unknown): DividendChoiceInput {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new WarehouseViewerError("Ногдол ашгаа авах хэлбэрээ сонгоно уу.");
  const value = body as Record<string, unknown>;
  if (value.choice !== "REINVEST" && value.choice !== "BANK_TRANSFER")
    throw new WarehouseViewerError("Ногдол ашгаа авах хэлбэрээ сонгоно уу.");
  if (
    !Number.isSafeInteger(value.version) ||
    typeof value.version !== "number" ||
    value.version < 1
  )
    throw new WarehouseViewerError("Сарын дүнгээ шинэчлээд дахин оролдоно уу.");
  if (value.choice === "REINVEST")
    return {
      choice: value.choice,
      version: value.version,
      bankName: null,
      bankAccount: null,
      bankAccountName: null,
    };
  const bankName =
    typeof value.bankName === "string" ? value.bankName.trim() : "";
  const bankAccountName =
    typeof value.bankAccountName === "string"
      ? value.bankAccountName.trim()
      : "";
  const bankAccount =
    typeof value.bankAccount === "string"
      ? value.bankAccount.replace(/\s/g, "").toUpperCase()
      : "";
  if (
    !bankName ||
    bankName.length > 100 ||
    !bankAccountName ||
    bankAccountName.length > 120 ||
    !/^(?:MN[0-9]{18}|[0-9]{8,20})$/.test(bankAccount)
  )
    throw new WarehouseViewerError(
      "Банк, дансны дугаар / IBAN, эзэмшигчийн нэрээ зөв оруулна уу.",
    );
  return {
    choice: value.choice,
    version: value.version,
    bankName,
    bankAccount,
    bankAccountName,
  };
}
