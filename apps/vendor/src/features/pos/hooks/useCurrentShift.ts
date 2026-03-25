import { useState } from "react";
import { closeShift } from "../api/close-shift";
import { openShift } from "../api/open-shift";
import type { PosShift } from "../types/shift.types";

export function useCurrentShift() {
  const [shift, setShift] = useState<PosShift | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = async (branchId: string, openingCash: number) => {
    setLoading(true);
    setError(null);
    try {
      const created = await openShift({ branchId, openingCash });
      setShift(created);
      return created;
    } catch (e: any) {
      setError(e?.message || "Shift open failed");
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const close = async (closingCash: number, note?: string) => {
    if (!shift) throw new Error("No active shift");
    setLoading(true);
    setError(null);
    try {
      const closed = await closeShift({ shiftId: shift.id, closingCash, note });
      setShift(closed);
      return closed;
    } catch (e: any) {
      setError(e?.message || "Shift close failed");
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { shift, loading, error, open, close };
}
