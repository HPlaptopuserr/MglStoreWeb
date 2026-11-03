"use client";
import { CirclePlus } from "lucide-react";
import { WarehouseInvestorManager } from "./WarehouseInvestorManager";
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
      <section
        id="investment-top-up"
        className="scroll-mt-24 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 sm:p-5"
      >
        <h2 className="flex items-center gap-2 font-semibold text-blue-900">
          <CirclePlus className="size-5 text-blue-600" />
          Хөрөнгө оруулалт цэнэглэх
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Доорх хэрэглэгчийн «Цэнэглэх» товчийг дарж, нэмэх мөнгөн дүнгээ
          оруулна уу.
        </p>
      </section>
      <WarehouseInvestorManager
        warehouseId={scope.selectedWarehouse.id}
      />
    </div>
  );
}
