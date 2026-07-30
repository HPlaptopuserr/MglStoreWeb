"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, MapPin, Warehouse } from "lucide-react";
import { API, adminFetch, getApiErrorMessage } from "@/lib/api";
import { ResponsibleEmployeesSection } from "@/components/warehouse/ResponsibleEmployeesSection";
import { WarehouseInventorySummary } from "@/components/warehouse/WarehouseInventorySummary";
import { WarehouseOperatorRegistrationModal } from "@/components/warehouse/WarehouseOperatorRegistrationModal";
import {
  WarehouseInfo,
  WarehouseStats,
} from "@/components/warehouse/WarehouseOverview";
import type {
  ResponsibleEmployee,
  WarehouseDetail,
} from "@/components/warehouse/types";

export default function WarehouseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [warehouse, setWarehouse] = useState<WarehouseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showOperatorModal, setShowOperatorModal] = useState(false);

  const fetchWarehouse = useCallback(async () => {
    try {
      const response = await adminFetch(
        `${API}/warehouses/${params.id}/admin-summary`,
      );
      if (!response.ok) throw new Error("Failed to fetch warehouse");
      setWarehouse((await response.json()) as WarehouseDetail);
    } catch (error) {
      console.error("Failed to fetch warehouse:", error);
      setWarehouse(null);
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void fetchWarehouse();
  }, [fetchWarehouse]);

  const removeResponsibleEmployee = useCallback(
    async (employee: ResponsibleEmployee) => {
      const response = await adminFetch(
        `${API}/warehouse-setup/warehouses/${params.id}/operators/${employee.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(
            response,
            "Ажилтны агуулах хариуцах эрхийг цуцалж чадсангүй",
          ),
        );
      }
      await fetchWarehouse();
    },
    [fetchWarehouse, params.id],
  );

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#5B4CFF]" />
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 rounded-full bg-slate-100 p-4">
          <Warehouse className="h-10 w-10 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Агуулах олдсонгүй</h2>
        <p className="mt-2 text-sm text-slate-500">
          Таны хайсан агуулахын мэдээлэл олдсонгүй
        </p>
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#5B4CFF] px-5 py-2.5 text-sm font-bold text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Буцах
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 pb-10">
      <header className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/60 to-violet-100/70 p-5 shadow-sm sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#5B4CFF]/10 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <button
            type="button"
            aria-label="Буцах"
            onClick={() => router.back()}
            className="rounded-xl border border-white/80 bg-white/90 p-2.5 text-slate-600 shadow-sm transition hover:-translate-x-0.5 hover:bg-white hover:text-[#5B4CFF]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#5B4CFF] text-white shadow-lg shadow-indigo-200">
                <Warehouse className="h-5 w-5" />
              </div>
              <div>
                <p className="mb-0.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#5B4CFF]">
                  Агуулахын дэлгэрэнгүй
                </p>
                <h1 className="truncate text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                  {warehouse.name}
                </h1>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-slate-400" />
                {warehouse.city}, {warehouse.district}
              </span>
              <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />
              <span>
                {warehouse.organizations.length} байгууллагад хуваарилагдсан
              </span>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold shadow-sm ${warehouse.isActive ? "border-emerald-200 bg-white/90 text-emerald-700" : "border-slate-200 bg-white/90 text-slate-600"}`}
          >
            <span
              className={`h-2 w-2 rounded-full ${warehouse.isActive ? "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" : "bg-slate-400"}`}
            />
            {warehouse.isActive ? "Идэвхтэй" : "Идэвхгүй"}
          </span>
        </div>
      </header>

      <WarehouseStats warehouse={warehouse} />
      <WarehouseInfo
        warehouse={warehouse}
        onOpenOrganization={(id) => router.push(`/partners/${id}`)}
      />
      <ResponsibleEmployeesSection
        employees={warehouse.responsibleEmployees}
        onAdd={() => setShowOperatorModal(true)}
        onRemove={removeResponsibleEmployee}
      />
      <WarehouseInventorySummary
        summary={warehouse.summary}
        categories={warehouse.categories}
      />

      {showOperatorModal && (
        <WarehouseOperatorRegistrationModal
          warehouseId={warehouse.id}
          warehouseName={warehouse.name}
          onClose={() => setShowOperatorModal(false)}
          onRegistered={fetchWarehouse}
        />
      )}
    </div>
  );
}
