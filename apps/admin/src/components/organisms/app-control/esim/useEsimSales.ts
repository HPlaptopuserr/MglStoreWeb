"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  emptyEsimSalesSettings,
  parseEsimSalesSettings,
  type EsimSalesSettings,
} from "@mgl/types";
import { API, adminFetch } from "@/lib/api";
export interface AdminEsimOffer {
  id: string;
  title: string;
  dataMb: number;
  days: number;
}
function object(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("Серверийн хариу буруу байна.");
  return raw as Record<string, unknown>;
}
async function responseBody(
  response: Response,
): Promise<Record<string, unknown>> {
  const raw = object(await response.json());
  if (!response.ok)
    throw new Error(
      typeof raw.message === "string"
        ? raw.message
        : "Хүсэлт амжилтгүй боллоо.",
    );
  return raw;
}
export function useEsimSales() {
  const [settings, setSettings] = useState<EsimSalesSettings>(
    emptyEsimSalesSettings,
  );
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const mounted = useRef(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setSaved(false);
    try {
      const body = await responseBody(
        await adminFetch(`${API}/admin/esim/settings`),
      );
      const value = parseEsimSalesSettings(body.settings);
      if (
        typeof body.revision !== "number" ||
        !Number.isSafeInteger(body.revision)
      )
        throw new Error("Тохиргооны хувилбар буруу байна.");
      if (!mounted.current) return;
      setSettings(value);
      setRevision(body.revision);
      setPrices(
        Object.fromEntries(
          Object.entries(value.prices).map(([id, price]) => [
            id,
            String(price),
          ]),
        ),
      );
      setLoaded(true);
    } catch (e: unknown) {
      if (mounted.current)
        setError(e instanceof Error ? e.message : "Ачаалж чадсангүй.");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
    };
  }, [load]);
  const save = async () => {
    if (!loaded || saving) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const values: Record<string, number> = {};
      for (const [id, price] of Object.entries(prices)) {
        if (!price.trim()) continue;
        if (!/^[0-9]+$/.test(price))
          throw new Error("Үнийг зөвхөн бүхэл төгрөгөөр оруулна уу.");
        values[id] = Number(price);
      }
      const next = parseEsimSalesSettings({ ...settings, prices: values });
      const body = await responseBody(
        await adminFetch(`${API}/admin/esim/settings`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ settings: next, revision }),
        }),
      );
      if (typeof body.revision !== "number")
        throw new Error("Хадгалсан хувилбар буруу байна.");
      if (mounted.current) {
        setSettings(next);
        setRevision(body.revision);
        setSaved(true);
      }
    } catch (e: unknown) {
      if (mounted.current)
        setError(e instanceof Error ? e.message : "Хадгалж чадсангүй.");
    } finally {
      if (mounted.current) setSaving(false);
    }
  };
  const editSettings = (update: Partial<EsimSalesSettings>) => {
    setSettings((v) => ({ ...v, ...update }));
    setSaved(false);
  };
  const editPrice = (id: string, value: string) => {
    setPrices((v) => ({ ...v, [id]: value }));
    setSaved(false);
  };
  return {
    settings,
    prices,
    loading,
    loaded,
    saving,
    error,
    saved,
    load,
    save,
    editSettings,
    editPrice,
  };
}
export function useEsimCountryOffers(country: string) {
  const [offers, setOffers] = useState<AdminEsimOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setOffers([]);
    void (async () => {
      try {
        const body = await responseBody(
          await adminFetch(
            `${API}/admin/esim/offers?country=${encodeURIComponent(country)}`,
            { signal: controller.signal },
          ),
        );
        if (!Array.isArray(body.offers))
          throw new Error("Багцын мэдээлэл буруу байна.");
        const values = body.offers.map((raw: unknown): AdminEsimOffer => {
          const o = object(raw);
          if (
            typeof o.id !== "string" ||
            typeof o.title !== "string" ||
            typeof o.dataMb !== "number" ||
            typeof o.days !== "number"
          )
            throw new Error("Багцын мэдээлэл буруу байна.");
          return { id: o.id, title: o.title, dataMb: o.dataMb, days: o.days };
        });
        if (!controller.signal.aborted)
          setOffers(
            values.sort((a, b) => a.dataMb - b.dataMb || a.days - b.days),
          );
      } catch (e: unknown) {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Багцуудыг ачаалж чадсангүй.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [country, attempt]);
  return { offers, loading, error, retry: () => setAttempt((v) => v + 1) };
}
