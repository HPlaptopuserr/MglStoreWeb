export type ShiftStatus = "OPEN" | "CLOSED";

export type PosShift = {
  id: string;
  cashierId: string;
  cashierName: string;
  branchId: string;
  openedAt: string;
  closedAt: string | null;
  openingCash: number;
  closingCash: number | null;
  expectedCash: number;
  status: ShiftStatus;
};

export type OpenShiftPayload = {
  branchId: string;
  openingCash: number;
};

export type CloseShiftPayload = {
  shiftId: string;
  closingCash: number;
  note?: string;
};
