"use client";
import { WarehouseViewerManager } from "@mgl/ui";
import { API, adminFetch } from "@/lib/api";
export function WarehouseViewersSection({
  warehouseId,
}: {
  warehouseId: string;
}) {
  return (
    <WarehouseViewerManager
      warehouseId={warehouseId}
      apiBase={API}
      request={adminFetch}
    />
  );
}
