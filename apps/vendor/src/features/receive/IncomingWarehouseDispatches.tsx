"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, PackageCheck, RefreshCw } from "lucide-react";
import type {
  WarehouseDispatchDocument,
  WarehouseDispatchHistory,
} from "@mgl/types";
import { API, authFetch } from "@/lib/api";
import { notifyProductCatalogChanged } from "@/lib/product-catalog-events";
import { parseVendorSessionUser } from "@/features/session/vendor-session.model";
import { IncomingDispatchReview } from "./IncomingDispatchReview";

async function readResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { message?: string };
  if (!response.ok)
    throw new Error(data.message || "Падааны мэдээлэл авч чадсангүй.");
  return data;
}

export function IncomingWarehouseDispatches({
  onAccepted,
}: {
  onAccepted: () => void;
}) {
  const [organizationId, setOrganizationId] = useState("");
  const [documents, setDocuments] = useState<WarehouseDispatchDocument[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [acceptingId, setAcceptingId] = useState("");
  const submittingRef = useRef(false);
  useEffect(() => {
    try {
      const user = parseVendorSessionUser(
        JSON.parse(localStorage.getItem("vendor_user") || "null"),
      );
      if (user.orgRole === "OWNER" && user.organizationId)
        setOrganizationId(user.organizationId);
    } catch {
      // The surrounding page handles an invalid session.
    }
  }, []);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!organizationId) return;
      setLoading(true);
      setError("");
      try {
        const data = await readResponse<WarehouseDispatchHistory>(
          await authFetch(
            `${API}/vendor/manual-dispatches?${new URLSearchParams({ organizationId, page: String(page), pageSize: "10" })}`,
            { cache: "no-store", signal },
          ),
        );
        if (!signal?.aborted) {
          setDocuments(data.items);
          setTotalPages(data.totalPages);
        }
      } catch (cause) {
        if (!signal?.aborted)
          setError(
            cause instanceof Error ? cause.message : "Падаан ачаалж чадсангүй.",
          );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [organizationId, page],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const accept = async (
    id: string,
    salePrices: Array<{ itemId: string; salePrice: string }>,
    updatePrices = false,
  ) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setAcceptingId(id);
    setError("");
    setSuccess("");
    try {
      const accepted = await readResponse<WarehouseDispatchDocument>(
        await authFetch(
          `${API}/vendor/manual-dispatches/${encodeURIComponent(id)}/${updatePrices ? "sale-prices" : "accept"}`,
          {
            method: updatePrices ? "PATCH" : "POST",
            body: JSON.stringify({ organizationId, salePrices }),
          },
        ),
      );
      const pricesBySource = new Map(
        accepted.items.map((item) => [item.productId, item.salePrice]),
      );
      setDocuments((current) =>
        current.map((document) =>
          document.id === id
            ? accepted
            : {
                ...document,
                items: document.items.map((item) =>
                  pricesBySource.has(item.productId)
                    ? { ...item, salePrice: pricesBySource.get(item.productId) }
                    : item,
                ),
              },
        ),
      );
      setSuccess(
        updatePrices
          ? "Зарах үнэ бүтээгдэхүүнд хадгалагдлаа. Үлдэгдэл өөрчлөгдөөгүй."
          : "Падааны бараа хүлээн авч, зарах үнийг хадгаллаа.",
      );
      notifyProductCatalogChanged(organizationId);
      onAccepted();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Хүлээн авалтыг бүртгэж чадсангүй.",
      );
    } finally {
      submittingRef.current = false;
      setAcceptingId("");
    }
  };

  if (!organizationId) return null;
  const pending = documents.filter(
    (document) => document.receiptStatus === "PENDING",
  );
  const accepted = documents.filter(
    (document) => document.receiptStatus === "ACCEPTED",
  );
  return (
    <section
      aria-labelledby="incoming-dispatch-heading"
      className="space-y-4 rounded-3xl border border-cyan-100 bg-cyan-50/50 p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="incoming-dispatch-heading"
            className="text-lg font-bold text-slate-950"
          >
            Агуулахаас ирсэн падаан{" "}
            {pending.length > 0 && (
              <span className="ml-1 text-sm text-cyan-700">
                · Энэ хуудсанд {pending.length} хүлээгдэж байна
              </span>
            )}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Эзэн бараагаа тулгаж зөвшөөрсний дараа бүтээгдэхүүн, үлдэгдэлд
            бүртгэнэ.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || Boolean(acceptingId)}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
        >
          <RefreshCw size={15} />
          Шинэчлэх
        </button>
      </div>
      {success && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {success}
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          {error}
        </div>
      )}
      {loading && (
        <p
          role="status"
          className="flex items-center gap-2 py-3 text-sm text-slate-600"
        >
          <Loader2
            size={16}
            className="animate-spin motion-reduce:animate-none"
          />
          Падаан ачаалж байна…
        </p>
      )}
      {!loading && !error && pending.length === 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-cyan-200 bg-white p-4 text-sm text-slate-600">
          <PackageCheck size={22} className="shrink-0 text-cyan-600" />
          Энэ хуудсанд зөвшөөрөх хүлээгдэж буй падаан алга.
        </div>
      )}
      {!loading &&
        pending.map((document) => (
          <IncomingDispatchReview
            key={document.id}
            document={document}
            submitting={Boolean(acceptingId)}
            onAccept={(prices) => void accept(document.id, prices)}
          />
        ))}
      {!loading && accepted.length > 0 && (
        <details className="rounded-xl border border-slate-200 bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">
            Энэ хуудсан дахь хүлээн авсан падаан ({accepted.length})
          </summary>
          <div className="mt-4 space-y-4">
            {accepted.map((document) => (
              <IncomingDispatchReview
                key={`${document.id}:${document.items.map((item) => item.salePrice ?? "").join(",")}`}
                document={document}
                submitting={Boolean(acceptingId)}
                onAccept={() => {}}
                onSavePrices={(prices) =>
                  void accept(document.id, prices, true)
                }
              />
            ))}
          </div>
        </details>
      )}
      {totalPages > 1 && (
        <nav
          aria-label="Падааны хуудас"
          className="flex flex-wrap items-center justify-between gap-3 text-sm"
        >
          <p className="text-slate-600">
            Хуудас {page} / {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading || Boolean(acceptingId)}
              onClick={() => setPage((current) => current - 1)}
              className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 disabled:opacity-40"
            >
              Өмнөх
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading || Boolean(acceptingId)}
              onClick={() => setPage((current) => current + 1)}
              className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 disabled:opacity-40"
            >
              Дараах
            </button>
          </div>
        </nav>
      )}
    </section>
  );
}
