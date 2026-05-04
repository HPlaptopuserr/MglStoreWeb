"use client";

import { useEffect, useState } from "react";
import { API, adminFetch } from "@/lib/api";
import type { CardPartner } from "@/lib/sections/types";

export function usePartners(enabled: boolean) {
  const [partners, setPartners] = useState<CardPartner[]>([]);

  useEffect(() => {
    if (!enabled) return;
    adminFetch(`${API}/partners`)
      .then((r) => (r.ok ? r.json() : []))
      .then((raw: any) => {
        const data = Array.isArray(raw) ? raw : raw?.data || [];
        setPartners(data as CardPartner[]);
      })
      .catch(() => {});
  }, [enabled]);

  return { partners };
}
