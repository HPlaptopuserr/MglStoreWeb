"use client";

import { CreditCard, Loader2, RefreshCw } from "lucide-react";
import { useMerchantDiagnostics } from "./useMerchantDiagnostics";
import { MerchantChannelCard } from "./MerchantChannelCard";
import { formatMerchantDate } from "./formatters";
import { MerchantChangeHistory } from "./MerchantChangeHistory";

export function MerchantDiagnosticsPanel({ organizationId }: { organizationId: string }) {
  const { state, reload } = useMerchantDiagnostics(organizationId);
  return (
    <section aria-label="Төлбөрийн тохиргоо" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 className="flex items-center gap-2 font-semibold text-slate-900"><CreditCard aria-hidden="true" className="h-4 w-4 text-slate-500" /> Төлбөрийн тохиргоо</h3><p className="mt-1 text-xs text-slate-500">Байгууллагын төлбөрийн сувгууд · Системийн админы мэдээлэл</p></div>
        <button type="button" onClick={() => { void reload(); }} disabled={state.status === "loading"} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 disabled:opacity-50"><RefreshCw aria-hidden="true" className="h-3.5 w-3.5" /> Мэдээлэл шинэчлэх</button>
      </div>
      {state.status === "loading" && <p role="status" className="flex items-center gap-2 py-8 text-sm text-slate-500"><Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" /> Тохиргоог ачаалж байна…</p>}
      {state.status === "error" && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{state.message}</p>}
      {state.status === "ready" && <>
        <p className="mt-4 text-xs text-slate-500">Бүртгэл уншсан: {formatMerchantDate(state.data.readAt)}. Энэ нь үйлчилгээ үзүүлэгчийн холболтын шалгалт биш.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">{state.data.channels.map((channel) => <MerchantChannelCard key={channel.channel} channel={channel} />)}</div>
        <MerchantChangeHistory history={state.data.history} />
      </>}
    </section>
  );
}
