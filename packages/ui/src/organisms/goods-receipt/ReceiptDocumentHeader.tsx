"use client";

export function ReceiptDocumentHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-5 border-b-2 border-slate-800 px-5 py-6 sm:px-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Бараа материалын бүртгэл
        </p>
        <h2 className="mt-2 text-xl font-bold tracking-wide text-slate-950 sm:text-2xl">
          ОРЛОГЫН БАРИМТ
        </h2>
        <p className="mt-1 text-sm text-slate-500">Бараа хүлээн авалт</p>
      </div>
      <div className="space-y-2 text-right text-xs text-slate-500">
        <span className="inline-flex rounded-md border border-amber-200 bg-amber-50 px-3 py-1 font-semibold text-amber-800">
          Ноорог · Баталгаажаагүй
        </span>
        <p>Баримтын №: баталгаажуулахад үүснэ</p>
        <p>Огноо: хүлээн авсан огноогоор бүртгэнэ</p>
      </div>
    </header>
  );
}
