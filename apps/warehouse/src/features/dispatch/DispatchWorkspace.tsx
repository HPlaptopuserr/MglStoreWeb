"use client";
import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { DispatchDestinationSection } from "./DispatchDestinationSection";
import { DispatchItemsSection } from "./DispatchItemsSection";
import { DispatchSourceFields } from "./DispatchSourceFields";
import { DispatchSummary } from "./DispatchSummary";
import { DispatchHistory } from "./DispatchHistory";
import { DispatchDocumentDialog } from "./DispatchDocumentDialog";
import { useManualDispatch } from "./useManualDispatch";
import { dispatchMoney } from "./dispatch-format";

export function DispatchWorkspace({
  warehouseId,
  warehouseName,
}: {
  warehouseId: string;
  warehouseName: string;
}) {
  const state = useManualDispatch(warehouseId);
  const [documentId, setDocumentId] = useState<string | null>(null);
  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <header>
        <h1 className="text-xl font-bold tracking-tight text-slate-950">
          Бараа гаргах · {warehouseName}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Бараа сонгох → хүлээн авагчийн мэдээлэл → падан үүсгэж баталгаажуулах
        </p>
      </header>
      {state.created && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
        >
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <CheckCircle2 className="size-5 shrink-0" />
            {state.created.dispatchNumber} падан үүсэж, бараа гарлаа.
          </p>
          <button
            type="button"
            onClick={() => setDocumentId(state.created!.id)}
            className="min-h-10 rounded-xl bg-white px-4 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
          >
            Падан харах
          </button>
        </div>
      )}
      <nav aria-label="Бараа гаргах алхмууд" className="grid grid-cols-2 gap-2">
        {(
          [
            { step: 1, label: "Бараа сонгох" },
            { step: 2, label: "Хүлээн авагч" },
          ] as const
        ).map(({ step, label }) => (
          <button
            key={step}
            type="button"
            aria-current={state.step === step ? "step" : undefined}
            disabled={state.saving || (step === 2 && Boolean(state.itemError))}
            onClick={() => state.setStep(step)}
            className={`min-h-12 rounded-xl border px-3 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40 ${state.step === step ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"}`}
          >
            {step}. {label}
          </button>
        ))}
      </nav>
      <div className="grid items-start gap-6 lg:grid-cols-12">
        <fieldset
          disabled={state.saving}
          className="min-w-0 space-y-5 lg:col-span-8"
        >
          {state.step === 1 ? (
            <DispatchItemsSection
              warehouseId={warehouseId}
              items={state.items}
              excludedProductIds={state.selectedProductIds}
              onAdd={state.add}
              onQuantityChange={state.updateQuantity}
              onRemove={state.remove}
            />
          ) : (
            <>
              <DispatchDestinationSection
                warehouseId={warehouseId}
                value={state.destination}
                onChange={state.setDestination}
              />
              <DispatchSourceFields
                warehouseName={warehouseName}
                reason={state.reason}
                note={state.note}
                onReason={state.setReason}
                onNote={state.setNote}
              />
              <button
                type="button"
                onClick={() => state.setStep(1)}
                className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                ← Барааны жагсаалт засах
              </button>
            </>
          )}
        </fieldset>
        <div className="lg:col-span-4">
          <DispatchSummary
            count={state.items.length}
            quantity={state.quantity}
            total={state.total}
            destination={state.destination}
            saving={state.saving}
            step={state.step}
            issue={
              state.itemError || (state.step === 2 ? state.recipientError : "")
            }
            error={state.error}
            onNext={() => state.setStep(2)}
            onConfirm={() => state.setConfirmOpen(true)}
          />
        </div>
      </div>
      <DispatchHistory
        key={`dispatch-history:${state.historyKey}`}
        warehouseId={warehouseId}
        refreshKey={state.historyKey}
        onSelect={setDocumentId}
      />
      {documentId && (
        <DispatchDocumentDialog
          key={documentId}
          warehouseId={warehouseId}
          documentId={documentId}
          onClose={() => setDocumentId(null)}
        />
      )}
      {state.confirmOpen && (
        <Modal
          size="md"
          title="Гаргалтыг баталгаажуулах"
          description={`${warehouseName} → ${state.destination.storeName}`}
          onClose={() => {
            if (!state.saving) state.setConfirmOpen(false);
          }}
        >
          <div className="space-y-4 text-sm leading-6 text-slate-600">
            <p>
              {state.items.length} төрлийн {state.quantity.toLocaleString()}{" "}
              ширхэг бараа гаргаж,{" "}
              <strong className="text-slate-900">
                {dispatchMoney(state.total)}
              </strong>{" "}
              дүнтэй падан үүсгэнэ.
            </p>
            <p className="rounded-xl bg-blue-50 p-3">
              Хүлээн авагч: <strong>{state.destination.recipientName}</strong>
              <br />
              Утас: {state.destination.recipientPhone}
              <br />
              Хаяг:{" "}
              {state.destination.address || "Оруулаагүй — байршил сонголттой"}
            </p>
            <p>Баталгаажуулахад агуулахын үлдэгдэл хасагдана.</p>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={state.saving}
                onClick={() => state.setConfirmOpen(false)}
                className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 font-semibold hover:bg-slate-50 disabled:opacity-50"
              >
                Болих
              </button>
              <button
                type="button"
                disabled={state.saving}
                onClick={() => void state.submit()}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {state.saving && <Loader2 className="size-4 animate-spin" />}
                Баталгаажуулах
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
