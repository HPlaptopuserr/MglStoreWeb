"use client";

import { useCallback, useEffect, useState } from "react";
import { History, RefreshCw, Sparkles, TrendingUp } from "lucide-react";
import { API, API_BASE, authFetch } from "@/lib/api";

export interface RecommendedWarehouseItem {
  score: number;
  confidence: number;
  suggestedQuantity: number;
  reason: "STOCK_REPLENISHMENT" | "REPEAT_PURCHASE" | "NETWORK_TRENDING";
  explanation: string;
  candidate: {
    inventoryId: string;
    productId: string;
    features: {
      availableStock: number;
      organizationStock: number;
      personalRequestedQuantity90d: number;
      personalRequestCount90d: number;
      networkRequestedQuantity90d: number;
      networkRequestCount90d: number;
      networkOrganizationCount90d: number;
    };
    product: {
      id: string;
      name: string;
      sku: string | null;
      price: string;
      images: { url: string }[];
      category: { id: string; name: string } | null;
      businessCategory: { id: string; name: string } | null;
    };
  };
}

interface RecommendationEngine {
  strategy: string;
  version: string;
}

interface RecommendationResponse {
  engine?: RecommendationEngine;
  generatedAt?: string;
  items?: RecommendedWarehouseItem[];
}

interface WarehouseRecommendationsProps {
  organizationId: string;
  warehouseId: string;
  onAdd: (item: RecommendedWarehouseItem, quantity: number) => void;
}

function getProduct(item: RecommendedWarehouseItem) {
  return item.candidate.product;
}

function getReasonIcon(reason: RecommendedWarehouseItem["reason"]) {
  return reason === "NETWORK_TRENDING" ? TrendingUp : History;
}

/*
 * The UI consumes the strategy-neutral API contract. It intentionally does
 * not know whether the score came from rules, an ML model, or an AI service.
 */
function resolveImageUrl(url?: string) {
  if (!url) return "";
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return url.startsWith("/") ? `${API_BASE}${url}` : url;
}

export function WarehouseRecommendations({
  organizationId,
  warehouseId,
  onAdd,
}: WarehouseRecommendationsProps) {
  const [items, setItems] = useState<RecommendedWarehouseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(false);
      try {
        const params = new URLSearchParams({
          organizationId,
          limit: "8",
        });
        const response = await authFetch(
          `${API}/stock-requests/warehouse/${warehouseId}/recommendations?${params.toString()}`,
          { signal },
        );
        if (!response.ok) throw new Error("Recommendation request failed");
        const payload = (await response.json()) as RecommendationResponse;
        setItems(Array.isArray(payload.items) ? payload.items : []);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        setError(true);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [organizationId, warehouseId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  if (loading) {
    return null;
  }

  if (error) {
    return (
      <button
        type="button"
        onClick={() => void load()}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700"
      >
        <RefreshCw className="h-4 w-4" />
        Санал болгох барааг дахин ачаалах
      </button>
    );
  }

  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby="warehouse-recommendations-title"
      className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 shadow-sm"
    >
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <h2
            id="warehouse-recommendations-title"
            className="text-sm font-black text-slate-900"
          >
            Танд санал болгох бараа
          </h2>
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            Борлуулалт, өмнөх захиалга болон үлдэгдэлд үндэслэв
          </p>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {items.map((item) => {
          const product = getProduct(item);
          const suggestedQuantity = item.suggestedQuantity;
          const imageUrl = resolveImageUrl(product.images[0]?.url);
          const ReasonIcon = getReasonIcon(item.reason);
          return (
            <article
              key={item.candidate.inventoryId}
              className="flex w-64 shrink-0 flex-col rounded-2xl border border-white bg-white p-3 shadow-sm"
            >
              <div className="flex gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <TrendingUp className="h-5 w-5 text-slate-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-xs font-bold text-slate-900">
                    {product.name}
                  </h3>
                  <p className="mt-1 text-[11px] font-semibold text-indigo-600">
                    {suggestedQuantity} ширхэг санал болгож байна
                  </p>
                </div>
              </div>
              <p className="mt-3 flex min-h-8 items-start gap-1.5 text-[11px] leading-4 text-slate-500">
                <ReasonIcon className="mt-0.5 h-3 w-3 shrink-0" />
                {item.explanation}
              </p>
              <button
                type="button"
                onClick={() => onAdd(item, suggestedQuantity)}
                className="mt-3 min-h-9 rounded-xl bg-slate-900 px-3 text-xs font-bold text-white transition hover:bg-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                Сагсанд нэмэх
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
