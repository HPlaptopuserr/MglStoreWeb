import type { RegisteredCreditBorrower } from "@mgl/types";
import type { RegisteredBorrowerLookupState } from "@/lib/registered-credit-borrower-state";
import { registeredBorrowerPhone } from "@/lib/registered-credit-borrower-state";

interface Props {
  phone: string;
  onPhoneChange?: (phone: string) => void;
  onLookup: () => void;
  onSelect: () => void;
  state: RegisteredBorrowerLookupState;
  user: RegisteredCreditBorrower | null;
  disabled?: boolean;
}

export function RegisteredCreditUserLookup({
  phone,
  onPhoneChange,
  onLookup,
  onSelect,
  state,
  user,
  disabled = false,
}: Props) {
  return (
    <section
      className="rounded-xl border border-amber-300/25 bg-amber-300/5 p-3"
      aria-busy={state.status === "loading"}
    >
      <p className="text-xs font-bold text-amber-200">
        MGL-д бүртгэлтэй хэрэглэгч шаардлагатай
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1 text-xs font-semibold text-slate-300">
          <span>MGL-д бүртгэлтэй утас</span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            readOnly={!onPhoneChange}
            disabled={disabled}
            onChange={(event) => onPhoneChange?.(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-lg border border-white/15 bg-[#122131] px-3 text-sm text-white outline-none focus:border-sky-300 disabled:opacity-60"
          />
        </label>
        <button
          type="button"
          onClick={onLookup}
          disabled={
            disabled ||
            state.status === "loading" ||
            !registeredBorrowerPhone(phone)
          }
          className="min-h-11 rounded-lg border border-amber-300 px-3 text-xs font-bold text-amber-200 transition hover:bg-amber-300/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {state.status === "loading" ? "Хайж байна…" : "Утсаар хайх"}
        </button>
      </div>
      {state.status === "loading" && (
        <p role="status" className="mt-2 text-xs text-slate-300">
          MGL хэрэглэгчийн мэдээллийг татаж байна…
        </p>
      )}
      {state.status === "error" && (
        <p role="alert" className="mt-2 text-xs text-rose-200">
          {state.message}
        </p>
      )}
      {state.status === "empty" && (
        <p role="status" className="mt-2 text-xs text-amber-200">
          Идэвхтэй MGL хэрэглэгч олдсонгүй. Эхлээд MGL-д бүртгүүлж, мэдээллээ
          гүйцээсний дараа дахин шалгана уу.
        </p>
      )}
      {state.status === "found" && (
        <div className="mt-3 rounded-lg border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">
          <p role="status" className="text-xs font-bold">
            MGL хэрэглэгч олдлоо. Зээл авах хүнийг сонгоно уу.
          </p>
          <p className="mt-2 font-bold">{state.user.fullName}</p>
          <p className="mt-1 text-xs">
            {state.user.phoneNumber}
            {state.user.email ? ` • ${state.user.email}` : ""}
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={onSelect}
            className="mt-3 min-h-11 rounded-lg bg-sky-300 px-5 py-2 text-xs font-bold text-slate-950 transition hover:bg-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-100 disabled:opacity-50"
          >
            Сонгох
          </button>
        </div>
      )}
      {user && (
        <div
          role="status"
          className="mt-3 rounded-lg border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm text-emerald-100"
        >
          <p className="font-bold">Сонгосон MGL хэрэглэгч · {user.fullName}</p>
          <p className="mt-1 text-xs">
            {user.phoneNumber}
            {user.email ? ` • ${user.email}` : ""}
          </p>
        </div>
      )}
    </section>
  );
}
