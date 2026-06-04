"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormValues } from "./form-types";

type SavedDraft = {
  values?: FormValues;
  savedAt?: string | null;
};

const hasValues = (values: FormValues) =>
  Object.values(values).some((value) =>
    Array.isArray(value) ? value.length > 0 : value.trim().length > 0,
  );

export function useFormDraft(slug: string) {
  const storageKey = useMemo(() => `mgl-form-draft:${slug}`, [slug]);
  const [values, setValues] = useState<FormValues>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const draft = JSON.parse(raw) as SavedDraft;
        if (draft.values && typeof draft.values === "object") {
          setValues(draft.values);
          setSavedAt(draft.savedAt ?? null);
        }
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    } finally {
      setHydrated(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;

    if (!hasValues(values)) {
      window.localStorage.removeItem(storageKey);
      setSavedAt(null);
      return;
    }

    const nextSavedAt = new Date().toISOString();
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ values, savedAt: nextSavedAt }),
    );
    setSavedAt(nextSavedAt);
  }, [hydrated, storageKey, values]);

  const clearDraft = () => {
    window.localStorage.removeItem(storageKey);
    setValues({});
    setSavedAt(null);
  };

  return {
    clearDraft,
    hydrated,
    savedAt,
    setValues,
    values,
  };
}
