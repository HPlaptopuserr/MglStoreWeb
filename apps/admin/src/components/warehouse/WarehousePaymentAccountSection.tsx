"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CreditCard, Loader2, Plus, X } from "lucide-react";
import { API, adminFetch, getApiErrorMessage } from "@/lib/api";
import { ContractPaymentAccountsSettings } from "@/components/organisms/settings/ContractPaymentAccountsSettings";

interface PaymentAccount {
  id: string;
  label: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  merchantCode: string;
}

interface Props {
  warehouseId: string;
  warehouseName: string;
  paymentAccountId: string | null;
  onSaved: () => Promise<void>;
}

export function WarehousePaymentAccountSection({
  warehouseId,
  warehouseName,
  paymentAccountId,
  onSaved,
}: Props) {
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [selectedId, setSelectedId] = useState(paymentAccountId || "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [showAccountCreator, setShowAccountCreator] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => setSelectedId(paymentAccountId || ""), [paymentAccountId]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await adminFetch(`${API}/warehouses/payment-accounts`);
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            body?.message || "Төлбөрийн дансны жагсаалт авахад алдаа гарлаа",
          );
        }
        if (active)
          setAccounts(Array.isArray(body?.accounts) ? body.accounts : []);
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Төлбөрийн дансны жагсаалт авахад алдаа гарлаа",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedId) || null,
    [accounts, selectedId],
  );

  const save = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const response = await adminFetch(
        `${API}/warehouses/${warehouseId}/payment-account`,
        {
          method: "PUT",
          body: JSON.stringify({ accountId: selectedId }),
        },
      );
      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(response, "Данс холбож чадсангүй"),
        );
      }
      setSaved(true);
      await onSaved();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Данс холбож чадсангүй",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-200">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900">
              Төлбөр хүлээн авах данс
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {warehouseName}-ийн нэхэмжлэх болон Minu QR төлбөр энэ данстай
              холбогдоно.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowAccountCreator(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-700 transition hover:border-blue-300 hover:bg-blue-50"
        >
          <Plus className="h-4 w-4" /> Шинэ данс үүсгэх
        </button>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" /> Дансны
            мэдээлэл татаж байна...
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Агуулахтай холбох данс
              </span>
              <select
                value={selectedId}
                onChange={(event) => {
                  setSelectedId(event.target.value);
                  setSaved(false);
                }}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Данс сонгоогүй — төлбөр хаалттай</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.bankName} ·{" "}
                    {account.accountNumber || account.merchantCode} ·{" "}
                    {account.accountHolder}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || selectedId === (paymentAccountId || "")}
              className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {saving
                ? "Хадгалж байна..."
                : saved
                  ? "Хадгалагдсан"
                  : "Данс холбох"}
            </button>
          </div>
        )}

        {selectedAccount && (
          <div className="mt-4 grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-emerald-700">Банк</p>
              <p className="mt-1 font-bold text-slate-900">
                {selectedAccount.bankName}
              </p>
            </div>
            <div>
              <p className="text-xs text-emerald-700">Дансны дугаар</p>
              <p className="mt-1 font-bold text-slate-900">
                {selectedAccount.accountNumber || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-emerald-700">Эзэмшигч</p>
              <p className="mt-1 font-bold text-slate-900">
                {selectedAccount.accountHolder}
              </p>
            </div>
          </div>
        )}

        {!loading && accounts.length === 0 && !error && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Бүртгэлтэй данс алга. “Шинэ данс үүсгэх” товчоор Minu дансаа эхлээд
            бүртгэнэ үү.
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>

      {showAccountCreator && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={() => {
            setShowAccountCreator(false);
            setReloadKey((current) => current + 1);
          }}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-slate-50 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  Minu төлбөрийн данс үүсгэх
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Данс үүсгэсний дараа хаагаад агуулахтай холбоно.
                </p>
              </div>
              <button
                type="button"
                aria-label="Данс үүсгэх цонх хаах"
                onClick={() => {
                  setShowAccountCreator(false);
                  setReloadKey((current) => current + 1);
                }}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              <ContractPaymentAccountsSettings accountsOnly />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
