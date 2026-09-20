"use client";

import { useEffect, useId, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { getCashDrawerSummary } from "../api/cash-drawer";
import type { BlockingRegisterShift } from "../hooks/useCurrentShift";

interface RegisterShiftConflictProps {
  shift: BlockingRegisterShift;
  busy: boolean;
  settlesTerminal: boolean;
  onRefresh: () => void;
  onClose: (shiftId: string, amount: number, note: string) => Promise<void>;
}
const money = (amount: number) => `${amount.toLocaleString("mn-MN")} ₮`;

export function RegisterShiftConflict({
  shift,
  busy,
  settlesTerminal,
  onRefresh,
  onClose,
}: RegisterShiftConflictProps) {
  const id = useId();
  const [expected, setExpected] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const pending = busy || submitting;

  useEffect(() => {
    if (!shift.canClose) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void getCashDrawerSummary(shift.id, controller.signal)
      .then((summary) => {
        if (!controller.signal.aborted) setExpected(summary.expectedCash);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error
              ? error.message
              : "Хаалтын тооцоо авахад алдаа гарлаа.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [shift.id, shift.canClose, attempt]);

  const counted = Number(amount);
  const valid =
    amount.trim() !== "" &&
    Number.isFinite(counted) &&
    counted >= 0 &&
    note.trim().length > 0 &&
    confirmed;
  return (
    <section className="space-y-4" aria-labelledby={`${id}-title`}>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
        <h2
          id={`${id}-title`}
          className="flex items-center gap-2 font-semibold"
        >
          <AlertTriangle size={18} aria-hidden="true" /> Өмнөх кассчны ээлж
          нээлттэй байна
        </h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-amber-800">Кассчин</dt>
            <dd className="break-words font-semibold">{shift.cashierName}</dd>
          </div>
          <div>
            <dt className="text-amber-800">Касс</dt>
            <dd className="font-semibold">{shift.registerName}</dd>
          </div>
          <div>
            <dt className="text-amber-800">Нээсэн</dt>
            <dd className="font-semibold">
              {new Date(shift.openedAt).toLocaleString("mn-MN")}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-sm leading-6">
          {shift.canClose
            ? "Эзэмшигчийн эрхээр үлдэгдэл мөнгийг тоолж, тайлбартай хааж болно. Дараа нь өөрийн ээлжийг нээнэ."
            : "Өмнөх кассчин өөрийн бүртгэлээр ээлжээ хаах эсвэл дэлгүүрийн эзэмшигчид хандана уу. Дараа нь төлөвийг шинэчилнэ."}
        </p>
      </div>
      {shift.canClose && (
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!valid || pending || loading || expected === null) return;
            setSubmitting(true);
            setError(null);
            try {
              const latest = await getCashDrawerSummary(shift.id);
              if (latest.shift.status !== "OPEN") {
                onRefresh();
                return;
              }
              if (latest.expectedCash !== expected) {
                setExpected(latest.expectedCash);
                setConfirmed(false);
                throw new Error(
                  "Тооцоолсон бэлэн мөнгө шинэчлэгдлээ. Дүнгээ шалгаж дахин баталгаажуулна уу.",
                );
              }
              await onClose(shift.id, counted, note.trim());
            } catch (error: unknown) {
              setError(
                error instanceof Error
                  ? error.message
                  : "Ээлж хаахад алдаа гарлаа.",
              );
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {loading ? (
            <p
              role="status"
              className="flex items-center gap-2 text-sm text-slate-600"
            >
              <Loader2
                size={16}
                className="animate-spin motion-reduce:animate-none"
              />{" "}
              Хаалтын тооцоо ачаалж байна…
            </p>
          ) : (
            expected !== null && (
              <div className="rounded-xl bg-slate-50 p-4 text-sm">
                Тооцоолсон бэлэн мөнгө: <strong>{money(expected)}</strong>
                {amount.trim() && Number.isFinite(counted) && (
                  <p className="mt-2">
                    Зөрүү:{" "}
                    <strong>
                      {money(Math.round((counted - expected) * 100) / 100)}
                    </strong>
                  </p>
                )}
              </div>
            )
          )}
          <label
            className="block text-sm font-medium text-slate-700"
            htmlFor={`${id}-cash`}
          >
            Бодитоор тоолсон бэлэн мөнгө (₮)
            <input
              id={`${id}-cash`}
              type="number"
              min="0"
              step="0.01"
              required
              value={amount}
              disabled={pending}
              onChange={(event) => {
                setAmount(event.target.value);
                setConfirmed(false);
              }}
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Тоолсон дүнгээ оруулна уу"
            />
          </label>
          <label
            className="block text-sm font-medium text-slate-700"
            htmlFor={`${id}-note`}
          >
            Бусдын ээлжийг хаах шалтгаан
            <textarea
              id={`${id}-note`}
              required
              maxLength={500}
              rows={2}
              value={note}
              disabled={pending}
              onChange={(event) => setNote(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Жишээ: өмнөх кассчин ээлжээ хаалгүй гарсан"
            />
          </label>
          <label className="flex items-start gap-3 text-sm leading-6 text-slate-600">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={pending}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-1 size-4"
            />
            Мөнгийг тоолж шалгасан. Хаалт миний бүртгэлээр хийгдсэн тухай түүх
            хадгалагдана.
          </label>
          {settlesTerminal && (
            <p className="text-sm text-slate-600">
              Хаахаас өмнө картын терминалын өдрийн нэгтгэл хийгдэнэ.
            </p>
          )}
          <button
            type="submit"
            disabled={!valid || expected === null || loading || pending}
            className="min-h-11 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Хаалт хийж байна…" : "Тоолсон дүнгээр ээлжийг хаах"}
          </button>
        </form>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700"
        >
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={pending || loading}
        onClick={() => {
          setAttempt((value) => value + 1);
          onRefresh();
        }}
        className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        Төлөв шинэчлэх
      </button>
    </section>
  );
}
