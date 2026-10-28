"use client";
import { useId, useState } from "react";
import { CreditCard, Loader2, RefreshCw } from "lucide-react";
import type { VerifiedCardRecovery } from "@mgl/types";
import { PosDialog } from "./PosDialog";
import { useCardPaymentRecovery } from "../hooks/useCardPaymentRecovery";
import { formatDateTime, formatMoney } from "../utils/pos-display-format";

interface Props {
  registerId: string;
  amount: number;
  onVerified: (payment: VerifiedCardRecovery) => void;
  onClose: () => void;
}

export function CardPaymentRecoveryDialog({
  registerId,
  amount,
  onVerified,
  onClose,
}: Props) {
  const [date, setDate] = useState(() =>
    new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
  const dateId = useId();
  const { payments, loading, error, truncated, verifyingId, refresh, verify } =
    useCardPaymentRecovery(registerId, date, amount, onVerified);
  return (
    <PosDialog
      title="Өмнө төлөгдсөн картын гүйлгээ"
      description="Бараа, тоо ширхгээ сагсанд оруулаад өмнөх төлбөртэй холбоно. Шинээр мөнгө татахгүй."
      onClose={onClose}
      busy={Boolean(verifyingId)}
      wide
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-semibold text-blue-700">
            Сагсны төлөх дүн
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {formatMoney(amount)}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-600">
            Ижил дүнтэй гүйлгээг Minu-с шалгана. Холбосны дараа бараагаа хянаж
            «Гүйлгээ батлах» дарж борлуулалт, баримтаа үүсгэнэ.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <label
              htmlFor={dateId}
              className="mb-1.5 block text-xs font-semibold text-slate-600"
            >
              Төлбөр хийсэн огноо · Улаанбаатар
            </label>
            <input
              id={dateId}
              type="date"
              required
              value={date}
              disabled={Boolean(verifyingId)}
              onChange={(event) => setDate(event.target.value)}
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50"
            />
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={loading || Boolean(verifyingId)}
            className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50"
          >
            <RefreshCw size={16} aria-hidden="true" />
            Шинэчлэх
          </button>
        </div>
        <p className="text-xs leading-5 text-slate-500">
          Энэ кассаас эхлүүлсэн, борлуулалттай холбогдоогүй Minu картын
          оролдлогууд. Жагсаалтад байгаа нь төлөгдсөний баталгаа биш; холбох
          бүрд Minu-с шалгана.
        </p>
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          >
            {error}
          </p>
        )}
        {loading ? (
          <p
            role="status"
            className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"
          >
            <Loader2
              className="animate-spin motion-reduce:animate-none"
              size={18}
            />
            Гүйлгээнүүдийг шалгаж байна…
          </p>
        ) : payments.length === 0 ? (
          <p
            role="status"
            className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500"
          >
            Энэ өдөр холбох боломжтой гүйлгээ олдсонгүй. Төлбөрийн огноогоо
            шалгана уу.
          </p>
        ) : (
          <ul className="space-y-3" aria-label="Холбоогүй картын гүйлгээнүүд">
            {payments.map((payment) => {
              const matches =
                Math.round(payment.amount * 100) === Math.round(amount * 100);
              const busy = verifyingId === payment.attemptId;
              return (
                <li
                  key={payment.attemptId}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-blue-200"
                >
                  <CreditCard
                    aria-hidden="true"
                    size={20}
                    className="text-slate-400"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900">
                      {formatMoney(payment.amount)}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {formatDateTime(payment.createdAt)} · Терминал{" "}
                      {payment.terminalId}
                    </p>
                    <p className="mt-1 break-all font-mono text-[11px] text-slate-500">
                      {payment.transactionId
                        ? `RRN ${payment.transactionId}`
                        : `Лавлах ${payment.attemptId}`}
                    </p>
                    {!matches && (
                      <p className="mt-1 text-xs text-amber-700">
                        Сагсны дүнтэй таарахгүй
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={!matches || Boolean(verifyingId)}
                    onClick={() => {
                      void verify(payment);
                    }}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {busy && (
                      <Loader2
                        size={15}
                        className="animate-spin motion-reduce:animate-none"
                        aria-hidden="true"
                      />
                    )}
                    {busy ? "Minu-с шалгаж байна…" : "Minu-с шалгаж холбох"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {truncated && (
          <p className="text-xs text-amber-700">
            Эхний 100 гүйлгээг харуулж байна. Хэрэгтэй гүйлгээ харагдахгүй бол
            хариуцсан ажилтанд хандана уу.
          </p>
        )}
      </div>
    </PosDialog>
  );
}
