export const POS_STATUS = {
  IDLE: "IDLE",
  LOADING: "LOADING",
  READY: "READY",
  ERROR: "ERROR",
} as const;

export type PosStatus = (typeof POS_STATUS)[keyof typeof POS_STATUS];
