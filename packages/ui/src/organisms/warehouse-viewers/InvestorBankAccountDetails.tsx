import { Landmark } from "lucide-react";
import type { WarehouseInvestorBankAccount } from "@mgl/types";

export function InvestorBankAccountDetails({
  account,
}: {
  account: WarehouseInvestorBankAccount | null;
}) {
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
          <dl className="mt-3 space-y-3 text-sm">
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
