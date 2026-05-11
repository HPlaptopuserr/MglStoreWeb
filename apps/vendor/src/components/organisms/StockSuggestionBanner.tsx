"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  ArrowRight,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { API, authFetch } from "@/lib/api";

type LowStockItem = {
  id: string;
  quantity: number;
  alertThreshold: number;
  warehouse: {
    id: string;
    name: string;
    city: string;
    district: string;
  };
  product: {
    id: string;
    name: string;
    sku: string | null;
    images: { url: string }[];
    categoryName: string;
  };
};

type SuggestionGroup = {
  warehouseId: string;
  warehouseName: string;
  warehouseCity: string;
  items: LowStockItem[];
};

interface StockSuggestionBannerProps {
  organizationId: string;
  onEnterWarehouse: (warehouseId: string) => void;
}

export function StockSuggestionBanner({
  organizationId,
  onEnterWarehouse,
}: StockSuggestionBannerProps) {
  const [groups, setGroups] = useState<SuggestionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(
        `${API}/stock-requests/catalog/organization/${organizationId}`,
      );
      if (!res?.ok) return;
      const data = await res.json();
      const lowStock: LowStockItem[] = (data.items || []).filter(
        (item: LowStockItem & { isLowStock?: boolean }) =>
          item.isLowStock || item.quantity <= item.alertThreshold,
      );

      const groupMap = new Map<string, SuggestionGroup>();
      for (const item of lowStock) {
        const key = item.warehouse.id;
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            warehouseId: item.warehouse.id,
            warehouseName: item.warehouse.name,
            warehouseCity: item.warehouse.city,
            items: [],
          });
        }
        groupMap.get(key)!.items.push(item);
      }
      setGroups(Array.from(groupMap.values()));
    } catch {
      // Silent fail — не-critical feature
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  const totalLow = groups.reduce((s, g) => s + g.items.length, 0);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-700">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Барааны үлдэгдэл шалгаж байна...</span>
      </div>
    );
  }

  if (totalLow === 0) return null;

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const urgencyColor =
    totalLow >= 10
      ? "border-red-200 bg-red-50"
      : totalLow >= 5
        ? "border-orange-200 bg-orange-50"
        : "border-amber-200 bg-amber-50";

  const headerColor =
    totalLow >= 10
      ? "text-red-800"
      : totalLow >= 5
        ? "text-orange-800"
        : "text-amber-800";

  const badgeColor =
    totalLow >= 10
      ? "bg-red-100 text-red-700"
      : totalLow >= 5
        ? "bg-orange-100 text-orange-700"
        : "bg-amber-100 text-amber-700";

  return (
    <div className={`overflow-hidden rounded-2xl border ${urgencyColor}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${badgeColor}`}
          >
            <TrendingDown className="h-5 w-5" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <p className={`text-sm font-bold ${headerColor}`}>
                Бараа нөхөх санал
              </p>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${badgeColor}`}
              >
                <Sparkles className="h-3 w-3" />
                {totalLow} бараа
              </span>
            </div>
            <p className={`text-xs ${headerColor} opacity-70`}>
              Босго давсан барааг цаг тухайд нь нөхөж, тасалдлаас сэргийлнэ
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              load();
            }}
            className={`rounded-lg p-1.5 opacity-60 transition-opacity hover:opacity-100 ${headerColor}`}
            title="Шинэчлэх"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          {expanded ? (
            <ChevronUp className={`h-5 w-5 ${headerColor} opacity-60`} />
          ) : (
            <ChevronDown className={`h-5 w-5 ${headerColor} opacity-60`} />
          )}
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div className="border-t border-white/50 px-4 pb-4 pt-3 space-y-3">
          {groups.map((group) => {
            const isGroupExpanded = expandedGroups.has(group.warehouseId);
            const criticalCount = group.items.filter(
              (i) => i.quantity === 0,
            ).length;

            return (
              <div
                key={group.warehouseId}
                className="overflow-hidden rounded-xl border border-white/80 bg-white/60 backdrop-blur-sm"
              >
                {/* Group header */}
                <div className="flex items-center justify-between px-4 py-3">
                  <button
                    onClick={() => toggleGroup(group.warehouseId)}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {group.warehouseName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {group.warehouseCity} •{" "}
                        <span className="font-medium text-orange-600">
                          {group.items.length} бараа дутагдалтай
                        </span>
                        {criticalCount > 0 && (
                          <span className="ml-1 font-medium text-red-600">
                            ({criticalCount} дуусчихсан)
                          </span>
                        )}
                      </p>
                    </div>
                    {isGroupExpanded ? (
                      <ChevronUp className="ml-auto h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="ml-auto h-4 w-4 text-slate-400" />
                    )}
                  </button>
                  <button
                    onClick={() => onEnterWarehouse(group.warehouseId)}
                    className="ml-3 inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#FFAD02] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#E09D00] hover:shadow-md"
                  >
                    Татах хүсэлт
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Items list */}
                {isGroupExpanded && (
                  <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {group.items.map((item) => {
                      const pct =
                        item.alertThreshold > 0
                          ? Math.max(
                              0,
                              Math.round(
                                (item.quantity / item.alertThreshold) * 100,
                              ),
                            )
                          : 0;
                      const isEmpty = item.quantity === 0;

                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 px-4 py-2.5"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                            {item.product.images[0]?.url ? (
                              <img
                                src={item.product.images[0].url}
                                alt={item.product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-slate-300" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-xs font-semibold text-slate-800">
                              {item.product.name}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {item.product.sku ? `${item.product.sku} • ` : ""}
                              {item.product.categoryName}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="flex items-center gap-2">
                              <div className="hidden sm:flex w-20 flex-col gap-1">
                                <div className="h-1.5 w-full rounded-full bg-slate-200">
                                  <div
                                    className={`h-1.5 rounded-full transition-all ${isEmpty ? "bg-red-500" : "bg-orange-400"}`}
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                  />
                                </div>
                                <p className="text-[10px] text-slate-400">
                                  Босго: {item.alertThreshold}
                                </p>
                              </div>
                              <span
                                className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold ${
                                  isEmpty
                                    ? "bg-red-100 text-red-700"
                                    : "bg-orange-100 text-orange-700"
                                }`}
                              >
                                {isEmpty ? (
                                  <AlertTriangle className="h-3 w-3" />
                                ) : null}
                                {item.quantity} ш
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
