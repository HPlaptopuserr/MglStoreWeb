import { CheckCircle2 } from "lucide-react";
import type { CustomerDisplaySuccessDetails } from "../../types/customer-display.types";
import { formatMoney } from "../../utils/pos-display-format";

export function CustomerDisplaySuccess({
  success,
}: {
  success: CustomerDisplaySuccessDetails;
}) {
  const completed = success.saleCompleted !== false;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm sm:p-6">
      <section
        role="status"
        aria-live="polite"
        aria-label="Төлбөрийн үр дүн"
        className="m-auto w-full max-w-xl rounded-3xl border border-emerald-100 bg-white p-6 text-center shadow-2xl sm:p-8"
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2
            size={48}
            className="text-emerald-500"
            strokeWidth={2}
          />
        </div>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-600">
          {completed ? "Худалдан авалт бүртгэгдлээ" : "Төлбөр хүлээн авлаа"}
        </p>
        <h2 className="mt-2 break-words text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          {completed ? "Төлбөр амжилттай" : success.text}
        </h2>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-medium text-slate-500">Нийт дүн</p>
          <p className="mt-2 break-words text-4xl font-extrabold tracking-tight tabular-nums text-slate-900 sm:text-5xl">
            {formatMoney(success.amount)}
          </p>
        </div>
        {success.cash && (
          <dl className="mt-3 grid grid-cols-2 gap-3 text-left">
            <div className="rounded-xl border border-slate-200 px-4 py-3">
              <dt className="text-xs text-slate-500">Авсан бэлэн</dt>
              <dd className="mt-1 break-words text-xl font-bold tabular-nums text-slate-800">
                {formatMoney(success.cash.receivedAmount)}
              </dd>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <dt className="text-xs font-semibold text-emerald-700">
                Хариулт
              </dt>
              <dd className="mt-1 break-words text-xl font-extrabold tabular-nums text-emerald-700">
                {formatMoney(success.cash.changeAmount)}
              </dd>
            </div>
          </dl>
        )}
        <p className="mt-5 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-500">
          {completed
            ? "Баярлалаа. Дахин үйлчлүүлээрэй!"
            : "Кассчин үлдэгдэл төлбөр болон худалдан авалтыг баталгаажуулна."}
        </p>
      </section>
    </div>
  );
}
