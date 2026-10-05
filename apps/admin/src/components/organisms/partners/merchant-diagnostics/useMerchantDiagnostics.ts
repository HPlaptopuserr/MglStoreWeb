"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MerchantDiagnostics } from "@mgl/types";
import { API, adminFetch } from "@/lib/api";

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: MerchantDiagnostics };

export function useMerchantDiagnostics(organizationId: string) {
  const [state, setState] = useState<State>({ status: "loading" });
  const requestId = useRef(0);
  const reload = useCallback(async () => {
    const id = ++requestId.current;
    setState({ status: "loading" });
    try {
      const response = await adminFetch(`${API}/admin/organizations/${encodeURIComponent(organizationId)}/merchant-diagnostics`, { cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 403 ? "Төлбөрийн тохиргоо харах эрхгүй байна." : response.status === 404 ? "Байгууллага олдсонгүй." : "Мэдээллийг ачаалж чадсангүй. Дахин оролдоно уу.");
      const data: MerchantDiagnostics = await response.json();
      if (id === requestId.current) setState({ status: "ready", data });
    } catch (error: unknown) {
      if (id === requestId.current) setState({ status: "error", message: error instanceof Error ? error.message : "Сүлжээний алдаа гарлаа." });
    }
  }, [organizationId]);
  useEffect(() => { void reload(); return () => { requestId.current += 1; }; }, [reload]);
  return { state, reload };
}
