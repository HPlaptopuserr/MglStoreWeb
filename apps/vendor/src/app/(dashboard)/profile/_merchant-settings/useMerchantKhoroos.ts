"use client";

import { useEffect, useState } from "react";
import { API, authFetch } from "@/lib/api";
import type { Khoroo } from "./types";

type Catalog = {
  districtId: string;
  items: Khoroo[];
  loading: boolean;
  error: string;
};

export function useMerchantKhoroos(districtId: string) {
  const [attempt, setAttempt] = useState(0);
  const [catalog, setCatalog] = useState<Catalog>({
    districtId: "",
    items: [],
    loading: false,
    error: "",
  });
  useEffect(() => {
    if (!districtId) return;
    let cancelled = false;
    setCatalog({ districtId, items: [], loading: true, error: "" });
    void (async () => {
      try {
        const response = await authFetch(
          `${API}/vendor/merchant/systemqr/khoroo/${encodeURIComponent(districtId)}`,
          { cache: "no-store" },
        );
        if (!response.ok)
          throw new Error("Minu-ийн хорооны жагсаалт авч чадсангүй.");
        const data: unknown = await response.json();
        const rows =
          data && typeof data === "object" && "khoroos" in data
            ? data.khoroos
            : null;
        if (!Array.isArray(rows))
          throw new Error("Minu-ийн хорооны жагсаалтын хариу буруу байна.");
        const items = rows.filter((item: unknown): item is Khoroo =>
          Boolean(
            item &&
            typeof item === "object" &&
            "code" in item &&
            typeof item.code === "string" &&
            item.code.trim() &&
            "name" in item &&
            typeof item.name === "string",
          ),
        );
        if (!cancelled)
          setCatalog({
            districtId,
            items,
            loading: false,
            error: items.length
              ? ""
              : "Сонгосон дүүрэгт хороо / багийн мэдээлэл алга байна.",
          });
      } catch (error) {
        if (!cancelled)
          setCatalog({
            districtId,
            items: [],
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Minu-ийн хорооны жагсаалт авч чадсангүй.",
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [districtId, attempt]);
  const current = Boolean(districtId) && catalog.districtId === districtId;
  return {
    khoroos: current ? catalog.items : [],
    khoroosLoading: Boolean(districtId) && (!current || catalog.loading),
    khoroosError: current ? catalog.error : "",
    retryKhoroos: () => setAttempt((value) => value + 1),
  };
}
