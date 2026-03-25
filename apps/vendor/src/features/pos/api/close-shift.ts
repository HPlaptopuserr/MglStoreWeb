import type { CloseShiftPayload, PosShift } from "../types/shift.types";
import {
  assertNonEmptyString,
  sanitizeReceiptNote,
  toSafePositiveNumber,
} from "../utils/pos-security";
import { posRequest } from "./_pos-client";

export function closeShift(payload: CloseShiftPayload): Promise<PosShift> {
  return posRequest<PosShift>("/pos/shifts/close", {
    method: "POST",
    body: {
      shiftId: assertNonEmptyString(payload.shiftId, "shiftId"),
      closingCash: toSafePositiveNumber(payload.closingCash),
      note: sanitizeReceiptNote(payload.note),
    },
  });
}
