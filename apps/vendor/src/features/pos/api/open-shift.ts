import type { OpenShiftPayload, PosShift } from "../types/shift.types";
import { assertNonEmptyString, toSafePositiveNumber } from "../utils/pos-security";
import { posRequest } from "./_pos-client";

export function openShift(payload: OpenShiftPayload): Promise<PosShift> {
  return posRequest<PosShift>("/pos/shifts/open", {
    method: "POST",
    body: {
      branchId: assertNonEmptyString(payload.branchId, "branchId"),
      openingCash: toSafePositiveNumber(payload.openingCash),
    },
  });
}
