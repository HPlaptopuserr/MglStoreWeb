import type { MerchantConfigurationEvent, MerchantDiagnostics } from "@mgl/types";
import { formatMerchantDate } from "./formatters";

const labels: Record<MerchantConfigurationEvent, string> = {
  CONNECTED: "Холболт тохируулсан", DISCONNECTED: "Холболт салгасан", REGISTERED: "Шинэ холболт бүртгэсэн",
  BANK_ACCOUNTS_UPDATED: "Дансны мэдээлэл шинэчилсэн", CREDENTIALS_UPDATED: "Нэвтрэх тохиргоо шинэчилсэн", CREDENTIALS_RECOVERED: "Нэвтрэх тохиргоо сэргээсэн",
};
function eventLabel(event: string) { return Object.prototype.hasOwnProperty.call(labels, event) ? labels[event as MerchantConfigurationEvent] : "Тохиргоо өөрчилсөн"; }

export function MerchantChangeHistory({ history }: { history: MerchantDiagnostics["history"] }) {
  return (
    <details className="mt-5 rounded-xl border border-slate-200 p-4">
      <summary className="cursor-pointer rounded text-sm font-semibold text-slate-800 hover:text-emerald-700 focus-visible:outline focus-visible:outline-2">Өөрчлөлтийн түүх · Сүүлийн {history.length} үйлдэл</summary>
      <p className="mt-2 text-xs text-slate-500">Түүхийн бүртгэл нэвтэрснээс хойших үйлдлүүд. Өмнөх өөрчлөлтүүдийг нөхөж бүртгээгүй.</p>
      {history.length === 0 ? <p className="mt-3 text-sm text-slate-500">Одоогоор бүртгэгдсэн өөрчлөлт байхгүй.</p> : (
        <ol className="mt-3 divide-y divide-slate-100">{history.map((entry) => (
          <li key={entry.id} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:justify-between sm:gap-4">
            <div><p className="font-medium text-slate-800">{entry.channel} · {eventLabel(entry.event)}</p><p className="mt-1 text-slate-500">{entry.actor}</p></div>
            <time dateTime={entry.createdAt} className="shrink-0 text-xs text-slate-500">{formatMerchantDate(entry.createdAt)}</time>
          </li>
        ))}</ol>
      )}
    </details>
  );
}
