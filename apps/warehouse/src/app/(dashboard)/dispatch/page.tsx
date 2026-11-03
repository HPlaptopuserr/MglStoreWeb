"use client";

import { DispatchWorkspace } from "@/features/dispatch/DispatchWorkspace";
import { useWarehouseScope } from "@/features/warehouse-scope/WarehouseScopeProvider";

export default function DispatchPage() {
  const { selectedWarehouse } = useWarehouseScope();
  if (!selectedWarehouse)
    return (
      <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Эхлээд агуулахаа сонгоно уу.
      </p>
    );
  return (
    <DispatchWorkspace
      key={selectedWarehouse.id}
      warehouseId={selectedWarehouse.id}
      warehouseName={selectedWarehouse.name}
    />
  );
}
