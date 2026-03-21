"use client";

import type { DashboardStats } from "../../../lib/dashboard-api";
import { DollarSign, Loader2, Wallet } from "lucide-react";

interface InvestorStatsGridProps {
  loading: boolean;
  data: DashboardStats | null;
}

export function InvestorStatsGrid({
  loading,
  data,
}: InvestorStatsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 md:gap-4">
      {loading ? (
        <div className="col-span-2 flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
        </div>
      ) : (
        <>
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200/60 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-amber-600/70">
                  Хөрөнгө оруулагчид
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold text-amber-800">
                  {data?.stats.totalInvestors ?? 0}
                </p>
              </div>
            </div>
            <p className="text-xs text-amber-600/60">
              Нийт түншүүдийн{" "}
              {data?.stats.activeOrganizations
                ? Math.round(
                    ((data?.stats.totalInvestors ?? 0) /
                      data.stats.activeOrganizations) *
                      100,
                  )
                : 0}
              % нь хөрөнгө оруулагч
            </p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200/60 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-emerald-600/70">
                  Нийт оруулсан хөрөнгө
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-800">
                  {((data?.stats.totalInvestmentAmount ?? 0) / 1_000_000).toLocaleString(
                    undefined,
                    { maximumFractionDigits: 1 },
                  )}
                  <span className="text-base font-bold text-emerald-500 ml-1">
                    сая ₮
                  </span>
                </p>
              </div>
            </div>
            <p className="text-xs text-emerald-600/60">
              Дундаж:{" "}
              {data?.stats.totalInvestors
                ? (
                    data.stats.totalInvestmentAmount /
                    data.stats.totalInvestors /
                    1_000_000
                  ).toLocaleString(undefined, { maximumFractionDigits: 1 })
                : 0}{" "}
              сая ₮ / хөрөнгө оруулагч
            </p>
          </div>
        </>
      )}
    </div>
  );
}