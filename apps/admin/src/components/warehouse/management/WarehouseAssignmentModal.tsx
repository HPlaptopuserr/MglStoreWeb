import { Check, Loader2, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { ManagedWarehouse, WarehouseOrganization } from "./types";

interface Props {
  warehouse: ManagedWarehouse;
  organizations: WarehouseOrganization[];
  selectedIds: string[];
  isSubmitting: boolean;
  onSelectedIdsChange: (ids: string[]) => void;
  onClose: () => void;
  onSubmit: () => void;
}
export function WarehouseAssignmentModal({
  warehouse,
  organizations,
  selectedIds,
  isSubmitting,
  onSelectedIdsChange,
  onClose,
  onSubmit,
}: Props) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.toLowerCase();
    return organizations.filter(
      (item) =>
        item.name.toLowerCase().includes(normalized) ||
        item.slug.toLowerCase().includes(normalized),
    );
  }, [organizations, query]);
  const toggle = (id: string) =>
    onSelectedIdsChange(
      selectedIds.includes(id)
        ? selectedIds.filter((item) => item !== id)
        : [...selectedIds, id],
    );
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="font-bold text-slate-900">Агуулах хуваарилах</h2>
            <p className="text-xs text-slate-500">{warehouse.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Хаах"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Vendor хайх..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[#5B4CFF]"
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">{filtered.length} үр дүн</span>
            <span className="font-semibold text-[#5B4CFF]">
              {selectedIds.length} сонгогдсон
            </span>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            {filtered.length ? (
              filtered.map((organization) => {
                const selected = selectedIds.includes(organization.id);
                return (
                  <button
                    type="button"
                    key={organization.id}
                    onClick={() => toggle(organization.id)}
                    className={`flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-0 ${selected ? "bg-indigo-50" : "hover:bg-slate-50"}`}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded border ${selected ? "border-[#5B4CFF] bg-[#5B4CFF]" : "border-slate-300"}`}
                    >
                      {selected && <Check className="h-3 w-3 text-white" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800">
                        {organization.name}
                      </span>
                      <span className="block text-xs text-slate-400">
                        @{organization.slug}
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="py-10 text-center text-sm text-slate-500">
                Vendor олдсонгүй
              </p>
            )}
          </div>
        </div>
        <footer className="flex justify-between border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={() => onSelectedIdsChange([])}
            className="text-xs font-medium text-slate-400 hover:text-red-500"
          >
            Цэвэрлэх
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Болих
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#5B4CFF] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Хадгалах
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
