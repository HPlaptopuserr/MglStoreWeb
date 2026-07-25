import { Plus, Trash2 } from "lucide-react";
import type { BankAccount } from "./types";
import { BANK_OPTIONS } from "./constants";

type BankAccountsEditorProps = {
  savedAccounts: BankAccount[];
  editingAccounts: BankAccount[];
  confirmNumbers: string[];
  isEditing: boolean;
  isSubmitting: boolean;
  managedBySystem?: boolean;
  onStartEditing: () => void;
  onAccountsChange: (accounts: BankAccount[]) => void;
  onConfirmNumbersChange: (numbers: string[]) => void;
  onSave: () => void;
  onCancel: () => void;
};

export function BankAccountsEditor({
  savedAccounts,
  editingAccounts,
  confirmNumbers,
  isEditing,
  isSubmitting,
  managedBySystem = false,
  onStartEditing,
  onAccountsChange,
  onConfirmNumbersChange,
  onSave,
  onCancel,
}: BankAccountsEditorProps) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-slate-800 text-sm">Банкны данс</p>
        {!isEditing && (
          <button
            onClick={onStartEditing}
            className="text-xs text-[#5B4CFF] hover:underline font-medium"
          >
            {savedAccounts.length > 0 ? "Засах" : "+ Данс нэмэх"}
          </button>
        )}
      </div>

      {!isEditing && savedAccounts.length === 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          {managedBySystem
            ? "Minu merchantCode-д холбогдсон дансны мэдээлэл хадгалагдаагүй байна. Дансаа нэмээд дараа харах боломжтой."
            : "Банкны данс бүртгэгдээгүй байна. QPay QR үүсгэхийн тулд данс нэмнэ үү."}
        </div>
      )}

      {!isEditing && savedAccounts.length > 0 && (
        <div className="space-y-2">
          {savedAccounts.map((account, index) => {
            const bank = BANK_OPTIONS.find((option) => option.code === account.account_bank_code);
            return (
              <div key={index} className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2">
                <span className="font-medium">{bank?.name || account.account_bank_code}</span>
                <span className="text-slate-400">·</span>
                <span className="font-mono">{account.account_number}</span>
                <span className="text-slate-400">·</span>
                <span>{account.account_name}</span>
                {account.is_default && (
                  <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    Үндсэн
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isEditing && (
        <div className="space-y-3">
          {editingAccounts.map((account, index) => {
            const confirmValue = confirmNumbers[index] ?? "";
            const mismatch = confirmValue.length > 0 && confirmValue !== account.account_number;
            return (
              <div key={index} className="rounded-lg border border-slate-200 p-3 space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-500">Данс {index + 1}</span>
                  {editingAccounts.length > 1 && (
                    <button
                      onClick={() => {
                        onAccountsChange(editingAccounts.filter((_, itemIndex) => itemIndex !== index));
                        onConfirmNumbersChange(confirmNumbers.filter((_, itemIndex) => itemIndex !== index));
                      }}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <select
                  value={account.account_bank_code}
                  onChange={(event) => onAccountsChange(editingAccounts.map((item, itemIndex) => itemIndex === index ? { ...item, account_bank_code: event.target.value } : item))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4CFF]/30"
                >
                  {BANK_OPTIONS.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}
                </select>
                <input
                  placeholder="Дансны дугаар"
                  value={account.account_number}
                  onChange={(event) => {
                    onAccountsChange(editingAccounts.map((item, itemIndex) => itemIndex === index ? { ...item, account_number: event.target.value } : item));
                    const nextConfirmNumbers = [...confirmNumbers];
                    nextConfirmNumbers[index] = "";
                    onConfirmNumbersChange(nextConfirmNumbers);
                  }}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4CFF]/30"
                />
                <input
                  placeholder="Дансны дугаар давтан оруулах (баталгаажуулах)"
                  value={confirmValue}
                  onChange={(event) => {
                    const nextConfirmNumbers = [...confirmNumbers];
                    nextConfirmNumbers[index] = event.target.value;
                    onConfirmNumbersChange(nextConfirmNumbers);
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${mismatch ? "border-red-400 focus:ring-red-200" : confirmValue && !mismatch ? "border-emerald-400 focus:ring-emerald-200" : "border-slate-200 focus:ring-[#5B4CFF]/30"}`}
                />
                {mismatch && <p className="text-xs text-red-500">Дансны дугаар таарахгүй байна</p>}
                {confirmValue && !mismatch && <p className="text-xs text-emerald-600">✓ Дансны дугаар таарч байна</p>}
                <input
                  placeholder="Дансны нэр (эзэмшигч)"
                  value={account.account_name}
                  onChange={(event) => onAccountsChange(editingAccounts.map((item, itemIndex) => itemIndex === index ? { ...item, account_name: event.target.value } : item))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4CFF]/30"
                />
              </div>
            );
          })}

          <button
            onClick={() => {
              onAccountsChange([...editingAccounts, { account_bank_code: "050000", account_number: "", account_name: "", is_default: false }]);
              onConfirmNumbersChange([...confirmNumbers, ""]);
            }}
            className="flex items-center gap-1 text-xs text-[#5B4CFF] hover:underline"
          >
            <Plus className="h-3 w-3" /> Данс нэмэх
          </button>

          <div className="flex gap-2 pt-1">
            <button
              onClick={onSave}
              disabled={isSubmitting}
              className="flex-1 py-2 rounded-lg bg-[#5B4CFF] text-white text-sm font-semibold disabled:opacity-50"
            >
              {isSubmitting ? "Хадгалж байна..." : "Хадгалах"}
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold"
            >
              Болих
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
