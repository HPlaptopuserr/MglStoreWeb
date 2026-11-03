"use client";

import { WarehouseDividendManager } from "@mgl/ui";
import { Modal } from "@/components/Modal";
import { API, wmsFetch } from "@/lib/api";
import { INVESTMENT_UPDATED_EVENT } from "./useInvestmentSummary";

interface WarehouseDividendDialogProps {
  warehouseId: string;
  warehouseName: string;
  onClose: () => void;
  onSaved: () => void;
}

export function WarehouseDividendDialog({
  warehouseId,
  warehouseName,
  onClose,
  onSaved,
}: WarehouseDividendDialogProps) {
  return (
    <Modal
      title="Ногдол ашиг хуваарилах"
      description={`${warehouseName} · Хөрөнгө оруулагч бүрийн энэ сарын дүн`}
      onClose={onClose}
    >
      <WarehouseDividendManager
        warehouseId={warehouseId}
        apiBase={API}
        request={wmsFetch}
        onSaved={() => {
          window.dispatchEvent(new Event(INVESTMENT_UPDATED_EVENT));
          onSaved();
        }}
      />
    </Modal>
  );
}
