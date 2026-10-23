"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Info,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import {
  type ContractPaymentAccount,
  type SystemQrCategory,
  type SystemQrCity,
  type SystemQrDistrict,
  type SystemQrKhoroo,
} from "./payment-account.model";
import { BankAccountSection } from "./BankAccountSection";
import { AccountOwnerSection } from "./AccountOwnerSection";
import { AccountLocationSection } from "./AccountLocationSection";
import { AccountDialog } from "./AccountDialog";
import {
  AccountFormSection,
  AccountInput,
  bindAccountFields,
} from "./AccountFormFields";

export type AccountNotice = {
  tone: "error" | "success" | "info";
  message: string;
};

export function AccountFeedback({ notice }: { notice: AccountNotice }) {
  const feedbackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    feedbackRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "instant",
    });
  }, [notice]);
  return (
    <div
      ref={feedbackRef}
      role={notice.tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2.5 whitespace-pre-line rounded-xl border px-4 py-3 text-sm leading-relaxed ${notice.tone === "error" ? "border-red-200 bg-red-50 text-red-800" : notice.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-sky-200 bg-sky-50 text-sky-800"}`}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{notice.message}</span>
    </div>
  );
}

type Props = {
  config: Partial<ContractPaymentAccount>;
  cities: SystemQrCity[];
  districts: SystemQrDistrict[];
  khoroos: SystemQrKhoroo[];
  categories: SystemQrCategory[];
  khoroosLoading: boolean;
  khoroosError: string;
  retryKhoroos?: () => void;
  connecting: boolean;
  checking: boolean;
  notice: AccountNotice | null;
  onChange: (field: string, value: string | boolean) => void;
  onCityChange: (value: string) => void;
  onDistrictChange: (value: string) => void;
  onSubmit: () => Promise<boolean>;
  onCheck?: () => void;
  onClose: () => void;
  onClearNotice?: () => void;
};

export function PaymentAccountForm({
  config,
  cities,
  districts,
  khoroos,
  categories,
  khoroosLoading,
  khoroosError,
  retryKhoroos,
  connecting,
  checking,
  notice,
  onChange,
  onCityChange,
  onDistrictChange,
  onSubmit,
  onCheck,
  onClose,
  onClearNotice,
}: Props) {
  const [mode, setMode] = useState<"new" | "existing">(
    config.merchantCode ? "existing" : "new",
  );
  const [submitError, setSubmitError] = useState("");
  const formId = useId();
  const busy = connecting || checking;
  const isNew = mode === "new";
  const field = bindAccountFields({ config, onChange });

  const submit = async () => {
    setSubmitError("");
    try {
      if (await onSubmit()) onClose();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Данс хадгалж чадсангүй. Дахин оролдоно уу.",
      );
    }
  };

  return (
    <AccountDialog
      busy={busy}
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Minu дээр шалгаж баталгаажуулна
          </p>
          <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
            >
              Болих
            </button>
            {onCheck && (
              <button
                type="button"
                disabled={busy || !(config.merchantName || config.merchantCode)}
                onClick={onCheck}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
              >
                {checking && <Loader2 className="h-4 w-4 animate-spin" />}
                Бүртгэл шалгах
              </button>
            )}
            <button
              type="submit"
              form={formId}
              disabled={busy || (isNew && (khoroosLoading || !!khoroosError))}
              className="col-span-2 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
            >
              {connecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {connecting
                ? "Баталгаажуулж байна…"
                : isNew
                  ? "Minu данс холбох"
                  : "Шалгаад хадгалах"}
            </button>
          </div>
        </div>
      }
    >
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy) void submit();
        }}
        className="space-y-4"
      >
        <fieldset
          disabled={busy}
          className="min-w-0 space-y-4 disabled:opacity-70"
        >
          <fieldset className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-100/70 p-1.5">
            <legend className="sr-only">Данс холбох арга</legend>
            {(
              [
                {
                  value: "new",
                  label: "Шинэ данс бүртгэх",
                  description: "Minu merchant шинээр үүсгэнэ",
                  icon: CreditCard,
                },
                {
                  value: "existing",
                  label: "Бүртгэлтэй данс холбох",
                  description: "Minu-ээс авсан кодоо ашиглана",
                  icon: Building2,
                },
              ] as const
            ).map(({ value, label, description, icon: Icon }) => (
              <label key={value} className="min-w-0 cursor-pointer">
                <input
                  type="radio"
                  name={`${formId}-mode`}
                  value={value}
                  checked={mode === value}
                  onChange={() => {
                    setMode(value);
                    setSubmitError("");
                    onClearNotice?.();
                    if (value === "new") onChange("merchantCode", "");
                  }}
                  className="peer sr-only"
                />
                <span className="flex h-full items-start gap-2 rounded-xl border border-transparent p-3 transition hover:bg-white/60 peer-checked:border-slate-200 peer-checked:bg-white peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-amber-500">
                  <Icon className="mt-0.5 hidden h-4 w-4 shrink-0 text-amber-600 sm:block" />
                  <span>
                    <span className="block text-xs font-semibold text-slate-800 sm:text-sm">
                      {label}
                    </span>
                    <span className="mt-1 block text-[11px] leading-relaxed text-slate-500">
                      {description}
                    </span>
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
          {notice && <AccountFeedback notice={notice} />}
          {submitError && (
            <AccountFeedback notice={{ tone: "error", message: submitError }} />
          )}
          {!isNew && (
            <AccountFormSection
              title="Minu merchant код"
              description="Minu-ээс олгосон Merchant Code-г оруулна уу. Регистр болон дансны дугаар оруулахгүй."
              icon={ShieldCheck}
            >
              <div className="sm:col-span-2">
                <AccountInput
                  label="Merchant Code / Sub-merchant code"
                  {...field("merchantCode")}
                  required
                  placeholder="Minu-ээс авсан код"
                  spellCheck={false}
                />
              </div>
            </AccountFormSection>
          )}
          <BankAccountSection
            config={config}
            onChange={onChange}
            isNew={isNew}
          />
          {isNew && (
            <>
              <AccountOwnerSection
                config={config}
                onChange={onChange}
                categories={categories}
              />
              <AccountLocationSection
                config={config}
                onChange={onChange}
                cities={cities}
                districts={districts}
                khoroos={khoroos}
                khoroosLoading={khoroosLoading}
                khoroosError={khoroosError}
                retryKhoroos={retryKhoroos}
                onCityChange={onCityChange}
                onDistrictChange={onDistrictChange}
              />
              <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-slate-500">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                Merchant код амжилттай бүртгэгдсэний дараа автоматаар үүснэ.
              </p>
            </>
          )}
        </fieldset>
      </form>
    </AccountDialog>
  );
}
