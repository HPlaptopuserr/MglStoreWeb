"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import type { TerminalCardPayment, TerminalCardRecoveryResult } from "@mgl/types";
import { PosDialog } from "./PosDialog";
import { checkTerminalCardPayment, getTerminalCardPayments } from "../api/card-payment-recovery";
import { formatDateTime, formatMoney } from "../utils/pos-display-format";

interface Props {
  registerId: string;
  onChecked: (result: TerminalCardRecoveryResult) => void | Promise<void>;
  onClose: () => void;
}

export function TerminalCardRecoveryDialog({ registerId, onChecked, onClose }: Props) {
  const [payments, setPayments] = useState<TerminalCardPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [truncated, setTruncated] = useState(false);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState("");
  const [checkingId, setCheckingId] = useState("");
  const [results, setResults] = useState<Record<string, TerminalCardRecoveryResult>>({});
  const checking = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setResults({});
    void getTerminalCardPayments(registerId, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      setPayments(data.payments);
      setTruncated(data.truncated);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Гүйлгээнүүдийг авч чадсангүй.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [registerId, reload]);

  const check = async (payment: TerminalCardPayment) => {
    if (checking.current) return;
    checking.current = true;
    setCheckingId(payment.attemptId);
    setError("");
    try {
      const result = await checkTerminalCardPayment(registerId, payment.attemptId);
      setPayments(previous => previous.map(row => row.attemptId === payment.attemptId ? result.payment : row));
      setResults(previous => ({ ...previous, [payment.attemptId]: result }));
      // Only reconcile an existing local reference. Never attach a different
      // customer's payment by amount or automatically start another charge.
      await onChecked(result);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Төлөвийг баталгаажуулж чадсангүй. Дахин шалгана уу.");
    } finally {
      checking.current = false;
      setCheckingId("");
    }
  };

  return (
    <PosDialog title="Терминалын түгжээ шалгаж тайлах" onClose={onClose} busy={Boolean(checkingId)} wide
      description="Хуучин гүйлгээг Minu-с шалгана. Амжилтгүй эсвэл цуцлагдсан нь батлагдвал түгжээг тайлна.">
      <div className="space-y-4">
        <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
          Терминал дээр гүйлгээ үргэлжилж байвал эхлээд терминалын цуцлах товчийг дарна уу.
          Дараа нь «Minu-с шалгаж тайлах» дарна. Энэ үйлдэл шинээр мөнгө татахгүй.
          Төлөгдсөн гүйлгээг дахин төлүүлэхгүй; анхны сагсны борлуулалтыг дуусгана.
        </p>
        <button type="button" disabled={loading || Boolean(checkingId)} onClick={() => setReload(value => value + 1)}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50">
          <RefreshCw size={16} aria-hidden="true" /> Жагсаалт шинэчлэх
        </button>
        {error && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</p>}
        {loading ? <p role="status" className="py-8 text-center text-sm text-slate-600">Гүйлгээнүүдийг ачаалж байна…</p>
          : !error && payments.length === 0 ? <p role="status" className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-600">Энэ терминалд шалгах хүлээгдэж буй гүйлгээ алга. Цонхоо хааж касс руу буцна уу.</p>
          : <ul aria-label="Терминалын шалгах гүйлгээнүүд" className="space-y-3">
            {payments.map(payment => {
              const result = results[payment.attemptId];
              const finished = result?.outcome === "RELEASED" || result?.outcome === "COMPLETED";
              return <li key={payment.attemptId} className="space-y-3 rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-slate-900">{formatMoney(payment.amount)}</p>
                    <p className="text-xs text-slate-600">{formatDateTime(payment.createdAt)} · {payment.registerName} · Терминал {payment.terminalId}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{result?.outcome === "COMPLETED" ? "Борлуулалт бүртгэгдсэн" : payment.status === "APPROVED" ? "Төлбөр батлагдсан" : payment.status === "DECLINED" ? "Амжилтгүй / цуцлагдсан" : payment.blocksTerminal ? "Түгжээтэй · шалгах шаардлагатай" : "Төлөв тодорхойгүй"}</span>
                </div>
                <p className="break-all font-mono text-xs text-slate-600">Нэхэмжлэх: {payment.invoice}</p>
                <p className="break-all font-mono text-xs text-slate-500">Лавлах: {payment.attemptId}</p>
                {payment.message && <p className="text-sm text-slate-700">{payment.message}</p>}
                {result && <p role="status" className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-800">{result.message}</p>}
                <button type="button" disabled={Boolean(checkingId) || finished} onClick={() => void check(payment)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50">
                  {checkingId === payment.attemptId && <Loader2 size={16} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />}
                  {checkingId === payment.attemptId ? "Minu-с шалгаж байна…" : finished ? "Шалгалт дууссан" : payment.status === "APPROVED" ? "Борлуулалтын төлөв шалгах" : "Minu-с шалгаж тайлах"}
                </button>
              </li>;
            })}
          </ul>}
        {truncated && <p className="text-sm text-amber-800">Эхний 100 гүйлгээг харууллаа. Шалгасан гүйлгээнүүдийн дараа жагсаалтаа шинэчилнэ үү.</p>}
      </div>
    </PosDialog>
  );
}
