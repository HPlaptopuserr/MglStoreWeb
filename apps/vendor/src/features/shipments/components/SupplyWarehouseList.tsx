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
  ArrowRight,
  ChevronRight,
  CreditCard,
  MapPin,
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
    <div className="mx-auto max-w-7xl space-y-5 pb-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-amber-700">
            НИЙЛҮҮЛЭЛТ
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
            Бараа таталтын удирдлага
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Нийлүүлэгчээ сонгож, дэлгүүрийнхээ барааг нэг дор захиалаарай.
          </p>
        </div>
      </header>

      {navigation}

      {(outstandingPayments?.count ?? 0) > 0 && (
        <div className="flex flex-col gap-4 rounded-2xl border border-rose-200 bg-rose-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-rose-600"
            />
            <div>
              <p className="text-sm font-semibold text-rose-950">
                Өмнөх төлбөрийн үлдэгдэл байна
              </p>
              <p className="mt-1 text-sm leading-6 text-rose-800">
                {outstandingPayments?.count} нэхэмжлэх ·{" "}
                <strong className="font-semibold tabular-nums">
                  {(outstandingPayments?.totalUnpaid ?? 0).toLocaleString()} ₮
                </strong>
                . Бараа үзэх боломжтой. Шинэ захиалга илгээхийн өмнө төлбөрөө
                төлнө үү.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setViewMode("payments")}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-800 transition-colors hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
          >
            <CreditCard aria-hidden="true" className="size-4" />
            Төлбөр төлөх
          </button>
        </div>
      )}

      <section
        aria-labelledby="supply-warehouse-heading"
        className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="supply-warehouse-heading"
              className="text-base font-bold text-slate-950"
            >
              Нийлүүлэгч агуулах сонгох
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Каталогоос бараагаа сонгоод, хүргэлтийн мэдээллээ оруулж хүсэлт
              илгээнэ.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-600">
            {warehouses.length} агуулах
          </span>
        </div>

        {warehouses.length === 0 ? (
          <div className="mt-5 flex flex-col items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400">
              <WarehouseIcon aria-hidden="true" className="size-6" />
            </span>
            <h3 className="mt-4 text-sm font-semibold text-slate-800">
              Одоогоор идэвхтэй төв агуулах алга байна
            </h3>
            <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
              Агуулахын мэдээлэл нэмэгдсэний дараа энд харагдана. Админтай
              холбогдоно уу.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {warehouses.map((warehouse) => {
              const location = [warehouse.city, warehouse.district]
                .filter(Boolean)
                .join(", ");
              return (
                <button
                  type="button"
                  key={warehouse.id}
                  onClick={() => void enterWarehouse(warehouse)}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-amber-400 hover:bg-amber-50/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-100">
                      <WarehouseIcon aria-hidden="true" className="size-5" />
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className="mt-1 size-4 text-slate-400 group-hover:text-amber-600"
                    />
                  </div>
                  <h3 className="mt-4 break-words text-base font-bold text-slate-950">
                    {warehouse.name}
                  </h3>
                  <div className="mt-3 flex-1 space-y-2 text-xs leading-5 text-slate-500">
                    {(location || warehouse.address) && (
                      <p className="flex items-start gap-2">
                        <MapPin
                          aria-hidden="true"
                          className="mt-0.5 size-3.5 shrink-0"
                        />
                        <span>{location || warehouse.address}</span>
                      </p>
                    )}
                    {warehouse.address &&
                      location &&
                      warehouse.address !== location && (
                        <p className="pl-5.5">{warehouse.address}</p>
                      )}
                    {warehouse.phone && (
                      <p className="flex items-center gap-2 tabular-nums">
                        <Phone
                          aria-hidden="true"
                          className="size-3.5 shrink-0"
                        />
                        {warehouse.phone}
                      </p>
                    )}
                  </div>
                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm font-semibold text-amber-700">
                    <span>Бараа сонгох</span>
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <p className="flex items-start gap-2 px-1 text-xs leading-5 text-slate-500">
        <AlertCircle
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-slate-400"
        />
        Захиалга илгээсний дараа админ хянаж зөвшөөрнө. Явцыг “Захиалгын түүх”
        хэсгээс харна.
      </p>

      {user?.organizationId && (outstandingPayments?.count ?? 0) === 0 && (
        <LowStockSuggestions
          organizationId={user.organizationId}
          onEnterWarehouse={enterWarehouseById}
        />
      )}
    </div>
  );
}
