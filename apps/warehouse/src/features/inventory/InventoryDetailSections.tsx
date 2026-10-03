"use client";
import { Barcode, CalendarDays } from "lucide-react";
import { getInventoryBarcodes, getInventoryExpiry } from "./inventory-expiry";

export function InventoryBarcodeDetails({
  primary,
  aliases,
}: {
  primary: string | null;
  aliases?: string[];
}) {
  const codes = getInventoryBarcodes(primary, aliases);
  return (
    <section aria-label="Барааны баркодууд">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Баркод
        </h3>
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">
          {codes.length} код
        </span>
      </div>
      {codes.length ? (
        <ul className="mt-2 max-h-44 space-y-2 overflow-y-auto">
          {codes.map((code) => (
            <li
              key={code}
              className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
            >
              <Barcode
                size={16}
                className="shrink-0 text-slate-400"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 break-all font-mono text-sm text-slate-700">
                {code}
              </span>
              <span className="shrink-0 text-xs text-slate-500">
                {code === primary?.trim() ? "Үндсэн" : "Нэмэлт"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-400">Баркод бүртгээгүй</p>
      )}
    </section>
  );
}
const tones = {
  neutral: "border-slate-200 bg-slate-50 text-slate-600",
  danger: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  healthy: "border-emerald-200 bg-emerald-50 text-emerald-700",
};
export function InventoryExpiryDetails({
  expiryDate,
  batchNumber,
  note,
}: {
  expiryDate: string | null;
  batchNumber: string | null;
  note?: string | null;
}) {
  const expiry = getInventoryExpiry(expiryDate);
  return (
    <section
      className="space-y-3 border-t border-slate-100 pt-5"
      aria-label="Багц ба хадгалах хугацаа"
    >
      <h3 className="font-semibold text-slate-900">Багц ба хадгалах хугацаа</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-xs text-slate-500">Багцын дугаар</p>
          <p className="mt-2 break-all font-mono text-sm text-slate-800">
            {batchNumber || "Бүртгээгүй"}
          </p>
        </div>
        <div className={`rounded-xl border p-3 ${tones[expiry.tone]}`}>
          <p className="flex items-center gap-2 text-xs">
            <CalendarDays size={15} aria-hidden="true" />
            Хугацаа дуусах огноо
          </p>
          {expiry.days !== null && (
            <p className="mt-2 font-semibold">{expiryDate?.slice(0, 10)}</p>
          )}
          <p className="mt-1 text-sm font-medium">{expiry.label}</p>
          {expiry.days !== null && expiry.days >= 0 && expiry.days <= 30 && (
            <p className="mt-1 text-xs">
              Хугацаа дуусах дөхсөн · 30 хоногийн дотор
            </p>
          )}
        </div>
      </div>
      {expiry.days === null && (
        <p className="text-xs text-slate-500">
          Огноо бүртгээгүй тул хадгалах хугацааны төлөвийг тооцоогүй. “Засах”
          хэсэгт оруулна уу.
        </p>
      )}
      {note && (
        <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          <span className="font-semibold">Тэмдэглэл: </span>
          {note}
        </p>
      )}
    </section>
  );
}
