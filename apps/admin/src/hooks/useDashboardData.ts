"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchDashboardStats,
  type DashboardStats,
} from "../lib/dashboard-api";

export function useDashboardData() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchDashboardStats();
      setData(result);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return { data, loading, reload: loadStats };
}