import { useCallback, useEffect, useReducer, useRef } from "react";
import { lookupRegisteredCreditBorrower } from "../api/registered-credit-borrower";
import {
  registeredBorrowerLookupReducer,
  registeredBorrowerPhone,
} from "../utils/registered-credit-borrower";

export function useRegisteredCreditBorrower(organizationId: string) {
  const [state, dispatch] = useReducer(registeredBorrowerLookupReducer, {
    status: "idle",
  });
  const controller = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const invalidate = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    sequence.current += 1;
    dispatch({ type: "reset" });
  }, []);
  useEffect(() => {
    invalidate();
    return () => {
      controller.current?.abort();
      sequence.current += 1;
    };
  }, [organizationId, invalidate]);
  const lookup = useCallback(
    async (rawPhone: string) => {
      controller.current?.abort();
      const requestId = ++sequence.current;
      const phone = registeredBorrowerPhone(rawPhone);
      if (!phone || !organizationId) {
        dispatch({
          type: "invalid",
          message:
            "MGL хэрэглэгчийг шалгахын тулд зөв 8 оронтой утасны дугаар оруулна уу.",
        });
        return;
      }
      const active = new AbortController();
      controller.current = active;
      dispatch({ type: "start", requestId, organizationId, phone });
      try {
        const user = await lookupRegisteredCreditBorrower(
          organizationId,
          phone,
          active.signal,
        );
        if (!active.signal.aborted && sequence.current === requestId)
          dispatch({ type: "resolved", requestId, user });
      } catch (error: unknown) {
        if (!active.signal.aborted && sequence.current === requestId)
          dispatch({
            type: "failed",
            requestId,
            message:
              error instanceof Error
                ? error.message
                : "MGL хэрэглэгчийг шалгаж чадсангүй. Дахин оролдоно уу.",
          });
      } finally {
        if (controller.current === active) controller.current = null;
      }
    },
    [organizationId],
  );
  const select = useCallback(() => {
    if (state.status === "found" && state.organizationId === organizationId) {
      dispatch({
        type: "select",
        requestId: state.requestId,
        userId: state.user.id,
      });
    }
  }, [state, organizationId]);
  return { state, invalidate, lookup, select };
}
