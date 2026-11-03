"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { API, adminFetch } from "@/lib/api";
import { visibilityKey } from "./miniAppVisibilityConfig";

export function useStoreMiniAppVisibility() {
  const [settings, setSettings] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const busy = useRef(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    setError("");
    try {
      const response = await adminFetch(`${API}/site-settings`, { signal, cache: "no-store" });
      if (!response.ok) throw new Error("Тохиргоо ачаалж чадсангүй.");
      const data: unknown = await response.json();
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Тохиргооны формат буруу байна.");
      const parsed: Record<string, string> = {};
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === "string") parsed[key] = value;
      }
      if (!signal?.aborted) setSettings(parsed);
    } catch (cause: unknown) {
      if (!signal?.aborted) setError(cause instanceof Error ? cause.message : "Алдаа гарлаа.");
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  const saveSetting = async (id: string, key: string, value: string) => {
    if (busy.current) return;
    busy.current = true;
    setSaving(id);
    setError("");
    try {
      const response = await adminFetch(`${API}/site-settings/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (!response.ok) throw new Error("Хадгалж чадсангүй. Өмнөх тохиргоо хэвээр байна.");
      setSettings(current => ({ ...current, [key]: value }));
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Алдаа гарлаа.");
    } finally {
      busy.current = false;
      setSaving(null);
    }
  };
  const toggle = (id: string, enabled: boolean) => saveSetting(id, id === "all" ? "app-mini-apps-enabled" : visibilityKey(id), String(enabled));
  const reorder = (ids: string[]) => saveSetting("order", "app-mini-app-order", JSON.stringify(ids));
  return { settings, error, saving, load, toggle, reorder };
}
