import type {
  CashDrawerEvent,
  CashDrawerEventType,
  CashDrawerSummary,
} from "../types/shift.types";
import { assertNonEmptyString, sanitizeReceiptNote, toSafePositiveNumber } from "../utils/pos-security";
import { posRequest } from "./_pos-client";

type CashDrawerEventResponse = {
  event: CashDrawerEvent;
  summary: CashDrawerSummary;
};

export function getCashDrawerSummary(
  shiftId: string,
  signal?: AbortSignal,
): Promise<CashDrawerSummary> {
  return posRequest<CashDrawerSummary>(
    `/pos/shifts/${encodeURIComponent(assertNonEmptyString(shiftId, "shiftId"))}/drawer`,
    { signal },
  );
}

export function createCashDrawerEvent(payload: {
  shiftId: string;
  type: CashDrawerEventType;
  amount?: number;
  note?: string;
}): Promise<CashDrawerEventResponse> {
  return posRequest<CashDrawerEventResponse>("/pos/shifts/drawer-events", {
    method: "POST",
    body: {
      shiftId: assertNonEmptyString(payload.shiftId, "shiftId"),
      type: payload.type,
      amount:
        payload.type === "OPEN_DRAWER"
          ? 0
          : toSafePositiveNumber(payload.amount ?? 0),
      note: sanitizeReceiptNote(payload.note),
    },
  });
}
