import { ChevronDown, Landmark } from "lucide-react";
import type { WarehouseInvestorBankAccount } from "@mgl/types";

export function InvestorBankAccountDetails({
  account,
  collapsible = false,
}: {
  account: WarehouseInvestorBankAccount | null;
  collapsible?: boolean;
}) {
  if (collapsible) {
    return (
      <details className="group mt-4 border-t border-slate-100 pt-1">
        <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-2 rounded-lg py-2 text-xs text-slate-600 focus-visible:ring-2 focus-visible:ring-blue-500 [&::-webkit-details-marker]:hidden">
          <Landmark className="size-4 shrink-0" aria-hidden="true" />
          <span className="font-medium">Ногдол ашиг авах данс</span>
          <span className={account ? "text-emerald-700" : "text-slate-500"}>
            {account
              ? `${account.bankName} · Баталгаажсан`
              : "Данс бүртгэгдээгүй"}
          </span>
          <ChevronDown
            className="ml-auto size-4 shrink-0 group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="mt-1">
          <InvestorBankAccountDetails account={account} />
        </div>
      </details>
    );
  }
  return (
    <section
      aria-label="Ногдол ашиг хүлээн авах данс"
      className="rounded-xl border border-blue-100 bg-blue-50/50 p-4"
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Landmark className="size-4 text-blue-600" aria-hidden="true" />
        Ногдол ашиг хүлээн авах данс
      </h3>
      {account ? (
        <>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-slate-500">Банк</dt>
              <dd className="mt-1 break-words font-medium">
                {account.bankName}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Дансны дугаар / IBAN</dt>
              <dd className="mt-1 select-all break-all font-mono font-semibold text-blue-800">
                {account.bankAccount}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Данс эзэмшигч</dt>
              <dd className="mt-1 break-words font-medium">
                {account.bankAccountName}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Verify.mn-ээр баталгаажуулсан ·{" "}
            {new Date(account.confirmedAt).toLocaleString("mn-MN", {
              timeZone: "Asia/Ulaanbaatar",
            })}
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Баталгаажуулсан данс бүртгэгдээгүй байна.
        </p>
      )}
    </section>
  );
}
