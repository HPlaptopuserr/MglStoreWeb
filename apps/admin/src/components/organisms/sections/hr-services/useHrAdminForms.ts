"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { API, adminFetch } from "@/lib/api";

export type HrAdminForm = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  fields: unknown[];
  isActive?: boolean;
  _count?: { responses: number };
};

export function useHrAdminForms() {
  const [forms, setForms] = useState<HrAdminForm[]>([]);
  const [loadingForms, setLoadingForms] = useState(false);

  const fetchForms = useCallback(async () => {
    setLoadingForms(true);
    try {
      const res = await adminFetch(`${API}/admin/forms`);
      if (!res.ok) return;
      const data = await res.json();
      setForms(Array.isArray(data) ? data : []);
    } finally {
      setLoadingForms(false);
    }
  }, []);

  useEffect(() => {
    void fetchForms();
  }, [fetchForms]);

  const activeForms = useMemo(
    () => forms.filter((form) => form.isActive !== false),
    [forms],
  );

  return { activeForms, loadingForms, refetchForms: fetchForms };
}
