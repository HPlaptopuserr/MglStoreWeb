"use client";

import { useState } from "react";
import {
  ChevronDown,
  KeyRound,
  Link2,
  Loader2,
  Search,
  ShieldCheck,
} from "lucide-react";
import type { ManualPaymentProvider } from "./types";
import { merchantInputClass } from "./constants";
import { Field } from "./shared";

type ManualMerchantConnectionPanelProps = {
  provider: ManualPaymentProvider;
  merchantId: string;
  merchantKey: string;
  invoiceCode: string;
  recoveryRegNum: string;
  recoveryLoading: boolean;
  isSubmitting: boolean;
  onProviderChange: (provider: ManualPaymentProvider) => void;
  onMerchantIdChange: (value: string) => void;
  onMerchantKeyChange: (value: string) => void;
  onInvoiceCodeChange: (value: string) => void;
  onRecoveryRegNumChange: (value: string) => void;
  onRecover: () => void;
  onConnect: () => void;
};

export function ManualMerchantConnectionPanel({
  provider,
  merchantId,
  merchantKey,
  invoiceCode,
  recoveryRegNum,
  recoveryLoading,
  isSubmitting,
  onProviderChange,
  onMerchantIdChange,
  onMerchantKeyChange,
  onInvoiceCodeChange,
  onRecoveryRegNumChange,
  onRecover,
  onConnect,
}: ManualMerchantConnectionPanelProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const isSystemQr = provider === "systemqr";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <section className="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm">
        <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-white p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
              <Search className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-bold text-slate-950 sm:text-lg">
                Өмнөх бүртгэлээ автоматаар холбох
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Зөвхөн регистрийн дугаараа оруулна. Систем таны Minu Dynamic QR
                бүртгэлийг олж энэ дэлгүүртэй холбоно.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <label
            htmlFor="merchant-recovery-register"
            className="mb-2 block text-sm font-bold text-slate-700"
          >
            Регистрийн дугаар
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="merchant-recovery-register"
              type="text"
              value={recoveryRegNum}
              onChange={(event) => onRecoveryRegNumChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && recoveryRegNum.trim()) onRecover();
              }}
              placeholder="Жишээ: АМ12345678"
              autoComplete="off"
              className="min-h-12 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium uppercase outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            />
            <button
              type="button"
              onClick={onRecover}
              disabled={recoveryLoading || !recoveryRegNum.trim()}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {recoveryLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              Бүртгэл хайж холбох
            </button>
          </div>
          <p className="mt-3 flex items-center gap-2 text-xs font-medium text-emerald-700">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Merchant ID, нууц түлхүүрийг мэдэх шаардлагагүй
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white">
        <button
          type="button"
          onClick={() => setAdvancedOpen((open) => !open)}
          aria-expanded={advancedOpen}
          className="flex min-h-14 w-full items-center gap-3 px-5 text-left transition hover:bg-slate-50 sm:px-6"
        >
          <KeyRound className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-slate-700">
              Merchant мэдээллээр гараар холбох
            </span>
            <span className="block truncate text-xs text-slate-400">
              Зөвхөн техникийн мэдээллээ мэдэж байгаа үед
            </span>
          </span>
          <ChevronDown
            className={`h-5 w-5 text-slate-400 transition-transform ${advancedOpen ? "rotate-180" : ""}`}
          />
        </button>

        {advancedOpen && (
          <div className="space-y-5 border-t border-slate-100 p-5 sm:p-6">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Төлбөрийн үйлчилгээ
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onProviderChange("systemqr")}
                  className={`min-h-11 rounded-xl border px-3 text-sm font-bold transition ${isSystemQr ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                >
                  Minu Dynamic QR
                </button>
                <button
                  type="button"
                  onClick={() => onProviderChange("qpay")}
                  className={`min-h-11 rounded-xl border px-3 text-sm font-bold transition ${!isSystemQr ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                >
                  QPay V2
                </button>
              </div>
            </div>

            <Field label={isSystemQr ? "Merchant Code" : "Merchant ID"}>
              <input
                type="text"
                value={merchantId}
                onChange={(event) => onMerchantIdChange(event.target.value)}
                placeholder={isSystemQr ? "MC000123" : "MYSHOP_MN"}
                className={merchantInputClass}
              />
            </Field>

            {!isSystemQr && (
              <>
                <Field label="Merchant Key">
                  <input
                    type="password"
                    value={merchantKey}
                    onChange={(event) => onMerchantKeyChange(event.target.value)}
                    placeholder="•••••••••"
                    className={merchantInputClass}
                  />
                </Field>
                <Field label="Invoice Code (заавал биш)">
                  <input
                    type="text"
                    value={invoiceCode}
                    onChange={(event) => onInvoiceCodeChange(event.target.value)}
                    placeholder="Хоосон орхиж болно"
                    className={merchantInputClass}
                  />
                </Field>
              </>
            )}

            <button
              type="button"
              onClick={onConnect}
              disabled={isSubmitting || !merchantId || (!isSystemQr && !merchantKey)}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Merchant данс холбох
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
