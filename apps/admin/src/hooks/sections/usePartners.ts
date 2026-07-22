"use client";

import { useEffect, useState } from "react";
import { API, adminFetch } from "@/lib/api";
import type { CardPartner } from "@/lib/sections/types";

function readPartners(raw: unknown): CardPartner[] {
  if (Array.isArray(raw)) return raw as CardPartner[];
  if (typeof raw !== "object" || raw === null || !("data" in raw)) return [];
  return Array.isArray(raw.data) ? (raw.data as CardPartner[]) : [];
}

export function usePartners(enabled: boolean) {
  const [partners, setPartners] = useState<CardPartner[]>([]);

  useEffect(() => {
    if (!enabled) return;
    adminFetch(`${API}/partners`)
      .then((r) => (r.ok ? r.json() : []))
      .then((raw: unknown) => setPartners(readPartners(raw)))
      .catch(() => {});
  }, [enabled]);

  return { partners };
}
