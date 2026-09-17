import { useCallback, useEffect, useRef, useState } from "react";
import { closeShiftWithSettlement } from "../api/close-shift-with-settlement";
import { openShift } from "../api/open-shift";
import type { CashDenominationCount, PosShift } from "../types/shift.types";
import { posRequest } from "../api/_pos-client";

export interface BlockingRegisterShift {
  id: string;
  cashierName: string;
  registerName: string;
  openedAt: string;
  canClose: boolean;
}
interface RegisterShiftContext {
  shift: PosShift | null;
  blockingShift: BlockingRegisterShift | null;
}
const messageOf = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Ээлжийн мэдээлэл авахад алдаа гарлаа.";

export function useCurrentShift(registerId?: string) {
  const [shift, setShift] = useState<PosShift | null>(null);
  const [blockingShift, setBlockingShift] =
    useState<BlockingRegisterShift | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const pending = useRef(false);
  const activeRegister = useRef(registerId);
  useEffect(() => {
    activeRegister.current = registerId;
  }, [registerId]);

  useEffect(() => {
    setShift(null);
    setBlockingShift(null);
    setReady(false);
    setLoading(false);
    setError(null);
    return () => {
      requestVersion.current += 1;
    };
  }, [registerId]);

  const load = useCallback(async () => {
    if (activeRegister.current !== registerId) return null;
    const version = ++requestVersion.current;
    setLoading(true);
    setError(null);
    try {
      const context = registerId
        ? await posRequest<RegisterShiftContext>(
            `/pos/shifts/register-current?registerId=${encodeURIComponent(registerId)}`,
          )
        : {
            shift: await posRequest<PosShift | null>("/pos/shifts/current"),
            blockingShift: null,
          };
      if (version !== requestVersion.current) return null;
      setShift(context.shift);
      setBlockingShift(context.blockingShift);
      setReady(true);
      return context.shift;
    } catch (error: unknown) {
      if (version === requestVersion.current) {
        setError(messageOf(error));
        setReady(false);
      }
      return null;
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [registerId]);

  const open = useCallback(
    async (
      branchId: string,
      openingCash: number,
      targetRegisterId?: string,
    ) => {
      if (pending.current) throw new Error("Ээлжийн үйлдэл боловсруулж байна.");
      pending.current = true;
      ++requestVersion.current;
      setLoading(true);
      setError(null);
      try {
        const created = await openShift({
          branchId,
          registerId: targetRegisterId,
          openingCash,
        });
        await load();
        return created;
      } catch (error: unknown) {
        await load();
        if (activeRegister.current === registerId) setError(messageOf(error));
        throw error;
      } finally {
        pending.current = false;
        setLoading(false);
      }
    },
    [load, registerId],
  );

  const closeTarget = useCallback(
    async (
      shiftId: string,
      closingCash: number,
      note?: string,
      terminalId?: string,
      cashCount?: CashDenominationCount[],
    ) => {
      if (pending.current) throw new Error("Ээлжийн үйлдэл боловсруулж байна.");
      pending.current = true;
      ++requestVersion.current;
      setLoading(true);
      setError(null);
      try {
        const closed = await closeShiftWithSettlement(
          { shiftId, closingCash, cashCount, note },
          terminalId,
        );
        if (activeRegister.current === registerId)
          setShift((current) => (current?.id === shiftId ? null : current));
        await load();
        return closed;
      } catch (error: unknown) {
        await load();
        if (activeRegister.current === registerId) setError(messageOf(error));
        throw error;
      } finally {
        pending.current = false;
        setLoading(false);
      }
    },
    [load, registerId],
  );

  const close = useCallback(
    (
      closingCash: number,
      note?: string,
      terminalId?: string,
      cashCount?: CashDenominationCount[],
    ) => {
      if (!shift) throw new Error("Нээлттэй ээлж алга.");
      return closeTarget(shift.id, closingCash, note, terminalId, cashCount);
    },
    [shift, closeTarget],
  );

  const closeBlocking = useCallback(
    (
      shiftId: string,
      closingCash: number,
      note: string,
      terminalId?: string,
    ) => {
      if (!blockingShift?.canClose || blockingShift.id !== shiftId)
        throw new Error("Энэ ээлжийг хаах эрхгүй.");
      return closeTarget(shiftId, closingCash, note, terminalId);
    },
    [blockingShift, closeTarget],
  );

  return {
    shift,
    blockingShift,
    loading,
    ready,
    error,
    load,
    open,
    close,
    closeBlocking,
  };
}
