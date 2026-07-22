"use client";

import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Plus,
  Search,
  User,
  Warehouse,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { WarehouseAssignmentModal } from "@/components/warehouse/management/WarehouseAssignmentModal";
import { WarehouseDeleteDialog } from "@/components/warehouse/management/WarehouseDeleteDialog";
import { WarehouseFormModal } from "@/components/warehouse/management/WarehouseFormModal";
import { WarehouseList } from "@/components/warehouse/management/WarehouseList";
import { useWarehouseManagement } from "@/components/warehouse/management/useWarehouseManagement";

export default function AdminWarehousesPage() {
  const router = useRouter();
  const management = useWarehouseManagement();
  if (management.isLoading)
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#5B4CFF]" />
      </div>
    );

  const assignedCount = management.warehouses.filter(
    (item) => item.organizations.length > 0,
  ).length;
  const stats = [
    {
      label: "Нийт агуулах",
      value: management.warehouses.length,
      icon: Warehouse,
      tone: "bg-indigo-50 text-[#5B4CFF]",
    },
    {
      label: "Хуваарилагдсан",
      value: assignedCount,
      icon: CheckCircle,
      tone: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Хуваарилаагүй",
      value: management.warehouses.length - assignedCount,
      icon: AlertCircle,
      tone: "bg-amber-50 text-amber-600",
    },
  ];
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Агуулахууд</h1>
          <p className="text-sm text-slate-500">
            Админаас үүсгэсэн агуулахуудыг удирдах, байгууллагад хуваарилах
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => router.push("/warehouses/operators")}
            className="inline-flex items-center gap-2 rounded-xl border border-[#5B4CFF]/30 px-5 py-3 text-sm font-bold text-[#5B4CFF] hover:bg-indigo-50"
          >
            <User className="h-5 w-5" />
            Оператор бүртгэл
          </button>
          <button
            type="button"
            onClick={management.openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[#5B4CFF] px-5 py-3 text-sm font-bold text-white hover:bg-[#4b3ee8]"
          >
            <Plus className="h-5 w-5" />
            Шинэ агуулах
          </button>
        </div>
      </header>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={management.searchTerm}
          onChange={(event) => management.setSearchTerm(event.target.value)}
          placeholder="Агуулах хайх..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#5B4CFF] focus:ring-2 focus:ring-indigo-100"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-100 bg-white p-6"
          >
            <div className="flex items-center gap-4">
              <span className={`rounded-xl p-3 ${tone}`}>
                <Icon className="h-6 w-6" />
              </span>
              <div>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
                <p className="text-sm text-slate-500">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <WarehouseList
        warehouses={management.filteredWarehouses}
        hasSearch={Boolean(management.searchTerm)}
        onOpen={(item) => router.push(`/warehouses/${item.id}`)}
        onEdit={management.openEdit}
        onAssign={management.openAssign}
        onDelete={management.openDelete}
      />
      {(management.modal === "create" || management.modal === "edit") && (
        <WarehouseFormModal
          mode={management.modal}
          values={management.form}
          isSubmitting={management.isSubmitting}
          onChange={management.setForm}
          onClose={management.closeModal}
          onSubmit={
            management.modal === "create"
              ? management.createWarehouse
              : () => void management.updateWarehouse()
          }
        />
      )}
      {management.modal === "assign" && management.selectedWarehouse && (
        <WarehouseAssignmentModal
          warehouse={management.selectedWarehouse}
          organizations={management.organizations}
          selectedIds={management.selectedOrgIds}
          isSubmitting={management.isSubmitting}
          onSelectedIdsChange={management.setSelectedOrgIds}
          onClose={management.closeModal}
          onSubmit={() => void management.assignWarehouse()}
        />
      )}
      {management.modal === "delete" && management.selectedWarehouse && (
        <WarehouseDeleteDialog
          warehouse={management.selectedWarehouse}
          isSubmitting={management.isSubmitting}
          onClose={management.closeModal}
          onConfirm={() => void management.deleteWarehouse()}
        />
      )}
    </div>
  );
}
