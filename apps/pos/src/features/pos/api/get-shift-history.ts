import type { PosShiftHistoryResponse } from "@mgl/types";
import { posRequest } from "./_pos-client";

export type ShiftHistoryParams = {
  branchId?: string;
  from?: string;
  to?: string;
  status?: "OPEN" | "CLOSED";
  limit?: number;
};

export function getShiftHistory(
  params: ShiftHistoryParams = {},
  signal?: AbortSignal,
): Promise<PosShiftHistoryResponse> {
  const query = new URLSearchParams();
  if (params.branchId) query.set("branchId", params.branchId);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.status) query.set("status", params.status);
  if (params.limit) query.set("limit", String(params.limit));

  return posRequest<PosShiftHistoryResponse>(`/pos/shifts/history?${query.toString()}`, {
    signal,
  });
}
