"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Check, ChevronDown, Loader2 } from "lucide-react";
import { useWarehouseScope } from "./WarehouseScopeProvider";

function getWarehouseInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function WarehouseSwitcher() {
  const {
    warehouses,
    selectedWarehouse,
    selectedWarehouseId,
    isLoading,
    selectWarehouse,
  } = useWarehouseScope();
  const [isOpen, setIsOpen] = useState(false);
  const [switchingToId, setSwitchingToId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const handleSelect = (warehouseId: string) => {
    if (warehouseId === selectedWarehouseId) {
      setIsOpen(false);
      return;
    }
    setSwitchingToId(warehouseId);
    selectWarehouse(warehouseId);
    setIsOpen(false);
    window.setTimeout(() => setSwitchingToId(null), 500);
  };

  if (isLoading) {
    return (
      <div className="flex h-11 w-40 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-400 sm:w-52">
        <Loader2 className="h-4 w-4 animate-spin" />
        Агуулах татаж байна
      </div>
    );
  }

  if (!selectedWarehouse) return null;

  const triggerContent = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100">
        {switchingToId ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Building2 className="h-5 w-5" />
        )}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-bold text-slate-800">
          {selectedWarehouse.name}
        </span>
        {warehouses.length > 1 && (
          <span className="hidden text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:block">
            Агуулах солих
          </span>
        )}
      </span>
    </>
  );

  if (warehouses.length === 1) {
    return (
      <div className="flex h-11 w-40 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 shadow-sm sm:w-52">
        {triggerContent}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="group flex h-11 w-44 items-center gap-2 rounded-xl border border-blue-200 bg-white px-2.5 shadow-sm outline-none transition hover:border-blue-400 hover:shadow-md focus-visible:ring-4 focus-visible:ring-blue-100 sm:w-56"
      >
        {triggerContent}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:text-blue-600 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Агуулах сонгох"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/15"
        >
          <div className="px-3 pb-2 pt-2">
            <p className="text-base font-black text-slate-900">Агуулах солих</p>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">
              Сонгосон агуулах бүх дэлгэцэд үйлчилнэ.
            </p>
          </div>
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {warehouses.map((warehouse) => {
              const isSelected = warehouse.id === selectedWarehouseId;
              const isSwitching = warehouse.id === switchingToId;
              return (
                <button
                  key={warehouse.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(warehouse.id)}
                  className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-blue-400 ${
                    isSelected
                      ? "bg-blue-50"
                      : "hover:bg-slate-50 active:scale-[0.99]"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                      isSelected
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {getWarehouseInitials(warehouse.name) || "WH"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-900">
                      {warehouse.name}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {warehouse.address ||
                        (isSelected ? "Одоогоор ашиглаж байна" : "Энэ агуулах руу шилжих")}
                    </span>
                  </span>
                  {isSwitching ? (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  ) : isSelected ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
                      <Check className="h-4 w-4" strokeWidth={3} />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
