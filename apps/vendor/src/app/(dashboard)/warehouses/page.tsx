"use client";

import { useState, useEffect } from "react";
import {
  MapPin,
  Phone,
  Warehouse as WarehouseIcon,
  Loader2,
  Building2,
  CheckCircle,
  Info,
} from "lucide-react";
import { API } from "@/lib/api";

type Warehouse = {
  id: string;
  name: string;
  address: string;
  city: string;
  district: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
};

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const storedUser = JSON.parse(
          localStorage.getItem("vendor_user") || "{}"
        );
        if (!storedUser.organizationId) {
          console.error("No organization found");
          setLoading(false);
          return;
        }

        const response = await fetch(
          `${API}/warehouses/organization/${storedUser.organizationId}`
        );
        if (response.ok) {
          const data = await response.json();
          setWarehouses(data || []);
        }
      } catch (error) {
        console.error("Failed to fetch warehouses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWarehouses();
  }, []);

  return (
    <div className="space-y-8 p-2">
      <div>
        <h2 className="text-4xl font-black tracking-tighter text-slate-900">
          Агуулах
        </h2>
        <p className="mt-1 font-medium text-slate-500">
          Танд хуваарилагдсан агуулахууд
        </p>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-2xl bg-blue-50 p-4">
        <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-800">
            Агуулах нэмэх хүсэлтэй бол холбооны админтай холбогдоно уу.
          </p>
          <p className="mt-1 text-xs text-blue-600">
            Агуулахыг холбооны админ бүртгэж, vendor-уудад хуваарилдаг.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-[#FFAD02]" />
          </div>
        ) : warehouses.length === 0 ? (
          <div className="col-span-full rounded-3xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
              <WarehouseIcon className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Агуулах олдсонгүй
            </h3>
            <p className="mt-1 text-slate-500">
              Танд одоогоор хуваарилагдсан агуулах байхгүй байна.
            </p>
          </div>
        ) : (
          warehouses.map((warehouse) => (
            <div
              key={warehouse.id}
              className="group flex h-full flex-col rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/80"
            >
              <div className="mb-6 flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFAD02]/10 transition-colors group-hover:bg-[#FFAD02]/20">
                  <WarehouseIcon className="h-7 w-7 text-[#FFAD02]" />
                </div>
                {warehouse.isActive && (
                  <div className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-xs font-medium text-green-600">
                      Идэвхтэй
                    </span>
                  </div>
                )}
              </div>

              <h3 className="mb-3 text-xl font-black text-slate-900">
                {warehouse.name}
              </h3>

              <div className="space-y-2 mb-6">
                <div className="flex items-start gap-2 text-sm text-slate-500">
                  <MapPin className="h-4 w-4 text-[#FFAD02] shrink-0 mt-0.5" />
                  <span>{warehouse.address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <span>
                    {warehouse.city}, {warehouse.district}
                  </span>
                </div>
                {warehouse.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span>{warehouse.phone}</span>
                  </div>
                )}
              </div>

              <div className="mt-auto border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-400">
                  Бүртгэсэн:{" "}
                  {new Date(warehouse.createdAt).toLocaleDateString("mn-MN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
