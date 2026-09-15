"use client";

import { ArrowRight, BellRing, Loader2 } from "lucide-react";
import type { StockRequest } from "./stock-request.model";

interface RequestAttentionBannerProps {
  requests: StockRequest[];
  loadingRequestId: string | null;
  onSelect: (request: StockRequest) => void;
  onShowPending: () => void;
}

export function RequestAttentionBanner({
  requests,
  loadingRequestId,
  onSelect,
  onShowPending,
}: RequestAttentionBannerProps) {
  if (!requests.length) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-amber-300 bg-amber-50 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-amber-200 p-2.5 text-amber-900">
            <BellRing className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-black text-amber-950">
              {requests.length} хүсэлт шалгахыг хүлээж байна
            </p>
            <p className="mt-1 text-xs text-amber-800">
              Хүсэлтээ нээж, барааны тоо хэмжээг шалгаад шийдвэрлээрэй.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onShowPending}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
        >
          Зөвхөн шалгах хүсэлтүүд <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-2 border-t border-amber-200 p-3 sm:grid-cols-2 xl:grid-cols-3">
        {requests.slice(0, 3).map((request) => (
          <button
            key={request.id}
            type="button"
            disabled={loadingRequestId !== null}
            onClick={() => onSelect(request)}
            className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white p-3 text-left transition hover:border-amber-500 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-amber-700 disabled:opacity-60"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-slate-900">
                {request.organization.name}
              </span>
              <span className="mt-1 block truncate text-xs text-slate-600">
                {request.requestNumber}
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                {request.items.length} төрлийн бараа ·{" "}
                {new Date(request.requestedAt).toLocaleString("mn-MN", {
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-amber-900">
              {loadingRequestId === request.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Шалгах <ArrowRight className="h-4 w-4" />
                </>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
