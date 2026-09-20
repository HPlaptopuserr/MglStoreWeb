import type { CloseShiftPayload } from "../types/shift.types";
import { closeShift } from "./close-shift";
import { posRequest } from "./_pos-client";

export async function closeShiftWithSettlement(
  payload: CloseShiftPayload,
  terminalId?: string,
) {
  if (terminalId) {
    const settlement = await posRequest<{ succeed: boolean; message?: string }>(
      "/pos/payments/push-ecr/settlement",
      { method: "POST", body: { terminalId, skipPrint: false } },
    );
    if (!settlement.succeed) {
      throw new Error(
        settlement.message ||
          "Картын терминалын өдрийн нэгтгэл амжилтгүй тул ээлж хаагдсангүй",
      );
    }
  }
  return closeShift(payload);
}
