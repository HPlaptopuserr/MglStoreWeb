import type { MerchantDiagnosticsChannel } from "@mgl/types";

import { formatMerchantDate } from "./formatters";

export function MerchantChannelCard({ channel }: { channel: MerchantDiagnosticsChannel }) {
  return (
    <article className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-semibold text-slate-900">{channel.channel === "POS" ? "POS · Кассын төлбөр" : "WEB · Веб төлбөр"}</h4>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${channel.connected ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>{channel.connected ? "Холболт бүртгэлтэй" : "Идэвхгүй"}</span>
      </div>
      <dl className="mt-4 space-y-3 text-sm">
        <div><dt className="text-xs text-slate-500">Үйлчилгээ</dt><dd className="mt-0.5 font-medium">{channel.provider === "MINU" ? "Minu Dynamic QR" : channel.provider === "QPAY" ? "QPay" : "Сонгоогүй"}</dd></div>
        <div><dt className="text-xs text-slate-500">Merchant code / ID</dt><dd className="mt-0.5 select-all break-all font-mono text-slate-800">{channel.merchantId || "—"}</dd></div>
        <div><dt className="text-xs text-slate-500">Холбосон огноо</dt><dd className="mt-0.5">{formatMerchantDate(channel.connectedAt)}</dd></div>
        <div><dt className="text-xs text-slate-500">Нэвтрэх тохиргооны бүртгэл</dt><dd className="mt-0.5">{channel.credentialsConfigured ? "Хадгалсан утга байна" : "Хадгалсан утга байхгүй"}</dd></div>
      </dl>
      <div className="mt-4 border-t border-slate-200 pt-4">
        <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Системд хадгалсан данс</h5>
        {channel.accounts.length === 0 ? <p className="mt-2 text-sm text-slate-500">Дансны дэлгэрэнгүй мэдээлэл хадгалагдаагүй.</p> : (
          <ul className="mt-2 space-y-2">{channel.accounts.map((account) => (
            <li key={`${account.bankCode}-${account.number}`} className="rounded-lg bg-white p-3 text-sm">
              <p className="break-all font-mono font-semibold text-slate-900">{account.number} {account.isDefault && <span className="font-sans text-xs font-normal text-emerald-700">· Үндсэн</span>}</p>
              <p className="mt-1 break-words text-slate-600">{account.name} · Банкны код {account.bankCode}</p>
            </li>
          ))}</ul>
        )}
      </div>
      <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">Үйлчилгээ үзүүлэгч талын данс баталгаажаагүй. Дээрх мэдээлэл нь манай системийн бүртгэл бөгөөд мөнгө хүлээн авах данстай тохирч буйг тусад нь шалгана.</p>
    </article>
  );
}
