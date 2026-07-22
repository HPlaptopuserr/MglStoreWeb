"use client";

import { useState } from "react";
import { CheckCircle2, Copy, X } from "lucide-react";
import { API, adminFetch, getApiErrorMessage } from "@/lib/api";
import { NewOperatorForm } from "./NewOperatorForm";
import { PersonalAccountPicker } from "./PersonalAccountPicker";
import type {
  PersonalAccount,
  RegistrationResponse,
  RegistrationResult,
} from "./operator-registration.types";

type WarehouseOperatorRegistrationModalProps = {
  warehouseId: string;
  warehouseName: string;
  onClose: () => void;
  onRegistered: () => Promise<void> | void;
};

export function WarehouseOperatorRegistrationModal({
  warehouseId,
  warehouseName,
  onClose,
  onRegistered,
}: WarehouseOperatorRegistrationModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [accountSearch, setAccountSearch] = useState("");
  const [accounts, setAccounts] = useState<PersonalAccount[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);

  const canSubmit = fullName.trim() && email.trim() && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError("");
    try {
      const response = await adminFetch(`${API}/warehouse-setup/register`, {
        method: "POST",
        body: JSON.stringify({
          warehouseId,
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phoneNumber: phoneNumber.trim() || undefined,
        }),
      });
      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(response, "Ажилтан бүртгэж чадсангүй"),
        );
      }
      const payload = (await response.json()) as RegistrationResponse;
      if (!payload.success || !payload.data) {
        throw new Error(payload.message || "Ажилтан бүртгэж чадсангүй");
      }
      setResult(payload.data);
      await onRegistered();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Ажилтан бүртгэж чадсангүй",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const searchAccounts = async () => {
    if (accountSearch.trim().length < 2) return;
    setIsSearching(true);
    setError("");
    try {
      const params = new URLSearchParams({
        search: accountSearch.trim(),
        warehouseId,
      });
      const response = await adminFetch(
        `${API}/warehouse-setup/personal-accounts?${params}`,
      );
      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(response, "Personal account хайж чадсангүй"),
        );
      }
      setAccounts((await response.json()) as PersonalAccount[]);
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Personal account хайж чадсангүй",
      );
    } finally {
      setIsSearching(false);
    }
  };

  const assignAccount = async (account: PersonalAccount) => {
    if (account.isAssigned) return;
    setAssigningUserId(account.id);
    setError("");
    try {
      const response = await adminFetch(
        `${API}/warehouse-setup/assign-personal-account`,
        {
          method: "POST",
          body: JSON.stringify({ userId: account.id, warehouseId }),
        },
      );
      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(
            response,
            "Personal account оноож чадсангүй",
          ),
        );
      }
      const payload = (await response.json()) as RegistrationResponse;
      if (!payload.success || !payload.data) {
        throw new Error(payload.message || "Personal account оноож чадсангүй");
      }
      setResult(payload.data);
      await onRegistered();
    } catch (assignError) {
      setError(
        assignError instanceof Error
          ? assignError.message
          : "Personal account оноож чадсангүй",
      );
    } finally {
      setAssigningUserId(null);
    }
  };

  const copySetupLink = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.setupLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="warehouse-operator-modal-title"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2
              id="warehouse-operator-modal-title"
              className="text-lg font-bold text-slate-900"
            >
              {result ? "Ажилтан бүртгэгдлээ" : "Хариуцсан ажилтан нэмэх"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{warehouseName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Хаах"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {result ? (
          <div className="space-y-5 p-6">
            <div className="flex gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-800">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Бүртгэл амжилттай</p>
                <p className="mt-1 text-sm">
                  {result.setupLink
                    ? "Нууц үг тохируулах линкийг ажилтанд илгээнэ үү."
                    : "Personal account одоо байгаа нууц үгээрээ WMS-д нэвтэрнэ."}
                </p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
              <div>
                <dt className="text-slate-500">Оператор ID</dt>
                <dd className="mt-1 font-mono font-bold text-[#5B4CFF]">
                  {result.operatorId}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Имэйл</dt>
                <dd className="mt-1 truncate font-medium text-slate-800">
                  {result.email}
                </dd>
              </div>
            </dl>
            {result.setupLink && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Нууц үг тохируулах линк
                </label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={result.setupLink}
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600"
                  />
                  <button
                    type="button"
                    onClick={copySetupLink}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#5B4CFF] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4b3ee8]"
                  >
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copied ? "Хуулсан" : "Хуулах"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-amber-600">
                  Линк 5 минутын хугацаатай.
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              Хаах
            </button>
          </div>
        ) : (
          <div className="space-y-4 p-6">
            {error && (
              <div
                role="alert"
                className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}
            <PersonalAccountPicker
              query={accountSearch}
              accounts={accounts}
              isSearching={isSearching}
              assigningUserId={assigningUserId}
              onQueryChange={setAccountSearch}
              onSearch={() => void searchAccounts()}
              onSelect={(account) => void assignAccount(account)}
            />
            <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              эсвэл шинэ ажилтан
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <NewOperatorForm
              fullName={fullName}
              email={email}
              phoneNumber={phoneNumber}
              canSubmit={Boolean(canSubmit)}
              isSubmitting={isSubmitting}
              onFullNameChange={setFullName}
              onEmailChange={setEmail}
              onPhoneNumberChange={setPhoneNumber}
              onCancel={onClose}
              onSubmit={() => void handleSubmit()}
            />
          </div>
        )}
      </div>
    </div>
  );
}
