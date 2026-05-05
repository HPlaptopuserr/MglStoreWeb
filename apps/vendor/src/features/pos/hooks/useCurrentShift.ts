import { useState } from "react";
import { closeShift } from "../api/close-shift";
import { openShift } from "../api/open-shift";
import type { PosShift } from "../types/shift.types";
import { posRequest } from "../api/_pos-client";

export function useCurrentShift() {
  const [shift, setShift] = useState<PosShift | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Fetch the current open shift from the server and hydrate state. */
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetched = await posRequest<PosShift | null>("/pos/shifts/current", {
        method: "GET",
      });
      setShift(fetched ?? null);
      return fetched ?? null;
    } catch (e: any) {
      setError(e?.message || "Shift load failed");
      return null;
    } finally {
      setLoading(false);
    }
  };

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

  const close = async (closingCash: number, note?: string, terminalId?: string) => {
    if (!shift) throw new Error("No active shift");
    setLoading(true);
    setError(null);
    try {
      // Settlement хийх — PUSH_ECR terminal байвал өдрийн нэгтгэл хийнэ
      if (terminalId) {
        try {
          await posRequest("/pos/payments/push-ecr/settlement", {
            method: "POST",
            body: { terminalId, skipPrint: false },
          });
        } catch {
          // settlement амжилтгүй болсон ч shift хаалтыг үргэлжлүүлнэ
        }
      }
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

  return { shift, loading, error, load, open, close };
}
