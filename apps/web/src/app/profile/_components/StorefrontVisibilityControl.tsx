"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Globe2, Loader2 } from "lucide-react";
import { API } from "@/lib/api";

type StorefrontVisibilityControlProps = {
  organizationId: string;
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
};

type StorefrontSettingResponse = {
  enabled?: boolean;
  message?: string;
};

export function StorefrontVisibilityControl({
  organizationId,
  authFetch,
}: StorefrontVisibilityControlProps) {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const endpoint = `${API}/site-settings/organization-storefront/${encodeURIComponent(organizationId)}`;

  const loadSetting = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await authFetch(endpoint);
      const payload = (await response
        .json()
        .catch(() => ({}))) as StorefrontSettingResponse;
      if (!response.ok) {
        throw new Error(payload.message || "Тохиргоог авахад алдаа гарлаа");
      }
      setEnabled(payload.enabled !== false);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Тохиргоог авахад алдаа гарлаа",
      );
    } finally {
      setLoading(false);
    }
  }, [authFetch, endpoint]);

  useEffect(() => {
    void loadSetting();
  }, [loadSetting]);

  const toggleVisibility = async () => {
    const nextValue = !enabled;
    setSaving(true);
    setMessage("");
    try {
      const response = await authFetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextValue }),
      });
      const payload = (await response
        .json()
        .catch(() => ({}))) as StorefrontSettingResponse;
      if (!response.ok) {
        throw new Error(payload.message || "Тохиргоог хадгалахад алдаа гарлаа");
      }
      setEnabled(nextValue);
      setMessage(
        nextValue
          ? "Таны бүтээгдэхүүн хэрэглэгчдэд харагдана."
          : "Таны бүтээгдэхүүнийг нийтийн дэлгүүрээс нуусан.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Тохиргоог хадгалахад алдаа гарлаа",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              enabled
                ? "bg-emerald-50 text-emerald-600"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            <Globe2 size={21} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-black text-slate-950">
              Нийтийн дэлгүүр
            </h2>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              Асаалттай үед таны идэвхтэй бүтээгдэхүүн бүх хэрэглэгчид
              харагдана.
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Нийтийн дэлгүүрийн харагдах төлөв"
          disabled={loading || saving}
          onClick={toggleVisibility}
          className={`inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full px-5 text-sm font-black transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 disabled:cursor-wait disabled:opacity-60 ${
            enabled
              ? "bg-emerald-500 text-white hover:bg-emerald-600"
              : "bg-slate-950 text-white hover:bg-slate-800"
          }`}
        >
          {loading || saving ? (
            <Loader2 size={17} className="animate-spin" aria-hidden="true" />
          ) : enabled ? (
            <CheckCircle2 size={17} aria-hidden="true" />
          ) : null}
          {loading
            ? "Уншиж байна"
            : saving
              ? "Хадгалж байна"
              : enabled
                ? "Нийтэд нээлттэй"
                : "Нийтэд нээх"}
        </button>
      </div>
      {message && (
        <p
          className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600"
          role="status"
        >
          {message}
        </p>
      )}
    </section>
  );
}
