"use client";

import { useState } from "react";
import { Loader2, BarChart2 } from "lucide-react";
import { settlePushEcr } from "../api/card-terminal";

type Props = {
  title: string;
  branchName: string;
  registerName: string;
  cashierName: string;
  shiftStatus: "Нээлттэй" | "Хаалттай";
  terminalId?: string | null;
};

export function PosHeader({
  title,
  branchName,
  registerName,
  cashierName,
  shiftStatus,
  terminalId,
}: Props) {
  const isOpen = shiftStatus === "Нээлттэй";
  const [settling, setSettling] = useState(false);
  const [settlementMsg, setSettlementMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleSettlement = async () => {
    if (!terminalId) return;
    if (!confirm("Өдрийн нэгтгэл хийх үү? Терминал дээр нэгтгэлийн баримт хэвлэгдэнэ.")) return;
    setSettling(true);
    setSettlementMsg(null);
    try {
      const res = await settlePushEcr(terminalId);
      setSettlementMsg(
        res.succeed
          ? { ok: true, text: `Нэгтгэл амжилттай — ${res.count ?? 0} гүйлгээ, ${(res.amount ?? 0).toLocaleString()}₮` }
          : { ok: false, text: res.message || "Нэгтгэл амжилтгүй боллоо" },
      );
    } catch {
      setSettlementMsg({ ok: false, text: "Холболтын алдаа гарлаа" });
    } finally {
      setSettling(false);
    }
  };

  return (
    <header className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">POS</p>
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-slate-500">Салбар</p>
              <p className="mt-0.5 font-semibold text-slate-800">{branchName}</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-slate-500">Касс</p>
              <p className="mt-0.5 font-semibold text-slate-800">{registerName}</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-slate-500">Кассчин</p>
              <p className="mt-0.5 font-semibold text-slate-800">{cashierName}</p>
            </div>
            <div className={`rounded-lg px-3 py-2 ${isOpen ? "bg-emerald-50" : "bg-slate-100"}`}>
              <p className="text-slate-500">Shift</p>
              <p className={`mt-0.5 font-semibold ${isOpen ? "text-emerald-700" : "text-slate-700"}`}>
                {shiftStatus}
              </p>
            </div>
          </div>

          {terminalId && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSettlement}
                disabled={settling}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                {settling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BarChart2 className="h-3.5 w-3.5" />}
                Өдрийн нэгтгэл
              </button>
              {settlementMsg && (
                <span className={`text-xs font-medium ${settlementMsg.ok ? "text-emerald-600" : "text-rose-600"}`}>
                  {settlementMsg.text}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
