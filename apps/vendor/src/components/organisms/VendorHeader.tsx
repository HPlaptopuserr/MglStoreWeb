"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/atoms/Input";
import { API } from "@/lib/api";

type StockAlertResponse = {
  summary?: {
    lowStockItems?: number;
  };
  items?: Array<{
    id: string;
    quantity: number;
    alertThreshold: number;
    isLowStock: boolean;
    product: {
      name: string;
    };
  }>;
};

export default function VendorHeader() {
  const [displayName, setDisplayName] = useState("Vendor User");
  const [role, setRole] = useState("Vendor");
  const [lowStockCount, setLowStockCount] = useState(0);
  const [topAlertLabel, setTopAlertLabel] = useState("");
  const router = useRouter();

  useEffect(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("vendor_user") || "{}");
      setDisplayName(storedUser.organizationName || storedUser.name || "Vendor User");
      setRole(storedUser.role || "Vendor");
    } catch {}
  }, []);

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const storedUser = JSON.parse(localStorage.getItem("vendor_user") || "{}");
        if (!storedUser.organizationId) return;

        const response = await fetch(
          `${API}/stock-requests/catalog/organization/${storedUser.organizationId}`,
        );
        if (!response.ok) return;

        const data: StockAlertResponse = await response.json();
        const lowStockItems = (data.items || []).filter((item) => item.isLowStock);
        setLowStockCount(data.summary?.lowStockItems || lowStockItems.length || 0);
        setTopAlertLabel(lowStockItems[0]?.product.name || "");
      } catch (error) {
        console.error("Failed to load stock alerts:", error);
      }
    };

    loadAlerts();
  }, []);

  const initial = displayName.charAt(0).toUpperCase();
  const notificationLabel =
    lowStockCount > 0
      ? `${lowStockCount} барааны үлдэгдэл багассан байна`
      : "Үлдэгдэл багассан барааны анхааруулга алга";

  return (
    <header className="sticky top-0 z-50 flex h-20 items-center justify-between border-b border-slate-200 bg-slate-50/80 px-8 py-4 backdrop-blur-sm">
      <div className="max-w-xl flex-1">
        <div className="group relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-slate-400 transition-colors group-focus-within:text-[#FFAD02]" />
          </div>

          <Input
            className="h-12 rounded-2xl border-none bg-white pl-10 font-medium text-slate-600 shadow-sm transition-all placeholder:text-slate-400 hover:shadow-md focus:ring-2 focus:ring-[#FFAD02]/20"
            placeholder="Search shipments, products, drivers..."
          />
        </div>
      </div>

      <div className="flex items-center space-x-6 pl-8">
        <button
          type="button"
          title={notificationLabel}
          onClick={() => router.push("/supply-products?filter=low-stock")}
          className="group relative rounded-full bg-white p-3 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
        >
          <Bell
            className={`h-5 w-5 transition-colors ${
              lowStockCount > 0
                ? "text-[#FFAD02]"
                : "text-slate-400 group-hover:text-[#FFAD02]"
            }`}
          />
          {lowStockCount > 0 && (
            <>
              <span className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                {lowStockCount > 9 ? "9+" : lowStockCount}
              </span>
              <span className="absolute inset-0 rounded-full ring-2 ring-[#FFAD02]/30 ring-offset-2 ring-offset-slate-50 animate-pulse" />
            </>
          )}
        </button>

        {lowStockCount > 0 && (
          <button
            type="button"
            onClick={() => router.push("/supply-products?filter=low-stock")}
            className="hidden rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-left md:block"
          >
            <p className="text-xs font-black uppercase tracking-wide text-amber-700">
              Анхааруулга
            </p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">
              {notificationLabel}
            </p>
            {topAlertLabel && (
              <p className="mt-0.5 text-xs text-slate-500">
                Жишээ: {topAlertLabel}
              </p>
            )}
          </button>
        )}

        <Link
          href="/profile"
          className="group flex items-center space-x-3 rounded-2xl border-l border-slate-200 p-2 pl-6 transition-colors hover:bg-slate-50"
        >
          <div className="hidden text-right md:block">
            <p className="text-sm font-bold text-slate-900 transition-colors group-hover:text-[#FFAD02]">
              {displayName}
            </p>
            <p className="text-xs font-medium text-slate-400">{role}</p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white shadow-lg shadow-black/20 ring-2 ring-white transition-all group-hover:scale-105 group-hover:ring-[#FFAD02]">
            <span className="text-sm font-bold">{initial}</span>
          </div>
        </Link>
      </div>
    </header>
  );
}
