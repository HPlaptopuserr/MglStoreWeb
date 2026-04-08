"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch, API_BASE } from "../lib/api";
import type { JobApplication } from "../lib/types";

export function useJobApplications(enabled = true) {
  const [jobApps, setJobApps] = useState<JobApplication[]>([]);
  const [jobAppsLoading, setJobAppsLoading] = useState(true);

  const loadJobApps = useCallback(async () => {
    if (!enabled) {
      setJobAppsLoading(false);
      return;
    }
    try {
      setJobAppsLoading(true);
      const res = await adminFetch(`${API_BASE}/api/job-applications`, {
        cache: "no-store",
      });

      if (!res.ok) throw new Error("Failed to fetch");

      const list = await res.json();
      setJobApps(Array.isArray(list) ? list : (list?.data ?? []));
    } catch (err) {
      console.error("Job apps fetch error:", err);
    } finally {
      setJobAppsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    loadJobApps();
  }, [loadJobApps]);

  return { jobApps, jobAppsLoading, reload: loadJobApps };
}