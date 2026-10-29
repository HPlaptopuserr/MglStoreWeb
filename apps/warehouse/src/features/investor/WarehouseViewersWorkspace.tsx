"use client";
import { WarehouseViewerManager } from "@mgl/ui";
import { API, wmsFetch } from "@/lib/api";
import { useWarehouseScope } from "@/features/warehouse-scope/WarehouseScopeProvider";
export function WarehouseViewersWorkspace() {
  const scope = useWarehouseScope();
  if (scope.viewerOnly)
    return <p role="alert">Хэрэглэгчийн эрх удирдах боломжгүй байна.</p>;
  if (!scope.selectedWarehouse)
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">
        Эхлээд агуулахаа сонгоно уу.
      </p>
    );
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">
          Хэрэглэгчид · Viewer
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {scope.selectedWarehouse.name} — бүртгэлтэй дугаараар зөвхөн мэдээлэл
          харах эрх нэмнэ.
        </p>
      </header>
      <WarehouseViewerManager
        key={scope.selectedWarehouse.id}
        warehouseId={scope.selectedWarehouse.id}
        apiBase={API}
        request={wmsFetch}
      />
    </div>
  );
}
