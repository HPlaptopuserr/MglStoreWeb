"use client";

import { usePathname } from "next/navigation";
import { Building2, ChevronDown, Loader2, Search } from "lucide-react";
import { WarehouseNotificationsMenu } from "@/features/notifications/WarehouseNotificationsMenu";
import { useWarehouseScope } from "@/features/warehouse-scope/WarehouseScopeProvider";

interface WmsHeaderProps {
  userName: string;
  userInitials: string;
}

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Хянах самбар",
  "/inventory": "Нөөцийн байдал",
  "/receive": "Бараа хүлээн авах",
  "/dispatch": "Бараа гаргах",
  "/transfers": "Шилжүүлэг",
  "/movements": "Хөдөлгөөний түүх",
  "/reports": "Тайлан",
  "/settings": "Тохиргоо",
};

export default function WmsHeader({ userName, userInitials }: WmsHeaderProps) {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] || "MGL WMS";
  const {
    warehouses,
    selectedWarehouse,
    selectedWarehouseId,
    isLoading,
    selectWarehouse,
  } = useWarehouseScope();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold text-slate-900">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="min-w-0">
          {isLoading ? (
            <div className="flex h-9 w-44 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Агуулах татаж байна
            </div>
          ) : warehouses.length > 1 ? (
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-600" />
              <select
                aria-label="Агуулах солих"
                value={selectedWarehouseId}
                onChange={(event) => selectWarehouse(event.target.value)}
                className="h-9 w-36 appearance-none truncate rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-xs font-semibold text-slate-700 outline-none transition hover:border-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:w-48 sm:text-sm lg:w-56"
              >
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          ) : selectedWarehouse ? (
            <div className="flex h-9 w-36 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 sm:w-48 sm:text-sm lg:w-56">
              <Building2 className="h-4 w-4 shrink-0 text-blue-600" />
              <span className="truncate">{selectedWarehouse.name}</span>
            </div>
          ) : null}
        </div>

        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="SKU, баркод хайх..."
            className="h-9 w-64 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none transition-all focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <WarehouseNotificationsMenu />

        {/* User */}
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
            {userInitials}
          </div>
          <span className="hidden text-sm font-medium text-slate-700 lg:block">
            {userName}
          </span>
        </div>
      </div>
    </header>
  );
}
