"use client";
import { useState } from "react";
import { TransferConfirmDialog } from "./TransferConfirmDialog";
import { TransferProductPicker } from "./TransferProductPicker";
import { useTransferComposer } from "./useTransferComposer";
export function TransferComposer({
  sourceId,
  sourceName,
  onSent,
}: {
  sourceId: string;
  sourceName: string;
  onSent: () => void;
}) {
  const state = useTransferComposer(sourceId, onSent);
  const [confirm, setConfirm] = useState(false);
  const destination =
    state.pending?.destinationWarehouseId ?? state.destinationId;
  const destinationName =
    state.destinations.find((row) => row.id === destination)?.name ??
    destination;
  const total = (state.pending?.items ?? state.items).reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  return (
    <div className="space-y-4">
      {state.error && (
        <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">
          {state.error}{" "}
          <button onClick={() => void state.refresh()} className="underline">
            Дахин ачаалах
          </button>
        </div>
      )}
      {state.message && (
        <p
          role="status"
          className="rounded-lg bg-emerald-50 p-4 text-emerald-800"
        >
          {state.message}
        </p>
      )}
      {state.pending && (
        <p className="rounded-lg bg-amber-50 p-4 text-amber-800">
          Өмнөх хүсэлтийн хариу баталгаажаагүй байна. Дахин шалгаж илгээхэд
          давхар хасахгүй.
        </p>
      )}
      {state.loading && <p role="status">Агуулах, үлдэгдэл ачаалж байна…</p>}
      <fieldset
        disabled={state.busy || state.loading || Boolean(state.pending)}
        className="space-y-4 disabled:opacity-60"
      >
        <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm text-emerald-700">Эх агуулах</p>
            <p className="rounded-lg border border-slate-200 bg-emerald-50 p-3">
              {sourceName}
            </p>
          </div>
          <label className="text-sm text-blue-700">
            Очих агуулах
            <select
              value={state.destinationId}
              onChange={(event) => state.setDestinationId(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 p-3 text-slate-900"
            >
              <option value="">
                {state.loading
                  ? "Агуулах ачаалж байна…"
                  : state.error && !state.destinations.length
                    ? "Агуулах ачаалагдсангүй"
                    : !state.destinations.length
                      ? "Очих агуулах олдсонгүй"
                      : "Очих агуулахаа сонгоно уу"}
              </option>
              <option value={sourceId} disabled>
                {sourceName} — эх агуулах
              </option>
              {state.destinations.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-slate-500">
              Админ үүсгэсэн бүх идэвхтэй агуулах. Эх агуулах руу шилжүүлэхгүй.
            </span>
          </label>
        </section>
        <TransferProductPicker
          inventory={state.inventory}
          items={state.items}
          onChange={state.setItems}
        />
        <label className="block text-sm">
          Тэмдэглэл
          <textarea
            maxLength={1000}
            value={state.note}
            onChange={(event) => state.setNote(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 p-3"
          />
        </label>
      </fieldset>
      <button
        disabled={
          state.busy || state.loading || (!state.pending && !state.valid)
        }
        onClick={() => setConfirm(true)}
        className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        {state.pending
          ? "Өмнөх илгээлтийг дахин шалгах"
          : `Илгээх (${total} ш)`}
      </button>
      {confirm && (
        <TransferConfirmDialog
          title="Барааг илгээхдээ итгэлтэй байна уу?"
          description={`${sourceName} → ${destinationName}: ${total} ширхэг бараа. Илгээснээр эх агуулахын үлдэгдлээс хасагдаж, очих агуулахад хүлээн авах падаан үүснэ.`}
          busy={state.busy}
          onClose={() => setConfirm(false)}
          onConfirm={() => {
            void state.send().then(() => setConfirm(false));
          }}
        />
      )}
    </div>
  );
}
