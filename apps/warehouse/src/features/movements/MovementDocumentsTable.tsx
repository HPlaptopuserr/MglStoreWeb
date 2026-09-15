import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  FileText,
} from "lucide-react";
import type { MovementDocument } from "./movement-document.model";

const numberFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});
const dateFormat = new Intl.DateTimeFormat("sv-SE");
export function documentTotals(document: MovementDocument) {
  return document.items.reduce(
    (total, item) => ({
      quantity: total.quantity + item.quantity,
      amount: total.amount + item.quantity * item.unitPrice,
    }),
    { quantity: 0, amount: 0 },
  );
}

function DirectionBadge({
  direction,
}: {
  direction: MovementDocument["direction"];
}) {
  const incoming = direction === "IN";
  const Icon = incoming ? ArrowDownLeft : ArrowUpRight;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${incoming ? "bg-emerald-50 text-emerald-700 ring-emerald-600/10" : "bg-orange-50 text-orange-700 ring-orange-600/10"}`}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {incoming ? "Орлого" : "Зарлага"}
    </span>
  );
}

function DocumentIdentity({
  document,
  onOpen,
}: {
  document: MovementDocument;
  onOpen: () => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden="true"
        className="hidden rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-400 xl:block"
      >
        <FileText className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <button
          type="button"
          onClick={onOpen}
          className="break-all text-left text-sm font-semibold text-slate-800 decoration-blue-300 underline-offset-4 hover:text-blue-700 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {document.number}
        </button>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {document.relatedNumber ||
            (document.direction === "IN"
              ? "Орлогын баримт"
              : "Зарлагын баримт")}
        </p>
      </div>
    </div>
  );
}

export function MovementDocumentsTable({
  documents,
  onSelect,
}: {
  documents: MovementDocument[];
  onSelect: (document: MovementDocument) => void;
}) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Агуулахын падааны хөдөлгөөн, сүүлийн огноогоор эрэмбэлсэн
          </caption>
          <thead className="border-y border-slate-200 bg-slate-50/80 text-xs text-slate-500">
            <tr>
              {[
                "Падааны дугаар",
                "Хөдөлгөөн",
                "Харилцагч",
                "Тоо хэмжээ",
                "Нийт дүн",
                "Огноо",
              ].map((label, index) => (
                <th
                  key={label}
                  scope="col"
                  className={`whitespace-nowrap px-5 py-3 font-medium ${index === 3 || index === 4 ? "text-right" : "text-left"}`}
                >
                  {label}
                </th>
              ))}
              <th scope="col" className="w-12">
                <span className="sr-only">Дэлгэрэнгүй</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {documents.map((document) => {
              const totals = documentTotals(document);
              return (
                <tr
                  key={`${document.documentType}-${document.id}`}
                  className="group transition-colors hover:bg-blue-50/40 focus-within:bg-blue-50/40"
                >
                  <td className="min-w-56 px-5 py-4">
                    <DocumentIdentity
                      document={document}
                      onOpen={() => onSelect(document)}
                    />
                  </td>
                  <td className="px-5 py-4">
                    <DirectionBadge direction={document.direction} />
                  </td>
                  <td className="max-w-56 px-5 py-4">
                    <p
                      className="truncate text-slate-700"
                      title={document.partyName}
                    >
                      {document.partyName || "—"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {document.direction === "IN"
                        ? "Нийлүүлэгч"
                        : "Хүлээн авагч"}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums text-slate-600">
                    {numberFormat.format(totals.quantity)}{" "}
                    <span className="text-xs text-slate-400">ш</span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-right font-semibold tabular-nums text-slate-900">
                    {numberFormat.format(totals.amount)}{" "}
                    <span className="font-normal text-slate-400">₮</span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs tabular-nums text-slate-500">
                    <time dateTime={document.occurredAt}>
                      {dateFormat.format(new Date(document.occurredAt))}
                    </time>
                  </td>
                  <td className="pr-4">
                    <button
                      type="button"
                      onClick={() => onSelect(document)}
                      aria-label={`${document.number} падаан харах`}
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-blue-100 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-slate-100 border-t border-slate-200 md:hidden">
        {documents.map((document) => {
          const totals = documentTotals(document);
          return (
            <li
              key={`${document.documentType}-${document.id}`}
              className="space-y-3 p-4 transition-colors hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-3">
                <DocumentIdentity
                  document={document}
                  onOpen={() => onSelect(document)}
                />
                <DirectionBadge direction={document.direction} />
              </div>
              <div className="flex justify-between gap-3 text-xs text-slate-500">
                <span className="truncate">{document.partyName || "—"}</span>
                <time className="shrink-0" dateTime={document.occurredAt}>
                  {dateFormat.format(new Date(document.occurredAt))}
                </time>
              </div>
              <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-3">
                <span className="text-xs text-slate-500">
                  {numberFormat.format(totals.quantity)} ш ·{" "}
                  {document.items.length} төрлийн бараа
                </span>
                <span className="text-sm font-semibold tabular-nums text-slate-900">
                  {numberFormat.format(totals.amount)} ₮
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
