"use client";

import { type WarehouseMonthlyDividend } from "@mgl/types";
import { Modal } from "@/components/Modal";
import { DividendChoiceForm } from "./DividendChoiceForm";
import { DividendDecisionStatus } from "./DividendDecisionStatus";
import { DividendAmountCard } from "./DividendAmountCard";

interface MonthlyDividendDialogProps {
  dividend: WarehouseMonthlyDividend;
  warehouseId: string;
  onClose: () => void;
  onConfirmed: () => void;
}

export function MonthlyDividendDialog({
  dividend,
  warehouseId,
  onClose,
  onConfirmed,
}: MonthlyDividendDialogProps) {
  return (
    <Modal
      size="md"
      title="Ногдол ашиг"
      description={`${dividend.month} · Миний ногдол ашиг`}
      onClose={onClose}
    >
      <DividendAmountCard dividend={dividend} />
      {dividend.decision ? (
        <DividendDecisionStatus decision={dividend.decision} />
      ) : dividend.id &&
        typeof dividend.version === "number" &&
        Number(dividend.amount) > 0 ? (
        <DividendChoiceForm
          dividend={{ ...dividend, id: dividend.id, version: dividend.version }}
          warehouseId={warehouseId}
          onConfirmed={() => {
            onClose();
            onConfirmed();
          }}
        />
      ) : (
        <p className="mt-4 text-sm leading-6 text-slate-500">
          {dividend.updatedAt
            ? "Энэ сард авах ногдол ашгийн дүн байхгүй байна."
            : "Агуулахаас энэ сарын ногдол ашгийг бүртгэсний дараа дансаар авах эсвэл дахин хөрөнгө оруулах сонголтоо хийнэ."}
        </p>
      )}
    </Modal>
  );
}
