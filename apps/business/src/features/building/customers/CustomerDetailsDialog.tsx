"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { CustomerDetails } from "./CustomerDetails";
import type { CustomerRecord } from "./model";

export function CustomerDetailsDialog({
  record,
  onClose,
}: {
  record: CustomerRecord;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="crm-detail-dialog"
      aria-label={`${record.customerName || "Харилцагч"} — дэлгэрэнгүй`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="crm-dialog-toolbar">
        <span>Харилцагчийн дэлгэрэнгүй</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Дэлгэрэнгүйг хаах"
          autoFocus
        >
          <X size={18} /> Хаах
        </button>
      </div>
      <CustomerDetails record={record} />
    </dialog>
  );
}
