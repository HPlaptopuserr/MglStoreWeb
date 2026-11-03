import type {
  WarehouseDividendChoice,
  WarehouseDividendVerification,
  WarehouseDividendConfirmation,
} from "@mgl/types";
import { API, wmsFetch } from "@/lib/api";

export interface DividendChoiceDraft {
  choice: WarehouseDividendChoice;
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
}
export class DividendVerificationError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}
async function post<T>(
  url: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await wmsFetch(url, {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });
  const value: unknown = await response.json().catch(() => null);
  if (!response.ok || !value || typeof value !== "object")
    throw new DividendVerificationError(
      value && typeof value === "object" && "message" in value
        ? String(value.message)
        : "Баталгаажуулах хүсэлт амжилтгүй боллоо.",
      response.status,
    );
  return value as T;
}
const endpoint = (warehouseId: string) =>
  `${API}/warehouse-viewer/warehouses/${encodeURIComponent(warehouseId)}`;
export function startDividendVerification(
  warehouseId: string,
  dividendId: string,
  version: number,
  draft: DividendChoiceDraft,
) {
  return post<WarehouseDividendVerification>(
    `${endpoint(warehouseId)}/dividends/${encodeURIComponent(dividendId)}/verification`,
    { ...draft, version },
  );
}
export function confirmDividendVerification(
  warehouseId: string,
  decisionId: string,
  signal: AbortSignal,
) {
  return post<WarehouseDividendConfirmation>(
    `${endpoint(warehouseId)}/dividend-decisions/${encodeURIComponent(decisionId)}/confirm`,
    {},
    signal,
  );
}
