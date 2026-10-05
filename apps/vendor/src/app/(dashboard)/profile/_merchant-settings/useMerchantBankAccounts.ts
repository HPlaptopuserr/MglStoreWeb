"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { API, authFetch } from "@/lib/api";
import type { BankAccount } from "./types";

export type BankAccountsLoadState = "loading" | "ready" | "forbidden" | "error";

function isBankAccount(value: unknown): value is BankAccount {
  if (typeof value !== "object" || value === null) return false;
  return "account_bank_code" in value && typeof value.account_bank_code === "string"
    && "account_number" in value && typeof value.account_number === "string"
    && "account_name" in value && typeof value.account_name === "string"
    && "is_default" in value && typeof value.is_default === "boolean";
}

export function useMerchantBankAccounts(query: string) {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [state, setState] = useState<BankAccountsLoadState>("loading");
  const [canEdit, setCanEdit] = useState(false);
  const requestId = useRef(0);
  const load = useCallback(async () => {
    const id = ++requestId.current;
    setState("loading");
    setAccounts([]);
    setCanEdit(false);
    try {
      const response = await authFetch(`${API}/vendor/merchant/bank-accounts${query}`);
      if (id !== requestId.current) return;
      if (response.status === 403) { setState("forbidden"); return; }
      if (!response.ok) throw new Error("Bank account request failed");
      const data: unknown = await response.json();
      if (id !== requestId.current) return;
      if (typeof data !== "object" || data === null || !("success" in data) || data.success !== true
        || !("bank_accounts" in data) || !Array.isArray(data.bank_accounts)
        || !data.bank_accounts.every(isBankAccount)) throw new Error("Invalid bank account response");
      setAccounts(data.bank_accounts);
      setCanEdit("canEdit" in data && data.canEdit === true);
      setState("ready");
    } catch {
      if (id === requestId.current) setState("error");
    }
  }, [query]);
  useEffect(() => {
    void load();
    return () => { requestId.current += 1; };
  }, [load]);
  return { accounts, setAccounts, state, canEdit, load };
}
