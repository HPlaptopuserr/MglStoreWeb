import type { PosShift } from "../types/shift.types";
import { posRequest } from "./_pos-client";

export function getCurrentShift(): Promise<PosShift | null> {
  return posRequest<PosShift | null>("/pos/shifts/current");
}
