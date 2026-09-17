"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { employeeApi, employeeErrorMessage } from "./store-employee.api";
import type { StoreEmployee } from "./store-employee.model";

export function useStoreEmployees(organizationId: string) {
  const [employees, setEmployees] = useState<StoreEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const reload = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(null);
    try {
      if (!organizationId)
        throw new Error(
          "Дэлгүүр сонгогдоогүй байна. Дээд хэсгээс дэлгүүрээ сонгоно уу.",
        );
      const result = await employeeApi.list(organizationId, controller.signal);
      if (!controller.signal.aborted) setEmployees(result);
    } catch (cause) {
      if (!controller.signal.aborted) setError(employeeErrorMessage(cause));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void reload();
    return () => request.current?.abort();
  }, [reload]);

  const saveEmployee = useCallback((employee: StoreEmployee) => {
    // A mutation supersedes any list request that started before it.
    request.current?.abort();
    setLoading(false);
    setError(null);
    setEmployees((current) =>
      current.some((item) => item.id === employee.id)
        ? current.map((item) => (item.id === employee.id ? employee : item))
        : [...current, employee],
    );
  }, []);

  return { employees, loading, error, reload, saveEmployee };
}
