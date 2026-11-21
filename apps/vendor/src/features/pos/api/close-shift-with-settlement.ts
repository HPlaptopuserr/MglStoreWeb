import { runAndroidPgwCommand } from "./android-pgw";
export type ShiftTerminal = string | { pgwRegisterId: string };

import type { CloseShiftPayload } from "../types/shift.types";
import { closeShift } from "./close-shift";
import { posRequest } from "./_pos-client";

export async function closeShiftWithSettlement(
  payload: CloseShiftPayload,
  terminalId?: ShiftTerminal,
) {
  if (terminalId && typeof terminalId !== "string") {
    const result = await runAndroidPgwCommand({
      operation: "settlement",
      registerId: terminalId.pgwRegisterId,
      shiftId: payload.shiftId,
    });
    if (!result.succeed)
      throw new Error(
        result.message ||
          "Терминалын нэгтгэл баталгаажаагүй тул ээлж хаагдсангүй",
      );
  } else if (terminalId) {
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
