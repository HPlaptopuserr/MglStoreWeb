"use client";

import { useEffect, useRef, useState } from "react";
import { employeeErrorMessage } from "./store-employee.api";
import type { StoreEmployee } from "./store-employee.model";

type MutationState =
  | { status: "idle" | "saving"; error: null }
  | { status: "error"; error: string };

export function useEmployeeMutation(
  onSuccess: (employee: StoreEmployee) => void,
) {
  const [state, setState] = useState<MutationState>({
    status: "idle",
    error: null,
  });
  const pending = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function run(operation: () => Promise<StoreEmployee>) {
    if (pending.current) return;
    pending.current = true;
    setState({ status: "saving", error: null });
    let employee: StoreEmployee;
    try {
      employee = await operation();
    } catch (error) {
      if (mounted.current)
        setState({ status: "error", error: employeeErrorMessage(error) });
      return;
    } finally {
      pending.current = false;
    }
    if (mounted.current) {
      setState({ status: "idle", error: null });
      onSuccess(employee);
    }
  }

  return {
    run,
    saving: state.status === "saving",
    error: state.error,
    clearError: () => setState({ status: "idle", error: null }),
  };
}
