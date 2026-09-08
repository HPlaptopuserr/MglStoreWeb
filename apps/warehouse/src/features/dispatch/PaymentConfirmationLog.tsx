import type { PaymentLogEntry } from "./stock-request.model";

const methodNames: Record<string, string> = {
  BANK_TRANSFER: "Дансаар", CARD: "Картаар", CASH: "Бэлнээр", QPAY: "QPay", CREDIT: "Зээлээр",
};

export function PaymentConfirmationLog({ entries = [], onDownload }: {
  entries?: PaymentLogEntry[];
  onDownload: (id: string, name: string) => void;
}) {
  return <section className="space-y-3 border-t border-indigo-100 pt-4" aria-label="Төлбөр баталгаажуулсан түүх">
    <h5 className="text-sm font-bold text-slate-900">Төлбөр баталгаажуулсан түүх · {entries.length}</h5>
    {entries.length === 0 ? <p className="text-xs text-slate-500">Баталгаажуулалтын түүх бүртгэгдээгүй байна.</p> :
      <ol className="space-y-2">
        {entries.map(entry => {
          const receipt = entry.receipt;
          return <li key={entry.id} className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-emerald-700">+{Number(entry.amount).toLocaleString("mn-MN")} ₮ · {methodNames[entry.method] ?? entry.method}</span>
              <span className="text-slate-500">{entry.confirmedAt ? new Date(entry.confirmedAt).toLocaleString("mn-MN", { timeZone: "Asia/Ulaanbaatar" }) : "Огноо бүртгэгдээгүй"} {entry.confirmedAt && "(УБ)"}</span>
            </div>
            <p className="text-slate-700">Баталсан: {entry.confirmedBy?.profile?.fullName || entry.confirmedBy?.email || "Систем / хэрэглэгчийн мэдээлэл байхгүй"}</p>
            {entry.transactionId && <p className="break-all text-slate-500">Гүйлгээ: {entry.transactionId}</p>}
            {entry.note && <p className="whitespace-pre-wrap break-words text-slate-600">{entry.note}</p>}
            {receipt && <button type="button" onClick={() => onDownload(receipt.id, receipt.name)} className="break-all text-left text-indigo-700 underline underline-offset-2 hover:text-indigo-900">Баримт татах: {receipt.name}</button>}
          </li>;
        })}
      </ol>}
  </section>;
}
