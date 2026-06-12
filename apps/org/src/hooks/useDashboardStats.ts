"use client";

import { useEffect, useState } from "react";
import { API, authFetch } from "@/lib/api";
import { DashboardStats } from "@/lib/org-types";

export function useDashboardStats(organizationId?: string | null) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    if (!organizationId) return;

    const loadStats = async () => {
      try {
        const response = await authFetch(
          `${API}/vendor/dashboard/stats?organizationId=${encodeURIComponent(organizationId)}`,
        );

        if (response.ok) {
          setStats((await response.json()) as DashboardStats);
        }
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [organizationId]);

  return { loading, stats };
}
