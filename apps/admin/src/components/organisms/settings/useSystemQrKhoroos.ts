"use client";

import { useEffect, useState } from "react";
import { API, adminFetch } from "@/lib/api";
import type { SystemQrKhoroo } from "../sections/contract/PaymentAccountPanels";

type CatalogState = {
  districtId: string;
  items: SystemQrKhoroo[];
  loading: boolean;
  error: string;
};

export function useSystemQrKhoroos(districtId: string) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<CatalogState>({ districtId: "", items: [], loading: false, error: "" });

  useEffect(() => {
    if (!districtId) return;
    let cancelled = false;
    setState({ districtId, items: [], loading: true, error: "" });
    void (async () => {
      try {
        const response = await adminFetch(`${API}/vendor/merchant/systemqr/khoroo/${encodeURIComponent(districtId)}`);
        if (!response.ok) throw new Error("Minu-ийн хорооны жагсаалт авч чадсангүй.");
        const data: unknown = await response.json();
        const items = data && typeof data === "object" && "khoroos" in data ? data.khoroos : null;
        if (!Array.isArray(items)) throw new Error("Minu-ийн хорооны жагсаалтын хариу буруу байна.");
        const khoroos = items.filter((item: unknown): item is SystemQrKhoroo =>
          Boolean(item && typeof item === "object" && "code" in item && typeof item.code === "string" && item.code.trim()
            && "name" in item && typeof item.name === "string"));
        if (!cancelled) setState({ districtId, items: khoroos, loading: false, error: khoroos.length ? "" : "Сонгосон дүүрэгт Minu-ийн хороо/багийн мэдээлэл алга байна." });
      } catch (error) {
        if (!cancelled) setState({ districtId, items: [], loading: false, error: error instanceof Error ? error.message : "Minu-ийн хорооны жагсаалт авч чадсангүй." });
      }
    })();
    return () => { cancelled = true; };
  }, [districtId, attempt]);

  const current = state.districtId === districtId;
  return {
    khoroos: current ? state.items : [],
    loading: Boolean(districtId) && (!current || state.loading),
    error: current ? state.error : "",
    retry: () => setAttempt((value) => value + 1),
  };
}
