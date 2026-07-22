import { Loader2, X } from "lucide-react";
import type { WarehouseFormValues } from "./types";

interface Props {
  mode: "create" | "edit";
  values: WarehouseFormValues;
  isSubmitting: boolean;
  onChange: (values: WarehouseFormValues) => void;
  onClose: () => void;
  onSubmit: () => void;
}
const fields: Array<{
  key: keyof WarehouseFormValues;
  label: string;
  placeholder: string;
  required?: boolean;
}> = [
  { key: "name", label: "Нэр", placeholder: "Агуулахын нэр", required: true },
  {
    key: "address",
    label: "Хаяг",
    placeholder: "Дэлгэрэнгүй хаяг",
    required: true,
  },
  { key: "city", label: "Хот/Аймаг", placeholder: "Улаанбаатар" },
  { key: "district", label: "Дүүрэг/Сум", placeholder: "Баянзүрх" },
  { key: "phone", label: "Утасны дугаар", placeholder: "9900 0000" },
];
export function WarehouseFormModal({
  mode,
  values,
  isSubmitting,
  onChange,
  onClose,
  onSubmit,
}: Props) {
  const isValid = Boolean(values.name.trim() && values.address.trim());
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">
            {mode === "create" ? "Шинэ агуулах үүсгэх" : "Агуулах засах"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Хаах"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          {fields.map((field) => (
            <label
              key={field.key}
              className={
                field.key === "name" ||
                field.key === "address" ||
                field.key === "phone"
                  ? "sm:col-span-2"
                  : ""
              }
            >
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                {field.label}
                {field.required && <span className="text-red-500"> *</span>}
              </span>
              <input
                value={values[field.key]}
                onChange={(event) =>
                  onChange({ ...values, [field.key]: event.target.value })
                }
                placeholder={field.placeholder}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#5B4CFF] focus:ring-2 focus:ring-[#5B4CFF]/15"
              />
            </label>
          ))}
        </div>
        <footer className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            Болих
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!isValid || isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-[#5B4CFF] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "create" ? "Үүсгэх" : "Хадгалах"}
          </button>
        </footer>
      </div>
    </div>
  );
}
