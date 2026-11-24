import { CheckCircle2 } from "lucide-react";

type CreditBorrowerConnectionProps = {
  borrowerUserId: string | null;
  phone: string | null;
  fallback: string | null;
  canLink: boolean;
  disabled: boolean;
  onLink: () => void;
};

export function CreditBorrowerConnection({
  borrowerUserId,
  phone,
  fallback,
  canLink,
  disabled,
  onLink,
}: CreditBorrowerConnectionProps) {
  const linked = Boolean(borrowerUserId);
  return (
    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
      <span className={linked ? "text-emerald-700" : "text-slate-500"}>
        {phone || fallback || "-"}
      </span>
      {linked ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 font-bold text-emerald-800">
          <CheckCircle2 size={13} aria-hidden="true" />
          MGL холбогдсон
        </span>
      ) : canLink ? (
        <button
          type="button"
          disabled={disabled}
          onKeyDown={event => event.stopPropagation()}
          onClick={event => { event.stopPropagation(); onLink(); }}
          className="min-h-8 rounded-lg border border-blue-200 bg-white px-2 py-1 font-bold text-blue-700 transition hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Дугаар · MGL бүртгэлд холбох
        </button>
      ) : null}
    </div>
  );
}
