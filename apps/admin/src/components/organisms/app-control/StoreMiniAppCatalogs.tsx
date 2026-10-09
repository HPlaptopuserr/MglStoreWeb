"use client";
import { STORE_MINI_APP_IDS, type StoreMiniAppId } from "@mgl/types";
import { Loader2, Save, RotateCcw } from "lucide-react";
import { MiniAppCatalogCard } from "./MiniAppCatalogCard";
import type { useStoreMiniAppSettings } from "./useStoreMiniAppSettings";

type CatalogState = ReturnType<typeof useStoreMiniAppSettings>;
export function StoreMiniAppCatalogs({ id, state }: { id: StoreMiniAppId; state: CatalogState }) {
  const valid = STORE_MINI_APP_IDS.every(key => !state.settings[key].enabled || state.settings[key].sourceIds.length > 0);
  return <div className="space-y-4">
    {state.loading && <p role="status" className="animate-pulse text-sm text-slate-500">Каталогийн тохиргоо ачаалж байна…</p>}
    {state.error && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{state.error}{!state.loaded && <button type="button" onClick={() => void state.load()} className="ml-2 underline">Дахин оролдох</button>}</div>}
    {state.loaded && <>
      <fieldset disabled={state.saving} className="min-w-0 disabled:opacity-60">
        <legend className="sr-only">Каталогийн тохиргоо</legend>
        <MiniAppCatalogCard id={id} config={state.settings[id]}
          options={id === "shared-store" ? state.options.warehouses : state.options.vendors}
          onChange={config => state.update({ ...state.settings, [id]: config })} />
      </fieldset>
      <footer className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
        <p role="status" className="text-xs text-slate-500">{state.saved ? "Каталогийн өөрчлөлтийг хадгаллаа" : state.dirty ? "Каталогийн хадгалаагүй өөрчлөлт байна" : "Каталогийн тохиргоо шинэчлэгдсэн"}</p>
        <div className="flex gap-2">
          <button type="button" disabled={!state.dirty || state.saving} onClick={state.reset} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-40"><RotateCcw size={15} />Буцаах</button>
          <button type="button" disabled={!state.dirty || state.saving || !valid} onClick={() => void state.save()} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700 focus-visible:ring-4 focus-visible:ring-violet-200 disabled:opacity-40">{state.saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}Хадгалах</button>
        </div>
      </footer>
    </>}
  </div>;
}
