"use client";
import { StoreMiniAppCatalogs } from "./StoreMiniAppCatalogs";
import { useStoreMiniAppSettings } from "./useStoreMiniAppSettings";
import { ExpandableMglAppCard } from "./ExpandableMglAppCard";
import { useState } from "react";
import { Loader2, Search, ArrowUp, ArrowDown } from "lucide-react";
import { orderedMglApps, isMiniAppVisible } from "./miniAppVisibilityConfig";
import { useStoreMiniAppVisibility } from "./useStoreMiniAppVisibility";

function VisibilityToggle({ title, enabled, disabled, saving, onChange }: {
  title: string; enabled: boolean; disabled: boolean; saving: boolean; onChange: () => void;
}) {
  return <button type="button" role="switch" aria-label={title} aria-checked={enabled}
    disabled={disabled} onClick={onChange}
    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200 disabled:opacity-50 ${enabled ? "bg-violet-600" : "bg-slate-300"}`}>
    <span className={`flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${enabled ? "translate-x-5" : "translate-x-0"}`}>
      {saving && <Loader2 size={12} className="animate-spin text-violet-600" />}
    </span>
  </button>;
}

export function StoreMiniAppVisibility() {
  const state = useStoreMiniAppVisibility();
  const catalogs = useStoreMiniAppSettings();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const orderedApps = orderedMglApps(state.settings ?? {});
  const apps = orderedApps.filter(app => `${app.title} ${app.id}`.toLowerCase().includes(query.trim().toLowerCase()));
  const move = (id: string, offset: number) => {
    const ids = orderedApps.map(app => app.id);
    const index = ids.indexOf(id as typeof ids[number]);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    void state.reorder(ids);
  };
  const globallyEnabled = state.settings?.["app-mini-apps-enabled"] !== "false";
  return <section className="space-y-5 border-b border-slate-200 p-4 sm:p-7">
    <header className="flex items-center justify-between gap-4">
      <div><h2 className="text-xl font-bold text-slate-900">MGL Apps харагдах тохиргоо</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Өөрчлөлт шууд хадгалагдана. Энэ тохиргоог дэмждэг хувилбарын апп дээр шинэчлэгдэнэ. Карт дээр дарж дэлгэрэнгүй тохиргоог нээнэ.</p></div>
      {state.settings && <VisibilityToggle title="Бүх MGL Apps" enabled={globallyEnabled} disabled={state.saving !== null} saving={state.saving === "all"} onChange={() => void state.toggle("all", !globallyEnabled)} />}
    </header>
    {state.error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{state.error} <button className="ml-2 underline" onClick={() => void state.load()}>Дахин ачаалах</button></div>}
    {!state.settings && !state.error && <p role="status" className="animate-pulse text-sm text-slate-500">Тохиргоо ачаалж байна…</p>}
    {state.settings && <>
      {!globallyEnabled && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Бүх MGL Apps одоогоор нуугдсан. Тус бүрийн сонголт хадгалагдана.</p>}
      <label className="flex max-w-md items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-slate-500"><Search size={18} /><input aria-label="MGL Apps хайх" value={query} onChange={event => setQuery(event.target.value)} placeholder="MGL Apps хайх…" className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none" /></label>
      <p role="status" className="text-xs text-slate-500">{state.saving === "order" ? "Дарааллыг хадгалж байна…" : query.trim() ? "Дараалал өөрчлөхдөө хайлтаа цэвэрлээрэй." : "↑ ↓ товчоор дарааллыг өөрчилнө. Автоматаар хадгалагдана."}</p>
      <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {apps.map(app => {
          const position = orderedApps.findIndex(item => item.id === app.id);
          const enabled = isMiniAppVisible(state.settings ?? {}, app.id);
          return <ExpandableMglAppCard key={app.id} id={app.id} title={app.title} position={position}
            status={!globallyEnabled ? "Ерөнхий тохиргоогоор нуугдсан" : enabled ? "Нээлттэй" : "Нуугдсан"}
            expanded={expandedId === app.id} onExpand={() => setExpandedId(current => current === app.id ? null : app.id)}
            controls={<>
            <div className="flex shrink-0 gap-1">
              <button type="button" aria-label={`${app.title} дээш зөөх`} disabled={state.saving !== null || position === 0 || !!query.trim()} onClick={() => move(app.id, -1)} className="rounded-lg p-2 text-slate-500 hover:bg-white focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-30"><ArrowUp size={18} /></button>
              <button type="button" aria-label={`${app.title} доош зөөх`} disabled={state.saving !== null || position === orderedApps.length - 1 || !!query.trim()} onClick={() => move(app.id, 1)} className="rounded-lg p-2 text-slate-500 hover:bg-white focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-30"><ArrowDown size={18} /></button>
            </div>
            <VisibilityToggle title={app.title} enabled={enabled} disabled={state.saving !== null} saving={state.saving === app.id} onChange={() => void state.toggle(app.id, !enabled)} />
            </>}>
              {app.id === "shared-store" || app.id === "store-owners" ? (
                <StoreMiniAppCatalogs id={app.id} state={catalogs} />
              ) : <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                <p>{app.title} нь {position + 1}-р байрлалд байна. {enabled && globallyEnabled ? "MGL Apps хэсэгт харагдана." : "MGL Apps хэсэгт нуугдсан."}</p>
                <p className="mt-2 text-slate-500">Дарааллыг ↑ ↓ товчоор, харагдах төлөвийг toggle-оор өөрчилнө. Энэ app-д нэмэлт тохиргоо одоогоор байхгүй.</p>
              </div>}
            </ExpandableMglAppCard>;
        })}
      </div>
      {!apps.length && <p className="py-6 text-center text-sm text-slate-500">Хайлтад тохирох MGL App олдсонгүй.</p>}
    </>}
  </section>;
}
