"use client";

import { useState } from "react";
import { Files, ListTree } from "lucide-react";
import { useWarehouseScope } from "@/features/warehouse-scope/WarehouseScopeProvider";
import { WarehouseMovementDocuments } from "@/features/movements/WarehouseMovementDocuments";
import { WarehouseMovementItems } from "@/features/movements/WarehouseMovementItems";
import { MovementDateFilter } from "@/features/movements/MovementDateFilter";

export default function MovementsPage() {
  const { selectedWarehouseId: warehouseId } = useWarehouseScope();
  const [view, setView] = useState<"documents" | "items">("documents");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const dateFilter = (
    <MovementDateFilter
      from={from}
      to={to}
      onFromChange={setFrom}
      onToChange={setTo}
      onClear={() => {
        setFrom("");
        setTo("");
      }}
    />
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Агуулахын хөдөлгөөн
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Орлого, зарлага болон барааны өөрчлөлтийг нэг дор хянах
          </p>
        </div>
        <div
          role="group"
          aria-label="Хөдөлгөөн харах хэлбэр"
          className="inline-flex w-fit gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1"
        >
          {(
            [
              { value: "documents", label: "Падаанаар", icon: Files },
              { value: "items", label: "Бараа бүрээр", icon: ListTree },
            ] as const
          ).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={view === value}
              onClick={() => setView(value)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${view === value ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/70" : "text-slate-500 hover:bg-white/60 hover:text-slate-900"}`}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>
      {!warehouseId ? (
        <div
          role="status"
          className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500"
        >
          Хөдөлгөөний түүх харахын тулд агуулахаа сонгоно уу.
        </div>
      ) : view === "documents" ? (
        <WarehouseMovementDocuments
          key={warehouseId}
          warehouseId={warehouseId}
          dateFrom={from}
          dateTo={to}
          dateFilter={dateFilter}
          onClearDates={() => {
            setFrom("");
            setTo("");
          }}
        />
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            {dateFilter}
          </div>
          <WarehouseMovementItems
            key={warehouseId}
            warehouseId={warehouseId}
            dateFrom={from}
            dateTo={to}
          />
        </>
      )}
    </div>
  );
}
