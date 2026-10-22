import { PaymentSearchWorkspace } from "@/features/payment-search/PaymentSearchWorkspace";

export default function PaymentsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
          Онлайн захиалга
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Төлбөр хайх
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Гүйлгээний мэдээллээр захиалагч болон дэлгүүрийг олох.
        </p>
      </header>
      <PaymentSearchWorkspace />
    </div>
  );
}
