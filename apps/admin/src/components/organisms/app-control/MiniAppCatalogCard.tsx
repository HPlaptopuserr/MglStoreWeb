"use client";
import { Store, Warehouse } from "lucide-react";
import {
  STORE_MINI_APP_TITLES,
  type StoreMiniAppConfig,
  type StoreMiniAppId,
  type StoreMiniAppOption,
} from "@mgl/types";
import { MiniAppSourcePicker } from "./MiniAppSourcePicker";
import { MiniAppPhoneAccess } from "./MiniAppPhoneAccess";

interface Props {
  id: StoreMiniAppId;
  config: StoreMiniAppConfig;
  options: StoreMiniAppOption[];
  onChange: (config: StoreMiniAppConfig) => void;
}
export function MiniAppCatalogCard({ id, config, options, onChange }: Props) {
  const warehouse = id === "shared-store";
  const Icon = warehouse ? Warehouse : Store;
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${warehouse ? "bg-blue-50 text-blue-600" : "bg-violet-50 text-violet-600"}`}
          >
            <Icon size={21} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 sm:text-base">
              {STORE_MINI_APP_TITLES[id]}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              {warehouse ? "Агуулахын каталог" : "Vendor каталог"}
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={config.enabled}
          aria-label={`${STORE_MINI_APP_TITLES[id]} идэвхжүүлэх`}
          onClick={() => onChange({ ...config, enabled: !config.enabled })}
          className="group flex items-center gap-2 rounded-lg py-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100"
        >
          <span
            className={`text-xs font-medium ${config.enabled ? "text-emerald-700" : "text-slate-400"}`}
          >
            {config.enabled ? "Идэвхтэй" : "Идэвхгүй"}
          </span>
          <span
            aria-hidden
            className={`flex h-6 w-10 items-center rounded-full p-0.5 transition-colors ${config.enabled ? "bg-violet-600" : "bg-slate-200 group-hover:bg-slate-300"}`}
          >
            <span
              className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${config.enabled ? "translate-x-4" : "translate-x-0"}`}
            />
          </span>
        </button>
      </div>
      <div className="space-y-5 p-5">
        <MiniAppSourcePicker
          label={warehouse ? "Агуулах сонгох" : "Vendor дэлгүүр сонгох"}
          options={options}
          selected={config.sourceIds}
          onChange={(sourceIds) => onChange({ ...config, sourceIds })}
        />
        {config.enabled && !config.sourceIds.length && (
          <p
            role="status"
            className="rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800"
          >
            Идэвхжүүлэхийн өмнө дор хаяж нэг эх үүсвэр сонгоно уу.
          </p>
        )}
        {warehouse ? (
          <div className="rounded-xl bg-blue-50/60 px-3.5 py-3 text-xs leading-5 text-slate-500">
            Сонгосон агуулахуудын нийтлэхээр тохируулсан бараа энэ mini app-д
            харагдана.
          </div>
        ) : (
          <MiniAppPhoneAccess
            phones={config.allowedPhones}
            onChange={(allowedPhones) => onChange({ ...config, allowedPhones })}
          />
        )}
      </div>
    </section>
  );
}
