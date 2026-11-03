"use client";

import { useState } from "react";
import { Landmark, RefreshCw, ShieldCheck, Loader2 } from "lucide-react";
import {
  formatWarehouseInvestment,
  type WarehouseMonthlyDividend,
  type WarehouseDividendChoice,
} from "@mgl/types";
import { useDividendVerification } from "./useDividendVerification";
import { DividendVerificationPanel } from "./DividendVerificationPanel";
import { useInvestorBankAccount } from "../account/useInvestorBankAccount";

export function DividendChoiceForm({
  dividend,
  warehouseId,
  onConfirmed,
}: {
  dividend: WarehouseMonthlyDividend & { id: string; version: number };
  warehouseId: string;
  onConfirmed: () => void;
}) {
  const [choice, setChoice] =
    useState<WarehouseDividendChoice>("BANK_TRANSFER");
  const [bankDraft, setBankDraft] = useState<{
    bankName: string;
    bankAccount: string;
    bankAccountName: string;
  } | null>(null);
  const savedBank = useInvestorBankAccount();
  const bank = bankDraft ?? {
    bankName: savedBank.account?.bankName ?? "",
    bankAccount: savedBank.account?.bankAccount ?? "",
    bankAccountName: savedBank.account?.bankAccountName ?? "",
  };
  const state = useDividendVerification(
    warehouseId,
    dividend.id,
    dividend.version,
    onConfirmed,
  );
  return (
    <div className="mt-5 border-t border-emerald-100 pt-4">
      {state.session ? (
        <DividendVerificationPanel
          session={state.session}
          onReset={state.reset}
        />
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void state.start({ choice, ...bank });
          }}
          className="space-y-4"
        >
          <fieldset disabled={state.busy}>
            <legend className="mb-3 text-sm font-semibold text-slate-800">
              Ногдол ашгаа хэрхэн авах вэ?
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  {
                    value: "BANK_TRANSFER",
                    label: "Дансаар авах",
                    description: "Өөрийн банкны дансанд авах хүсэлт",
                    icon: Landmark,
                  },
                  {
                    value: "REINVEST",
                    label: "Дахин хөрөнгө оруулах",
                    description: "Үндсэн хөрөнгийн дүндээ нэмэх",
                    icon: RefreshCw,
                  },
                ] as const
              ).map(({ value, label, description, icon: Icon }) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition hover:border-blue-300 ${choice === value ? "border-blue-400 bg-blue-50/70" : "border-slate-200 bg-white"}`}
                >
                  <input
                    type="radio"
                    name={`dividend-choice-${dividend.id}`}
                    value={value}
                    checked={choice === value}
                    onChange={() => setChoice(value)}
                    className="mt-1 accent-blue-600"
                  />
                  <Icon className="mt-0.5 size-4 shrink-0 text-blue-600" />
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">
                      {label}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      {description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {choice === "BANK_TRANSFER" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {savedBank.loading && (
                <p
                  role="status"
                  className="text-xs text-slate-500 sm:col-span-2"
                >
                  Хадгалсан дансыг шалгаж байна…
                </p>
              )}
              {savedBank.error && (
                <div
                  role="alert"
                  className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 sm:col-span-2"
                >
                  {savedBank.error}
                  <button
                    type="button"
                    onClick={savedBank.reload}
                    className="ml-2 min-h-9 font-semibold underline"
                  >
                    Дахин ачаалах
                  </button>
                </div>
              )}
              {savedBank.account && (
                <p className="text-xs text-emerald-700 sm:col-span-2">
                  Хадгалсан дансаа ашиглах эсвэл шинэ данс оруулж баталгаажуулна
                  уу.
                </p>
              )}
              {(
                [
                  {
                    key: "bankName",
                    label: "Банкны нэр",
                    placeholder: "Банкны нэр",
                    autoComplete: "off",
                  },
                  {
                    key: "bankAccount",
                    label: "Дансны дугаар / IBAN",
                    placeholder: "MN… эсвэл дансны дугаар",
                    autoComplete: "off",
                  },
                  {
                    key: "bankAccountName",
                    label: "Данс эзэмшигчийн нэр",
                    placeholder: "Овог, нэр",
                    autoComplete: "name",
                  },
                ] as const
              ).map(({ key, label, placeholder, autoComplete }) => (
                <label
                  key={key}
                  className={`block text-xs font-medium text-slate-600 ${key === "bankAccountName" ? "sm:col-span-2" : ""}`}
                >
                  {label}
                  <input
                    value={bank[key]}
                    onChange={(event) => {
                      setBankDraft((current) => ({
                        ...bank,
                        ...current,
                        [key]: event.target.value,
                      }));
                    }}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    required
                    disabled={state.busy}
                    maxLength={key === "bankAccount" ? 30 : 100}
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                  />
                </label>
              ))}
            </div>
          )}
          <p className="rounded-xl bg-white/80 p-3 text-xs leading-6 text-slate-600">
            {choice === "REINVEST"
              ? `Verify.mn-ээр баталгаажмагц ${formatWarehouseInvestment(dividend.amount)} үндсэн хөрөнгө дээр нэг удаа нэмэгдэнэ.`
              : "Баталгаажуулсны дараа дансаар авах хүсэлт агуулахын ажилтанд харагдана."}{" "}
            Баталгаажсан сонголтыг өөрчлөхгүй. SMS-ийн төлбөр 150₮.
          </p>
          <button
            type="submit"
            disabled={state.busy}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-50"
          >
            {state.busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ShieldCheck className="size-4" />
            )}
            Verify.mn-ээр баталгаажуулах
          </button>
        </form>
      )}
      {state.error && (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-700"
        >
          {state.error}
        </p>
      )}
    </div>
  );
}
