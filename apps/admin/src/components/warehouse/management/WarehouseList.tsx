import {
  AlertCircle,
  Building2,
  Edit,
  Eye,
  MapPin,
  MoreVertical,
  Phone,
  Trash2,
  Warehouse,
} from "lucide-react";
import { useState } from "react";
import type { ManagedWarehouse } from "./types";

interface Props {
  warehouses: ManagedWarehouse[];
  hasSearch: boolean;
  onOpen: (warehouse: ManagedWarehouse) => void;
  onEdit: (warehouse: ManagedWarehouse) => void;
  onAssign: (warehouse: ManagedWarehouse) => void;
  onDelete: (warehouse: ManagedWarehouse) => void;
}
export function WarehouseList({
  warehouses,
  hasSearch,
  onOpen,
  onEdit,
  onAssign,
  onDelete,
}: Props) {
  const [menuId, setMenuId] = useState<string | null>(null);
  if (!warehouses.length)
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16">
        <span className="mb-4 rounded-full bg-slate-100 p-4">
          <Warehouse className="h-8 w-8 text-slate-400" />
        </span>
        <p className="text-lg font-semibold text-slate-600">
          Агуулах олдсонгүй
        </p>
        <p className="mt-1 text-sm text-slate-400">
          {hasSearch ? "Хайлтын үр дүн олдсонгүй" : "Шинэ агуулах нэмнэ үү"}
        </p>
      </div>
    );
  const actions = [
    { label: "Дэлгэрэнгүй", icon: Eye, action: onOpen },
    { label: "Засах", icon: Edit, action: onEdit },
    { label: "Хуваарилах", icon: Building2, action: onAssign },
    { label: "Устгах", icon: Trash2, action: onDelete, danger: true },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {warehouses.map((warehouse) => (
        <article
          key={warehouse.id}
          className="relative rounded-2xl border border-slate-100 bg-white p-6 transition hover:border-indigo-200 hover:shadow-md"
        >
          <div className="absolute right-4 top-4">
            <button
              type="button"
              aria-label="Үйлдэл"
              onClick={() =>
                setMenuId(menuId === warehouse.id ? null : warehouse.id)
              }
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            {menuId === warehouse.id && (
              <div className="absolute right-0 top-8 z-10 w-48 overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-xl">
                {actions.map(({ label, icon: Icon, action, danger }) => (
                  <button
                    type="button"
                    key={label}
                    onClick={() => {
                      setMenuId(null);
                      action(warehouse);
                    }}
                    className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 ${danger ? "text-red-600" : "text-slate-600"}`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-start gap-4">
            <span className="rounded-xl bg-indigo-50 p-3">
              <Warehouse className="h-6 w-6 text-[#5B4CFF]" />
            </span>
            <div className="min-w-0 flex-1 pr-7">
              <button
                type="button"
                onClick={() => onOpen(warehouse)}
                className="block max-w-full truncate text-left font-bold text-slate-900 hover:text-[#5B4CFF]"
              >
                {warehouse.name}
              </button>
              <div className="mt-2 space-y-1.5 text-sm text-slate-500">
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="line-clamp-2">{warehouse.address}</span>
                </p>
                <p>
                  {warehouse.city}, {warehouse.district}
                </p>
                {warehouse.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {warehouse.phone}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-4">
            {warehouse.organizations.length ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-slate-400">
                  Хуваарилагдсан ({warehouse.organizations.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {warehouse.organizations.map((item) => (
                    <span
                      key={item.id}
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"
                    >
                      <Building2 className="h-3 w-3" />
                      {item.name}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm text-amber-600">
                <AlertCircle className="h-4 w-4" />
                Хуваарилаагүй
              </p>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
