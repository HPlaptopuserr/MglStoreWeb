import type { PaymentSearchResponse } from "@mgl/types";

const currency = new Intl.NumberFormat("mn-MN", { maximumFractionDigits: 2 });
const dateTime = new Intl.DateTimeFormat("mn-MN", {
  timeZone: "Asia/Ulaanbaatar",
  dateStyle: "medium",
  timeStyle: "short",
});
const money = (amount: string) => `${currency.format(Number(amount))}₮`;

export function PaymentSearchResults({
  result,
  onPage,
}: {
  result: PaymentSearchResponse;
  onPage: (page: number) => void;
}) {
  const candidate = result.mode === "settlement";
  if (result.total === 0)
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
        <h2 className="font-semibold text-slate-900">
          Тохирох төлбөр олдсонгүй
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
          {candidate
            ? "Хаалтын огноо, шимтгэл, нэмэлт суутгалыг шалгана уу. Нэгтгэсэн хаалт болон POS төлбөрийг энэ хайлт хамрахгүй."
            : "Захиалгын дугаар эсвэл системд хадгалагдсан төлбөрийн лавлахыг шалгана уу. Банкны QR хаалтын утгад «Хаалтын дүн тулгах» төрлийг сонгоно уу."}
        </p>
      </div>
    );
  const pages = Math.ceil(result.total / result.pageSize);
  return (
    <section className="space-y-4" aria-label="Хайлтын үр дүн">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-slate-900">
          {result.total} төлбөр {candidate ? "тулгах боломжтой" : "олдлоо"}
        </h2>
        <span className="text-xs text-slate-500">
          {result.date && `${result.date} · `}Улаанбаатарын цагаар
        </span>
      </div>
      {result.data.map((payment) => (
        <article
          key={payment.id}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md motion-reduce:transition-none"
        >
          <div className="flex flex-col justify-between gap-3 sm:flex-row">
            <div>
              <p className="text-xs font-medium text-indigo-600">
                {payment.storeName}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">
                {payment.customerName}
              </h3>
              <a
                href={`tel:${payment.phone}`}
                className="text-sm text-indigo-700 underline decoration-indigo-200 underline-offset-4 hover:decoration-indigo-600"
              >
                {payment.phone}
              </a>
            </div>
            <div className="sm:text-right">
              <p className="text-xl font-bold tabular-nums text-slate-900">
                {money(payment.amount)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {payment.status === "PAID" ? "Төлөгдсөн" : payment.status} ·{" "}
                {payment.method}
              </p>
            </div>
          </div>
          <dl className="mt-4 grid gap-4 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Захиалгын дугаар</dt>
              <dd className="mt-1 break-all font-medium text-slate-900">
                {payment.orderNumber}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Төлбөрийн лавлах</dt>
              <dd className="mt-1 break-all font-mono text-xs text-slate-900">
                {payment.providerRef ?? "Бүртгэлгүй"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Төлсөн огноо</dt>
              <dd className="mt-1 text-slate-900">
                {payment.paidAt
                  ? dateTime.format(new Date(payment.paidAt))
                  : "Төлөгдөөгүй"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Захиалсан бараа</dt>
              <dd className="mt-1 text-slate-900">
                {payment.items
                  .map((item) => `${item.productName} × ${item.quantity}`)
                  .join(", ")}
              </dd>
            </div>
          </dl>
          {candidate && payment.expectedNet && (
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-900">
              Тооцоолсон цэвэр дүн:{" "}
              <strong>{money(payment.expectedNet)}</strong>. Огноо, дүн таарсан
              боломжит төлбөр. Minu хаалтын тайлангаар баталгаажуулна уу.
            </p>
          )}
        </article>
      ))}
      {pages > 1 && (
        <nav
          aria-label="Үр дүнгийн хуудас"
          className="flex items-center justify-center gap-4 text-sm"
        >
          <button
            disabled={result.page <= 1}
            onClick={() => onPage(result.page - 1)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 hover:bg-slate-50 disabled:opacity-40"
          >
            Өмнөх
          </button>
          <span>
            {result.page} / {pages}
          </span>
          <button
            disabled={result.page >= pages}
            onClick={() => onPage(result.page + 1)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 hover:bg-slate-50 disabled:opacity-40"
          >
            Дараах
          </button>
        </nav>
      )}
    </section>
  );
}
