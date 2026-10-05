"use client";
import { useCallback, useEffect, useState } from "react";
import {
  emptyStoreMiniAppSettings,
  type StoreMiniAppSettings,
  type StoreMiniAppOption,
} from "@mgl/types";
import { API, adminFetch } from "@/lib/api";
interface SettingsResponse {
  settings: StoreMiniAppSettings;
  warehouses: StoreMiniAppOption[];
  vendors: StoreMiniAppOption[];
}
export function useStoreMiniAppSettings() {
  const [settings, setSettings] = useState(emptyStoreMiniAppSettings);
  const [baseline, setBaseline] = useState(emptyStoreMiniAppSettings);
  const [options, setOptions] = useState<
    Pick<SettingsResponse, "warehouses" | "vendors">
  >({ warehouses: [], vendors: [] });
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const response = await adminFetch(
        `${API}/admin/app-control/store-catalogs`,
        { signal, cache: "no-store" },
      );
      if (!response.ok)
        throw new Error("Каталогийн тохиргоо ачаалж чадсангүй.");
      const data = (await response.json()) as SettingsResponse;
      if (signal?.aborted) return;
      setSettings(data.settings);
      setBaseline(data.settings);
      setOptions({ warehouses: data.warehouses, vendors: data.vendors });
      setLoaded(true);
    } catch (error: unknown) {
      if (!signal?.aborted)
        setError(error instanceof Error ? error.message : "Алдаа гарлаа.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  const save = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const response = await adminFetch(
        `${API}/admin/app-control/store-catalogs`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        },
      );
      const data = (await response.json()) as {
        settings?: StoreMiniAppSettings;
        message?: string;
      };
      if (!response.ok || !data.settings)
        throw new Error(data.message || "Хадгалж чадсангүй.");
      setSettings(data.settings);
      setBaseline(data.settings);
      setSaved(true);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Алдаа гарлаа.");
    } finally {
      setSaving(false);
    }
  };
  return {
    settings,
    dirty: JSON.stringify(settings) !== JSON.stringify(baseline),
    reset: () => {
      setSettings(baseline);
      setError("");
      setSaved(false);
    },
    options,
    loading,
    loaded,
    saving,
    error,
    saved,
    load,
    save,
    update: (value: StoreMiniAppSettings) => {
      setSettings(value);
      setSaved(false);
    },
  };
}
