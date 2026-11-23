"use client";
import { useEffect, useState } from "react";
import { API } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type CreditAccount = {
  asOf: string;
  totalRemaining: number;
  credits: Array<{
    id: string;
    status: string;
    organization: { id: string; name: string };
    receiptNo: string;
    createdAt: string;
    dueDate: string | null;
    principalAmount: number;
    paidAmount: number;
    totalInterest: number;
    totalAmount: number;
    remainingDue: number;
  }>;
};
const money = (value: number) =>
  new Intl.NumberFormat("mn-MN", {
    style: "currency",
    currency: "MNT",
    maximumFractionDigits: 2,
  }).format(value);
export function PersonalCreditPanel() {
  const { user, authFetch } = useAuth();
  const [account, setAccount] = useState<CreditAccount | null>(null);
  const [accountOwner, setAccountOwner] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!user?.id) {
      setAccount(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setAccount(null);
    void authFetch(`${API}/credit-account`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Зээлийн мэдээлэл авч чадсангүй");
        const result: CreditAccount = await response.json();
        if (!controller.signal.aborted) {
          setAccount(result);
          setAccountOwner(user.id);
        }
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "Мэдээлэл авч чадсангүй",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [user?.id, authFetch, refresh]);
  return (
    <section
      aria-labelledby="personal-credit-title"
      className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="personal-credit-title"
          className="text-lg font-black text-slate-950"
        >
          Миний зээл
        </h2>
        <button
          type="button"
          disabled={loading}
          onClick={() => setRefresh((value) => value + 1)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-50"
        >
          Шинэчлэх
        </button>
      </div>
      {loading && (
        <p role="status" className="mt-4 text-sm text-slate-500">
          Зээлийн мэдээлэл ачаалж байна…
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}
      {!loading && !error && account && accountOwner === user?.id && (
        <>
          <p className="mt-3 text-sm text-slate-600">
            Нийт үлдэгдэл{" "}
            <strong className="ml-2 text-xl text-slate-950">
              {money(account.totalRemaining)}
            </strong>
          </p>
          {!account.credits.length && (
            <p className="mt-3 text-sm text-slate-500">
              Таны бүртгэлд холбогдсон нээлттэй зээл алга.
            </p>
          )}
          <ul className="mt-4 space-y-3">
            {account.credits.map((credit) => (
              <li
                key={credit.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-bold text-slate-900">
                    {credit.organization.name}
                  </p>
                  <strong className="tabular-nums text-amber-700">
                    {money(credit.remainingDue)}
                  </strong>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Баримт: {credit.receiptNo} ·{" "}
                  {new Date(credit.createdAt).toLocaleDateString("mn-MN")}
                </p>
                <p className="mt-2 text-xs text-slate-600">
                  Үндсэн зээл {money(credit.principalAmount)} · Төлсөн{" "}
                  {money(credit.paidAmount)} · Хүү {money(credit.totalInterest)}
                </p>
                {credit.dueDate && (
                  <p className="mt-1 text-xs text-slate-500">
                    Төлөх хугацаа:{" "}
                    {new Date(credit.dueDate).toLocaleDateString("mn-MN")}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-400">
            Тооцоолсон: {new Date(account.asOf).toLocaleString("mn-MN")}
          </p>
        </>
      )}
    </section>
  );
}
