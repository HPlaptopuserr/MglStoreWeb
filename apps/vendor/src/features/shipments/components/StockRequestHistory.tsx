"use client";

import { StockRequestFilters } from "@/features/shipments/components/StockRequestFilters";
import { STOCK_REQUEST_STATUS } from "@/features/shipments/stock-request.constants";
import type {
  StockRequest,
  StockRequestView,
  SupplyWarehouse,
} from "@/features/shipments/types/stock-request.types";
import {
  CheckCircle,
  ChevronRight,
  Clock,
  Package,
  Truck,
  Warehouse as WarehouseIcon,
} from "lucide-react";
import type * as React from "react";

interface StockRequestHistoryProps {
  navigation: React.ReactNode;
  requests: StockRequest[];
  warehouses: SupplyWarehouse[];
  setFilteredRequests: React.Dispatch<React.SetStateAction<StockRequest[]>>;
  filteredRequests: StockRequest[];
  setViewMode: React.Dispatch<React.SetStateAction<StockRequestView>>;
  setSelectedRequest: React.Dispatch<React.SetStateAction<StockRequest | null>>;
  setShowDetailModal: React.Dispatch<React.SetStateAction<boolean>>;
  handleCancel: (requestId: string) => Promise<void>;
  requestDialog: React.ReactNode;
}

export function StockRequestHistory({
  navigation,
  requests,
  warehouses,
  setFilteredRequests,
  filteredRequests,
  setViewMode,
  setSelectedRequest,
  setShowDetailModal,
  handleCancel,
  requestDialog,
}: StockRequestHistoryProps) {
  return (
    <div className="space-y-6 p-2">
      <div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Захиалгын түүх
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Илгээсэн захиалгын төлөв, төлбөр болон хүргэлтийн явц
          </p>
        </div>
      </div>

      {navigation}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          {
            status: "PENDING",
            label: "Хүлээгдэж буй",
            icon: Clock,
            bg: "bg-amber-50",
            color: "text-amber-600",
          },
          {
            status: "APPROVED",
            label: "Зөвшөөрөгдсөн",
            icon: CheckCircle,
            bg: "bg-green-50",
            color: "text-green-600",
          },
          {
            status: "PROCESSING",
            label: "Боловсруулж буй",
            icon: Truck,
            bg: "bg-blue-50",
            color: "text-blue-600",
          },
          {
            status: "COMPLETED",
            label: "Дууссан",
            icon: Package,
            bg: "bg-slate-100",
            color: "text-slate-600",
          },
        ].map(({ status, label, icon: Icon, bg, color }) => (
          <div
            key={status}
            className="rounded-2xl border border-slate-100 bg-white p-4"
          >
            <div className="flex items-center gap-3">
              <div className={`rounded-xl ${bg} p-2.5`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">
                  {requests.filter((r) => r.status === status).length}
                </p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <StockRequestFilters
        requests={requests}
        warehouses={warehouses}
        onChange={(filtered) => setFilteredRequests(filtered)}
      />

      {filteredRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16">
          <div className="mb-4 rounded-full bg-slate-100 p-4">
            <Package className="h-8 w-8 text-slate-300" />
          </div>
          <p className="text-lg font-semibold text-slate-600">
            {requests.length === 0
              ? "Захиалгын түүх хоосон байна"
              : "Шүүлтүүрт тохирох захиалга олдсонгүй"}
          </p>
          {requests.length === 0 ? (
            <button
              onClick={() => setViewMode("warehouses")}
              className="mt-4 rounded-xl bg-[#FFAD02] px-6 py-2.5 text-sm font-bold text-white"
            >
              Шинэ захиалга
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => {
            const config = STOCK_REQUEST_STATUS[request.status];
            const StatusIcon = config.icon;
            return (
              <div
                key={request.id}
                className="rounded-2xl border border-slate-100 bg-white p-5 hover:shadow-md cursor-pointer"
                onClick={() => {
                  setSelectedRequest(request);
                  setShowDetailModal(true);
                }}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-[#FFAD02]/10 p-3">
                      <WarehouseIcon className="h-6 w-6 text-[#FFAD02]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900">
                          {request.requestNumber}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${config.bgColor} ${config.color}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {request.warehouse.name}
                      </p>
                      <p className="text-sm text-slate-500">
                        {request.items.length} төрөл •{" "}
                        {request.items.reduce(
                          (sum, i) => sum + (i.approvedQuantity || i.quantity),
                          0,
                        )}{" "}
                        ш
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Илгээсэн</p>
                      <p className="text-sm font-medium text-slate-600">
                        {new Date(request.requestedAt).toLocaleDateString(
                          "mn-MN",
                        )}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300" />
                  </div>
                </div>
                {request.status === "PENDING" && (
                  <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancel(request.id);
                      }}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Цуцлах
                    </button>
                  </div>
                )}
                {request.status === "REJECTED" && request.reviewNote && (
                  <div className="mt-4 rounded-xl bg-red-50 p-3">
                    <p className="text-xs font-medium text-red-800">
                      Татгалзсан шалтгаан:
                    </p>
                    <p className="mt-1 text-sm text-red-600">
                      {request.reviewNote}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {requestDialog}
    </div>
  );
}
