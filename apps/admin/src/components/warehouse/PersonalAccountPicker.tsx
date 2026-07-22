import { Loader2, Search, UserCheck } from "lucide-react";
import type { PersonalAccount } from "./operator-registration.types";

interface PersonalAccountPickerProps {
  query: string;
  accounts: PersonalAccount[];
  isSearching: boolean;
  assigningUserId: string | null;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  onSelect: (account: PersonalAccount) => void;
}

export function PersonalAccountPicker({
  query,
  accounts,
  isSearching,
  assigningUserId,
  onQueryChange,
  onSearch,
  onSelect,
}: PersonalAccountPickerProps) {
  return (
    <div className="rounded-xl border border-[#5B4CFF]/20 bg-[#5B4CFF]/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <UserCheck className="h-4 w-4 text-[#5B4CFF]" />
        <p className="text-sm font-bold text-slate-800">
          MGL Store personal account-аас сонгох
        </p>
      </div>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSearch();
          }}
          placeholder="Нэр, имэйл эсвэл утас"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#5B4CFF]"
        />
        <button
          type="button"
          onClick={onSearch}
          disabled={query.trim().length < 2 || isSearching}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#5B4CFF] shadow-sm disabled:opacity-50"
        >
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Хайх
        </button>
      </div>
      {accounts.length > 0 && (
        <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center gap-3 rounded-lg bg-white p-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                {account.avatarUrl ? (
                  <img
                    src={account.avatarUrl}
                    alt={account.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  account.fullName.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {account.fullName}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {account.email}
                  {account.phoneNumber ? ` · ${account.phoneNumber}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSelect(account)}
                disabled={account.isAssigned || assigningUserId === account.id}
                className="rounded-lg bg-[#5B4CFF] px-3 py-2 text-xs font-semibold text-white disabled:bg-slate-200 disabled:text-slate-500"
              >
                {assigningUserId === account.id
                  ? "Оноож байна"
                  : account.isAssigned
                    ? "Оноогдсон"
                    : "Сонгох"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
