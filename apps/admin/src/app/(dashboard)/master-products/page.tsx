"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { MasterCatalogSearch } from "./_components/MasterCatalogSearch";
import { MasterProductEditor } from "./_components/MasterProductEditor";
import { CatalogWorkspaceHeader } from "./_components/CatalogWorkspaceHeader";
import { CatalogManagementTools } from "./_components/CatalogManagementTools";
import { MasterCatalogTable } from "./_components/MasterCatalogTable";
import type { MasterCatalogResponse } from "./_components/catalog-types";
import { API, adminFetch, getApiErrorMessage } from "@/lib/api";

export default function MasterProductsPage() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [data, setData] = useState<MasterCatalogResponse | null>(null);
  const request = useRef<AbortController | null>(null);
  const onSearch = useCallback((value: string) => {
    setQuery(value);
    setPage(1);
  }, []);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<"excel" | "ai" | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    try {
      const response = await adminFetch(
        `${API}/products/master-catalog/admin?limit=100&page=${page}&search=${encodeURIComponent(query)}`,
        { signal: controller.signal },
      );
      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(
            response,
            "Нэгдсэн барааны API ажиллахгүй байна",
          ),
        );
      }
      const result = (await response.json()) as MasterCatalogResponse;
      if (!controller.signal.aborted) setData(result);
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(
        cause instanceof Error
          ? cause.message
          : "Нэгдсэн барааны сан ачаалсангүй",
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    void load();
    return () => request.current?.abort();
  }, [load]);

  const download = async (kind: "excel" | "ai") => {
    setDownloading(kind);
    setError("");
    try {
      const path = kind === "excel" ? "export" : "ai-dataset";
      const response = await adminFetch(
        `${API}/products/master-catalog/admin/${path}?search=${encodeURIComponent(query)}`,
      );
      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(response, "Файл бэлтгэхэд алдаа гарлаа"),
        );
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download =
        kind === "excel" ? "master-products.xlsx" : "master-products-ai.json";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Файл татаж чадсангүй");
    } finally {
      setDownloading(null);
    }
  };

  const syncUnlinked = async () => {
    setSyncing(true);
    setError("");
    try {
      const response = await adminFetch(
        `${API}/products/master-catalog/admin/sync`,
        {
          method: "POST",
        },
      );
      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(
            response,
            "Нэгдсэн барааны сан шинэчлэхэд алдаа гарлаа",
          ),
        );
      }
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Бараануудыг холбож чадсангүй",
      );
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-5 p-4 md:p-6">
      {editingId && (
        <MasterProductEditor
          id={editingId}
          onClose={() => setEditingId(null)}
          onSaved={() => {
            setEditingId(null);
            setSaved(true);
            void load();
          }}
        />
      )}
      {saved && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800"
        >
          Нэгдсэн барааны мэдээлэл хадгалагдлаа. Дэлгүүрүүдийн барааг
          өөрчлөөгүй.
        </p>
      )}
      <CatalogWorkspaceHeader
        total={data?.total ?? 0}
        query={query}
        loading={loading}
        downloading={downloading}
        onDownload={download}
      />
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
          <button
            type="button"
            onClick={() => void load()}
            className="ml-2 font-semibold underline"
          >
            Дахин оролдох
          </button>
        </div>
      )}

      <MasterCatalogSearch
        onSearch={onSearch}
        loading={loading}
        total={data?.total ?? 0}
      />

      <MasterCatalogTable
        data={data}
        loading={loading}
        onEdit={(id) => {
          setSaved(false);
          setEditingId(id);
        }}
        onPage={setPage}
      />
      <CatalogManagementTools
        unlinked={data?.unlinkedProductCount ?? 0}
        syncing={syncing}
        downloading={downloading !== null}
        onSync={syncUnlinked}
        onDownload={() => download("ai")}
      />
    </div>
  );
}
