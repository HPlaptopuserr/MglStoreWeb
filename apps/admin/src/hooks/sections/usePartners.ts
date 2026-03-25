"use client";

import { useEffect, useState } from "react";
import { API } from "@/lib/api";
import type { CardPartner } from "@/lib/sections/types";

export function usePartners(enabled: boolean) {
  const [partners, setPartners] = useState<CardPartner[]>([]);

  useEffect(() => {
    if (!enabled) return;
    fetch(`${API}/partners`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: CardPartner[]) => {
        if (Array.isArray(data)) setPartners(data);
      })
      .catch(() => {});
  }, [enabled]);

  return { partners };
}
