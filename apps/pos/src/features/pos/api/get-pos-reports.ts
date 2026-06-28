import { posRequest } from "./_pos-client";

export type PosReportSummary = {
  salesCount: number;
  grossAmount: number;
  netAmount: number;
  averageTicket: number;
};

export function getPosReports(
  branchId: string,
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<PosReportSummary> {
  const query = new URLSearchParams({ branchId, from, to });
  return posRequest<PosReportSummary>(`/pos/reports?${query.toString()}`, { signal });
}
