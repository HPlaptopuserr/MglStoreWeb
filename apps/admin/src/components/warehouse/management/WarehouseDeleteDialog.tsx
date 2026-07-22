import { Loader2, Trash2 } from "lucide-react";
import type { ManagedWarehouse } from "./types";
export function WarehouseDeleteDialog({
  warehouse,
  isSubmitting,
  onClose,
  onConfirm,
}: {
  warehouse: ManagedWarehouse;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="p-6 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <Trash2 className="h-7 w-7 text-red-600" />
          </span>
          <h3 className="text-lg font-bold text-slate-900">Агуулах устгах</h3>
          <p className="mt-2 text-sm text-slate-600">
            <strong>{warehouse.name}</strong> агуулахыг устгахдаа итгэлтэй байна
            уу?
          </p>
        </div>
        <footer className="flex justify-center gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            Болих
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}Устгах
          </button>
        </footer>
      </div>
    </div>
  );
}
