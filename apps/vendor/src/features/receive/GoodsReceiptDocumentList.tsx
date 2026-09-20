"use client";

import { useEffect, useState } from "react";
import { Eye, FileText, Loader2, RefreshCw } from "lucide-react";
import { API, authFetch } from "@/lib/api";
import {
  GoodsReceiptDocumentModal,
  type GoodsReceiptDocument,
} from "./GoodsReceiptDocumentModal";

const money = (value: number) =>
  `${new Intl.NumberFormat("mn-MN", { maximumFractionDigits: 2 }).format(value)}₮`;
const dateTime = (value: string) =>
  new Intl.DateTimeFormat("mn-MN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export function GoodsReceiptDocumentList({
  registerId,
  refreshKey,
}: {
  registerId: string;
  refreshKey: string;
}) {
  const [documents, setDocuments] = useState<GoodsReceiptDocument[]>([]);
  const [selectedDocument, setSelectedDocument] =
    useState<GoodsReceiptDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!registerId) {
      setDocuments([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void authFetch(
      `${API}/pos/goods-receipts?registerId=${encodeURIComponent(registerId)}`,
      {
        cache: "no-store",
        signal: controller.signal,
      },
    )
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as
          | GoodsReceiptDocument[]
          | { message?: string };
        if (!response.ok || !Array.isArray(body)) {
          throw new Error(
            !Array.isArray(body) && body.message
              ? body.message
              : "Баримтын жагсаалт авахад алдаа гарлаа",
          );
        }
        setDocuments(body);
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError")
          return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Баримтын жагсаалт авахад алдаа гарлаа",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [registerId, refreshKey, reloadKey]);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-950">
            Хүлээн авалтын баримтын жагсаалт
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Сонгосон кассын хамгийн сүүлийн 50 баримт.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setReloadKey((value) => value + 1)}
          disabled={loading || !registerId}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />{" "}
          Шинэчлэх
        </button>
      </div>
      {error && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}
      {loading ? (
        <div className="flex min-h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-600" />
        </div>
      ) : documents.length === 0 ? (
        <div className="mt-4 flex min-h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 text-center">
          <FileText className="h-7 w-7 text-slate-300" />
          <p className="mt-2 text-sm font-bold text-slate-700">
            Хүлээн авалтын баримт алга
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Бараа хүлээн авсны дараа энд автоматаар нэмэгдэнэ.
          </p>
        </div>
      ) : (
        <div className="mt-5 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
          {documents.map((document) => {
            return (
              <article key={document.id}>
                <button
                  type="button"
                  onClick={() => setSelectedDocument(document)}
                  className="grid w-full gap-3 px-4 py-4 text-left hover:bg-slate-50 sm:grid-cols-[1.25fr_1fr_auto_auto_24px] sm:items-center"
                >
                  <div>
                    <p className="font-black text-slate-950">
                      {document.documentNo || document.receiptNo}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Системийн № {document.receiptNo}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {document.supplierName}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {dateTime(document.receivedAt)} · {document.receivedBy}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-slate-700">
                    {document.items.length} бараа · {document.totalQuantity}
                  </p>
                  <p className="text-sm font-black text-cyan-700">
                    {money(document.totalCost)}
                  </p>
                  <Eye className="h-4 w-4 text-cyan-600" />
                </button>
              </article>
            );
          })}
        </div>
      )}
      {selectedDocument && (
        <GoodsReceiptDocumentModal
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
        />
      )}
    </section>
  );
}
