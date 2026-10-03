"use client";
import type { StockRequestUser } from "@/features/shipments/types/stock-request.types";

import { LowStockSuggestions } from "@/features/shipments/components/LowStockSuggestions";
import type {
  OutstandingPaymentSummary,
  StockRequestView,
  SuggestedStockItem,
  SupplyWarehouse,
} from "@/features/shipments/types/stock-request.types";
import {
  AlertCircle,
  ChevronRight,
  CreditCard,
  Phone,
  Warehouse as WarehouseIcon,
} from "lucide-react";
import type * as React from "react";

interface SupplyWarehouseListProps {
  navigation: React.ReactNode;
  outstandingPayments: OutstandingPaymentSummary | null;
  setViewMode: React.Dispatch<React.SetStateAction<StockRequestView>>;
  user: StockRequestUser | null;
  enterWarehouseById: (
    warehouseId: string,
    autoItems?: SuggestedStockItem[],
  ) => void;
  warehouses: SupplyWarehouse[];
  enterWarehouse: (
    warehouse: SupplyWarehouse,
    autoItems?: SuggestedStockItem[],
  ) => Promise<void>;
}

export function SupplyWarehouseList({
  navigation,
  outstandingPayments,
  setViewMode,
  user,
  enterWarehouseById,
  warehouses,
  enterWarehouse,
}: SupplyWarehouseListProps) {
  return (
    <div className="space-y-6 p-2">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">
          Бараа таталтын удирдлага
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Бараа сонгохоос төлбөр, хүргэлт хүртэл нэг урсгалаар удирдана.
        </p>
      </div>

      {navigation}

      <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4">
        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm font-medium text-amber-800">
          Агуулах руу орж бараагаа сонгоод захиалга илгээнэ. Админ зөвшөөрснөөр
          бараа татах боломжтой.
        </p>
      </div>

      {(outstandingPayments?.count ?? 0) > 0 && (
        <div className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-bold text-red-900">
                Өмнөх төлбөрийн үлдэгдэл байна
              </p>
              <p className="mt-1 text-sm text-red-700">
                {outstandingPayments?.count} нэхэмжлэхийн нийт үлдэгдэл{" "}
                {(outstandingPayments?.totalUnpaid ?? 0).toLocaleString()}₮.
                Төлбөр бүрэн төлөгдсөний дараа шинэ захиалга шууд нээгдэнэ.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setViewMode("payments")}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          >
            <CreditCard className="h-4 w-4" />
            Төлбөр төлөх
          </button>
        </div>
      )}

      {user?.organizationId && (outstandingPayments?.count ?? 0) === 0 && (
        <LowStockSuggestions
          organizationId={user.organizationId}
          onEnterWarehouse={enterWarehouseById}
        />
      )}

      {warehouses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16">
          <div className="mb-4 rounded-full bg-slate-100 p-4">
            <WarehouseIcon className="h-8 w-8 text-slate-300" />
          </div>
          <p className="text-lg font-semibold text-slate-600">
            Захиалга авах төв агуулах хуваарилагдаагүй байна
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Төв агуулахын эрх авахын тулд админтай холбогдоно уу
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {warehouses.map((warehouse) => (
            <div
              key={warehouse.id}
              onClick={() => enterWarehouse(warehouse)}
              aria-disabled={(outstandingPayments?.count ?? 0) > 0}
              className={`group rounded-2xl border border-slate-100 bg-white p-5 transition-all ${
                (outstandingPayments?.count ?? 0) > 0
                  ? "cursor-not-allowed opacity-55"
                  : "cursor-pointer hover:border-[#FFAD02]/30 hover:shadow-lg hover:shadow-[#FFAD02]/10"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-[#FFAD02]/10 p-3 transition-all group-hover:bg-[#FFAD02] group-hover:shadow-lg group-hover:shadow-[#FFAD02]/30">
                  <WarehouseIcon className="h-6 w-6 text-[#FFAD02] transition-colors group-hover:text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 group-hover:text-[#FFAD02]">
                    {warehouse.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {warehouse.city}, {warehouse.district}
                  </p>
                  {warehouse.phone && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-400">
                      <Phone className="h-3 w-3" />
                      {warehouse.phone}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-[#FFAD02]" />
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-medium text-[#FFAD02]">
                  Бараа сонгох →
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
