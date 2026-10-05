"use client";
import {
  CheckCircle2,
  CircleDot,
  Layers3,
  Loader2,
  RotateCcw,
  Save,
} from "lucide-react";
import { STORE_MINI_APP_IDS } from "@mgl/types";
import { MiniAppCatalogCard } from "./MiniAppCatalogCard";
import { useStoreMiniAppSettings } from "./useStoreMiniAppSettings";

export function StoreMiniAppCatalogs() {
  const state = useStoreMiniAppSettings();
  const active = STORE_MINI_APP_IDS.filter(
    (id) => state.settings[id].enabled,
  ).length;
  const valid = STORE_MINI_APP_IDS.every(
    (id) =>
      !state.settings[id].enabled || state.settings[id].sourceIds.length > 0,
  );
  return (
    <section className="space-y-5 border-b border-slate-200 bg-slate-50/40 p-4 sm:p-6 lg:p-7">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="hidden rounded-xl border border-slate-200 bg-white p-2.5 text-violet-600 sm:block">
            <Layers3 size={21} />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-500">
              MGL · MINI APPS
            </p>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Каталогийн удирдлага
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-slate-500">
              Барааны эх үүсвэрээ сонгож, захиалах эрхийг тохируулаарай.
            </p>
          </div>
        </div>
        {state.loaded && (
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500">
            <span
              className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-300"}`}
            />
            {active} / 2 идэвхтэй
          </span>
        )}
      </header>
      {state.loading ? (
        <div
          role="status"
          aria-label="Тохиргоо ачаалж байна"
          className="grid gap-5 xl:grid-cols-2"
        >
          {[0, 1].map((index) => (
            <div
              key={index}
              className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="h-10 w-2/3 animate-pulse rounded-xl bg-slate-100 motion-reduce:animate-none" />
              <div className="h-10 animate-pulse rounded-xl bg-slate-100 motion-reduce:animate-none" />
              <div className="h-40 animate-pulse rounded-xl bg-slate-50 motion-reduce:animate-none" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {state.error && (
            <div
              role="alert"
              className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {state.error}
              {!state.loaded && (
                <button
                  type="button"
                  onClick={() => void state.load()}
                  className="ml-3 font-semibold underline"
                >
                  Дахин оролдох
                </button>
              )}
            </div>
          )}
          {state.loaded && (
            <>
              <fieldset
                disabled={state.saving}
                className="grid items-start gap-5 disabled:opacity-60 xl:grid-cols-2"
              >
                <legend className="sr-only">
                  Mini app каталогийн тохиргоо
                </legend>
                {STORE_MINI_APP_IDS.map((id) => (
                  <MiniAppCatalogCard
                    key={id}
                    id={id}
                    config={state.settings[id]}
                    options={
                      id === "shared-store"
                        ? state.options.warehouses
                        : state.options.vendors
                    }
                    onChange={(config) =>
                      state.update({ ...state.settings, [id]: config })
                    }
                  />
                ))}
              </fieldset>
              <footer className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg shadow-slate-900/5 sm:px-5">
                <div
                  role="status"
                  className="flex items-center gap-2 text-xs sm:text-sm"
                >
                  {state.saved ? (
                    <CheckCircle2 size={17} className="text-emerald-600" />
                  ) : (
                    <CircleDot
                      size={17}
                      className={
                        state.dirty ? "text-amber-500" : "text-slate-400"
                      }
                    />
                  )}
                  <span
                    className={
                      state.saved ? "text-emerald-700" : "text-slate-500"
                    }
                  >
                    {state.saved
                      ? "Өөрчлөлтийг хадгаллаа"
                      : state.dirty
                        ? "Хадгалаагүй өөрчлөлт байна"
                        : "Тохиргоо шинэчлэгдсэн"}
                  </span>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!state.dirty || state.saving}
                    onClick={state.reset}
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 disabled:opacity-40"
                  >
                    <RotateCcw size={15} />
                    Буцаах
                  </button>
                  <button
                    type="button"
                    disabled={!state.dirty || state.saving || !valid}
                    onClick={() => void state.save()}
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 focus-visible:ring-4 focus-visible:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {state.saving ? (
                      <Loader2
                        size={16}
                        className="animate-spin motion-reduce:animate-none"
                      />
                    ) : (
                      <Save size={16} />
                    )}
                    {state.saving ? "Хадгалж байна…" : "Хадгалах"}
                  </button>
                </div>
              </footer>
            </>
          )}
        </>
      )}
    </section>
  );
}
