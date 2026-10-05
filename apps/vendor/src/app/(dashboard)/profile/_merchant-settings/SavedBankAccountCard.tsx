"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { BANK_OPTIONS } from "./constants";
import type { BankAccount } from "./types";

export function SavedBankAccountCard({ account }: { account: BankAccount }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timeout.current) clearTimeout(timeout.current); }, []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(account.account_number);
      setCopyState("copied");
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => setCopyState("idle"), 2000);
    } catch { setCopyState("error"); }
  };
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 transition-colors hover:border-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-600">{BANK_OPTIONS.find((bank) => bank.code === account.account_bank_code)?.name || account.account_bank_code}</span>
        {account.is_default && <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">Үндсэн данс</span>}
      </div>
      <div className="mt-2 flex items-center gap-3">
        <p className="min-w-0 break-all font-mono text-xl font-semibold tracking-wide text-slate-900 sm:text-2xl">{account.account_number}</p>
        <button type="button" onClick={() => { void copy(); }} aria-label="Дансны дугаар хуулах" className="shrink-0 rounded-lg p-2 text-slate-500 transition-colors hover:bg-white hover:text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600">
          {copyState === "copied" ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
        </button>
      </div>
      <p className="mt-1 break-words text-sm text-slate-600">{account.account_name}</p>
      <p role="status" className="mt-1 text-xs text-slate-500">{copyState === "copied" ? "Дансны дугаар хууллаа" : copyState === "error" ? "Хуулж чадсангүй. Дугаарыг сонгож гараар хуулна уу." : ""}</p>
    </div>
  );
}
