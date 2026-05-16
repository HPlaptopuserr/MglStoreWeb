"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { BarChart2, CheckCircle2, Loader2, Monitor, Store } from "lucide-react";
import { posRequest } from "../api/_pos-client";

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
      const res = await posRequest<{ succeed: boolean; message?: string; count?: number; amount?: number }>(
        "/pos/payments/push-ecr/settlement",
        { method: "POST", body: { terminalId, skipPrint: false } },
      );
      setSettlementMsg(
        res.succeed
          ? { ok: true, text: `Нэгтгэл амжилттай - ${res.count ?? 0} гүйлгээ, ${(res.amount ?? 0).toLocaleString()}₮` }
          : { ok: false, text: res.message || "Нэгтгэл амжилтгүй боллоо" },
      );
    } catch {
      setSettlementMsg({ ok: false, text: "Холболтын алдаа гарлаа" });
    } finally {
      setSettling(false);
    }
  };

  return (
    <header className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-amber-400">
            <Store size={18} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Register</p>
            <h2 className="text-base font-black text-slate-950">{title}</h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <InfoPill label="Салбар" value={branchName} />
          <InfoPill label="Касс" value={registerName} icon={<Monitor size={13} />} />
          <InfoPill label="Кассчин" value={cashierName} />
          <div
            className={`inline-flex h-9 items-center gap-2 rounded-xl px-3 ${
              isOpen ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
            }`}
          >
            <CheckCircle2 size={14} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">Ээлж</p>
              <p className="font-black">{shiftStatus}</p>
            </div>
          </div>

          {terminalId && (
            <button
              onClick={handleSettlement}
              disabled={settling}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 font-bold text-slate-600 transition-colors hover:border-amber-300 hover:text-slate-950 disabled:opacity-50"
            >
              {settling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BarChart2 className="h-3.5 w-3.5" />}
              Өдрийн нэгтгэл
            </button>
          )}
        </div>
      </div>

      {settlementMsg && (
        <p className={`mt-2 text-xs font-bold ${settlementMsg.ok ? "text-emerald-600" : "text-rose-600"}`}>
          {settlementMsg.text}
        </p>
      )}
    </header>
  );
}

function InfoPill({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="inline-flex h-9 min-w-28 items-center gap-2 rounded-xl bg-slate-50 px-3 text-slate-700">
      {icon}
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}
