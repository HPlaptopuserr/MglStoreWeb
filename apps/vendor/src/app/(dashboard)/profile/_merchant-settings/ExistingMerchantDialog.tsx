"use client";

import { X } from "lucide-react";
import type { ManualPaymentProvider, MerchantMessage } from "./types";
import { MerchantSettingsMessage } from "./shared";
import { ManualMerchantConnectionPanel } from "./ManualMerchantConnectionPanel";

interface ExistingMerchantDialogProps {
  message: MerchantMessage | null;
  provider: ManualPaymentProvider;
  merchantId: string;
  merchantKey: string;
  invoiceCode: string;
  recoveryRegNum: string;
  recoveryLoading: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onProviderChange: (value: ManualPaymentProvider) => void;
  onMerchantIdChange: (value: string) => void;
  onMerchantKeyChange: (value: string) => void;
  onInvoiceCodeChange: (value: string) => void;
  onRecoveryRegNumChange: (value: string) => void;
  onRecover: () => void;
  onConnect: () => void;
}

export function ExistingMerchantDialog({
  message,
  provider,
  merchantId,
  merchantKey,
  invoiceCode,
  recoveryRegNum,
  recoveryLoading,
  isSubmitting,
  onClose,
  onProviderChange,
  onMerchantIdChange,
  onMerchantKeyChange,
  onInvoiceCodeChange,
  onRecoveryRegNumChange,
  onRecover,
  onConnect,
}: ExistingMerchantDialogProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="existing-merchant-title"
    >
      <div className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-slate-50 shadow-2xl sm:max-h-[88dvh] sm:rounded-3xl">
        <header className="flex items-start justify-between border-b border-slate-100 bg-white px-5 py-5 sm:px-7">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-600">
              Minu Dynamic QR
            </p>
            <h2
              id="existing-merchant-title"
              className="mt-1 text-xl font-black text-slate-950 sm:text-2xl"
            >
              Өмнөх дансаа холбох
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Регистрийн дугаараар бүртгэлээ автоматаар олно.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Цонх хаах"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-100"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <div
          className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain p-4 [scrollbar-gutter:stable] sm:p-6"
          data-lenis-prevent="true"
        >
          <MerchantSettingsMessage message={message} />
          <div className={message ? "mt-4" : ""}>
            <ManualMerchantConnectionPanel
              provider={provider}
              merchantId={merchantId}
              merchantKey={merchantKey}
              invoiceCode={invoiceCode}
              recoveryRegNum={recoveryRegNum}
              recoveryLoading={recoveryLoading}
              isSubmitting={isSubmitting}
              onProviderChange={onProviderChange}
              onMerchantIdChange={onMerchantIdChange}
              onMerchantKeyChange={onMerchantKeyChange}
              onInvoiceCodeChange={onInvoiceCodeChange}
              onRecoveryRegNumChange={onRecoveryRegNumChange}
              onRecover={onRecover}
              onConnect={onConnect}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
