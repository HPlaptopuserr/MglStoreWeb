"use client";

import { useCallback, useEffect, useState } from "react";
import { API } from "@/lib/api";
import type { AuthUser } from "@/lib/auth-context";
import type {
  AccountContract,
  AccountPurchase,
  AccountTransaction,
  MPointHistory,
} from "./types";

type AuthFetch = (url: string, init?: RequestInit) => Promise<Response>;

export function useProfileAccountData(
  user: AuthUser | null,
  authFetch: AuthFetch,
) {
  const [purchases, setPurchases] = useState<AccountPurchase[]>([]);
  const [contracts, setContracts] = useState<AccountContract[]>([]);
  const [points, setPoints] = useState(0);
  const [pointHistory, setPointHistory] = useState<MPointHistory[]>([]);
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError("");
    try {
      const [purchaseRes, pointRes, historyRes, transactionRes, contractRes] =
        await Promise.all([
          authFetch(`${API}/customer/purchases`),
          authFetch(`${API}/customer/loyalty/points`),
          authFetch(`${API}/customer/loyalty/history`),
          authFetch(`${API}/customer/transactions`),
          authFetch(`${API}/contracts/my`),
        ]);

      if (purchaseRes.ok) {
        const data = await purchaseRes.json().catch(() => ({}));
        setPurchases(Array.isArray(data.purchases) ? data.purchases : []);
      }
      if (pointRes.ok) {
        const data = await pointRes.json().catch(() => ({}));
        setPoints(Number(data.points || 0));
      }
      if (historyRes.ok) {
        const data = await historyRes.json().catch(() => []);
        setPointHistory(Array.isArray(data) ? data : []);
      }
      if (transactionRes.ok) {
        const data = await transactionRes.json().catch(() => ({}));
        setTransactions(
          Array.isArray(data.transactions) ? data.transactions : [],
        );
      }
      if (contractRes.ok) {
        const data = await contractRes.json().catch(() => ({}));
        setContracts(Array.isArray(data.contracts) ? data.contracts : []);
      }
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Профайлын мэдээлэл ачаалахад алдаа гарлаа",
      );
    } finally {
      setLoading(false);
    }
  }, [authFetch, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user) return;

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refresh, user]);

  return {
    contracts,
    error,
    loading,
    pointHistory,
    points,
    purchases,
    refresh,
    transactions,
  };
}
