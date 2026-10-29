"use client";

import { WarehouseViewerManager } from "@mgl/ui";
import { API, wmsFetch } from "@/lib/api";
import { INVESTMENT_UPDATED_EVENT } from "./useInvestmentSummary";

interface WarehouseInvestorManagerProps {
  warehouseId: string;
  onInvestmentSaved?: () => void;
}

export function WarehouseInvestorManager({
  warehouseId,
  onInvestmentSaved,
}: WarehouseInvestorManagerProps) {
  return (
    <WarehouseViewerManager
      key={warehouseId}
      warehouseId={warehouseId}
      apiBase={API}
      request={wmsFetch}
      onInvestmentSaved={() => {
        window.dispatchEvent(new Event(INVESTMENT_UPDATED_EVENT));
        onInvestmentSaved?.();
      }}
    />
  );
}
