import { AlertCircle, Check } from "lucide-react";
import type { BankAccount, MinuAgentStatus } from "./types";
import { BANK_OPTIONS, merchantInputClass } from "./constants";
import { Field } from "./shared";

type MinuTerminalMerchantCardProps = {
  status: MinuAgentStatus | null;
  bankAccounts?: BankAccount[];
  username: string;
  password: string;
  branchId: string;
  isSubmitting: boolean;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onBranchIdChange: (value: string) => void;
  onConnect: () => void;
  onDisconnect: () => void;
};

export function MinuTerminalMerchantCard({
  status,
  bankAccounts = [],
  username,
  password,
  branchId,
  isSubmitting,
  onUsernameChange,
  onPasswordChange,
  onBranchIdChange,
  onConnect,
  onDisconnect,
}: MinuTerminalMerchantCardProps) {
  const visibleBankAccounts = bankAccounts.filter(
    (account) => account.account_number || account.account_name || account.account_bank_code,
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-900">Minu POS terminal merchant</p>
          <p className="mt-1 text-sm text-slate-500">
            Картын terminal төлбөр тухайн дэлгүүрийн Minu merchant дээр бүртгэлтэй данс руу орно.
          </p>
        </div>
        {status?.isConnected ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            <Check className="h-3.5 w-3.5" />
            Холбогдсон
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
            <AlertCircle className="h-3.5 w-3.5" />
            Холбоогүй
          </span>
        )}
      </div>

      {status?.isConnected && (
        <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Username: <span className="font-mono font-bold">{status.username}</span>
          <span className="mx-2 text-emerald-500">·</span>
          Branch ID: <span className="font-mono font-bold">{status.branchId}</span>
          {status.connectedAt && (
            <span className="ml-2 text-xs text-emerald-600">
              {new Date(status.connectedAt).toLocaleDateString("mn-MN")}
            </span>
          )}
        </div>
      )}

      {status?.isConnected && visibleBankAccounts.length > 0 && (
        <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
          <p className="text-xs font-semibold text-emerald-700">Холбогдсон банкны данс</p>
          <div className="mt-2 space-y-2">
            {visibleBankAccounts.map((account, index) => {
              const bank = BANK_OPTIONS.find((option) => option.code === account.account_bank_code);
              return (
                <div key={`${account.account_bank_code}-${account.account_number}-${index}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-emerald-800">
                  <span className="font-medium">{bank?.name || account.account_bank_code || "Банк"}</span>
                  {account.account_number && (
                    <>
                      <span className="text-emerald-500">·</span>
                      <span className="font-mono font-bold">{account.account_number}</span>
                    </>
                  )}
                  {account.account_name && (
                    <>
                      <span className="text-emerald-500">·</span>
                      <span>{account.account_name}</span>
                    </>
                  )}
                  {account.is_default && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      Үндсэн
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {status?.isConnected && visibleBankAccounts.length === 0 && (
        <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Дансны мэдээлэл хадгалагдаагүй байна.
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Minu username">
          <input
            type="text"
            value={username}
            onChange={(event) => onUsernameChange(event.target.value)}
            placeholder="Merchant username"
            className={merchantInputClass}
          />
        </Field>
        <Field label="Minu branchId">
          <input
            type="text"
            value={branchId}
            onChange={(event) => onBranchIdChange(event.target.value)}
            placeholder="Branch ID"
            className={merchantInputClass}
          />
        </Field>
        <Field label="Minu password">
          <input
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder={status?.passwordSet ? "Хадгалагдсан. Солих бол шинээр бичнэ." : "Merchant password"}
            className={merchantInputClass}
          />
        </Field>
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={onConnect}
            disabled={isSubmitting || !username.trim() || !branchId.trim()}
            className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            {status?.isConnected ? "Minu тохиргоо шинэчлэх" : "Minu холбох"}
          </button>
          {status?.isConnected && (
            <button
              type="button"
              onClick={onDisconnect}
              disabled={isSubmitting}
              className="rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
            >
              Салгах
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
