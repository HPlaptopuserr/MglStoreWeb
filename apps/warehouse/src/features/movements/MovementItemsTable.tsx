import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { REASON_MAP, type LedgerEntry } from "./movement-ledger.model";

const dateFormat = new Intl.DateTimeFormat("sv-SE");
const timeFormat = new Intl.DateTimeFormat("mn-MN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const numberFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});
const formatBalance = (value: number | null) =>
  value === null ? "—" : numberFormat.format(value);

function ChangeValue({ change }: { change: number }) {
  const Icon = change > 0 ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap font-semibold tabular-nums ${change > 0 ? "text-emerald-700" : change < 0 ? "text-red-600" : "text-slate-500"}`}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {change > 0 ? "+" : ""}
      {numberFormat.format(change)}
    </span>
  );
}

function ReasonBadge({ reason }: { reason: string }) {
  const metadata = REASON_MAP[reason] || {
    label: reason,
    color: "bg-slate-100 text-slate-700",
  };
  return (
    <span
      className={`inline-flex max-w-full rounded-md px-2 py-1 text-xs font-medium ${metadata.color}`}
    >
      {metadata.label}
    </span>
  );
}

function ProductIdentity({ entry }: { entry: LedgerEntry }) {
  return (
    <div className="min-w-0">
      <p className="break-words text-sm font-semibold text-slate-800">
        {entry.product.name}
      </p>
      <p className="mt-1 break-all text-xs text-slate-500">
        {entry.product.sku || "SKU байхгүй"}
        {entry.product.barcode ? ` · ${entry.product.barcode}` : ""}
      </p>
    </div>
  );
}

function EntryDate({ value }: { value: string }) {
  const date = new Date(value);
  return (
    <time
      dateTime={value}
      className="whitespace-nowrap text-xs tabular-nums text-slate-500"
    >
      {dateFormat.format(date)}
      <span className="mt-1 block text-slate-400">
        {timeFormat.format(date)}
      </span>
    </time>
  );
}

export function MovementItemsTable({ entries }: { entries: LedgerEntry[] }) {
  return (
    <div className="@container min-w-0 max-w-full">
      <div
        role="region"
        aria-label="Барааны хөдөлгөөний хүснэгт, хажуу тийш гүйлгэх боломжтой"
        tabIndex={0}
        className="hidden max-h-[65vh] max-w-full overflow-auto overscroll-x-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 @min-[900px]:block"
      >
        <table className="w-full min-w-[1180px] table-fixed text-sm">
          <caption className="sr-only">
            Бараа бүрийн үлдэгдлийн өөрчлөлт
          </caption>
          <colgroup>
            {[120, 210, 150, 180, 90, 100, 90, 160, 140].map((width, index) => (
              <col key={index} style={{ width }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
            <tr>
              {[
                "Огноо",
                "Бараа",
                "Төрөл",
                "Падааны дугаар",
                "Өмнөх",
                "Өөрчлөлт",
                "Дараах",
                "Тэмдэглэл",
                "Хэрэглэгч",
              ].map((label, index) => (
                <th
                  scope="col"
                  key={label}
                  className={`px-4 py-3 font-medium ${index >= 4 && index <= 6 ? "text-right" : "text-left"}`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="align-top transition-colors hover:bg-blue-50/40"
              >
                <td className="px-4 py-4">
                  <EntryDate value={entry.createdAt} />
                </td>
                <td className="px-4 py-4">
                  <ProductIdentity entry={entry} />
                </td>
                <td className="px-4 py-4">
                  <ReasonBadge reason={entry.reason} />
                </td>
                <td className="break-all px-4 py-4 text-xs font-medium leading-5 text-slate-600">
                  {entry.documentNumber || "—"}
                </td>
                <td className="px-4 py-4 text-right tabular-nums text-slate-500">
                  {formatBalance(entry.balanceBefore)}
                </td>
                <td className="px-4 py-4 text-right">
                  <ChangeValue change={entry.change} />
                </td>
                <td className="px-4 py-4 text-right font-semibold tabular-nums text-slate-800">
                  {formatBalance(entry.balanceAfter)}
                </td>
                <td className="px-4 py-4 text-xs leading-5 text-slate-500">
                  {entry.note ? (
                    <details>
                      <summary className="cursor-pointer rounded font-medium text-slate-600 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500">
                        Тэмдэглэл харах
                      </summary>
                      <p className="mt-2 break-words [overflow-wrap:anywhere]">
                        {entry.note}
                      </p>
                    </details>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="break-words px-4 py-4 text-xs leading-5 text-slate-500 [overflow-wrap:anywhere]">
                  {entry.createdBy?.name || entry.createdBy?.email || "Систем"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-slate-100 @min-[900px]:hidden">
        {entries.map((entry) => (
          <li key={entry.id} className="min-w-0 space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <ProductIdentity entry={entry} />
              <div className="shrink-0 text-right">
                <EntryDate value={entry.createdAt} />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <ReasonBadge reason={entry.reason} />
              <span className="break-all text-xs text-slate-500">
                {entry.documentNumber || "Падаан холбогдоогүй"}
              </span>
            </div>
            <dl className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 px-3 py-3 text-sm">
              <div>
                <dt className="mb-1 text-xs text-slate-500">Өмнөх</dt>
                <dd className="tabular-nums text-slate-700">
                  {formatBalance(entry.balanceBefore)}
                </dd>
              </div>
              <div className="text-center">
                <dt className="mb-1 text-xs text-slate-500">Өөрчлөлт</dt>
                <dd>
                  <ChangeValue change={entry.change} />
                </dd>
              </div>
              <div className="text-right">
                <dt className="mb-1 text-xs text-slate-500">Дараах</dt>
                <dd className="font-semibold tabular-nums text-slate-900">
                  {formatBalance(entry.balanceAfter)}
                </dd>
              </div>
            </dl>
            <details className="text-xs text-slate-500">
              <summary className="flex w-fit cursor-pointer items-center gap-1 rounded py-1 font-medium hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500">
                Нэмэлт мэдээлэл
                <ArrowRight aria-hidden="true" className="h-3 w-3" />
              </summary>
              <p className="mt-2 break-words leading-5 [overflow-wrap:anywhere]">
                {entry.note || "Тэмдэглэлгүй"}
              </p>
              <p className="mt-1 break-all">
                Бүртгэсэн:{" "}
                {entry.createdBy?.name || entry.createdBy?.email || "Систем"}
              </p>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
