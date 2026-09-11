"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  FileQuestion,
  Search,
  WalletCards,
} from "lucide-react";
import {
  REQUEST_STATUS_CONFIG,
  REQUEST_TONE_CLASS,
  type StockRequest,
} from "./stock-request.model";

type PaymentFilter = "ALL" | "PAID" | "PARTIAL" | "UNPAID" | "NOT_CREATED";

interface PaymentView {
  key: Exclude<PaymentFilter, "ALL">;
  label: string;
  className: string;
  total: number;
  paid: number;
  outstanding: number;
}

interface StockRequestOverviewProps {
  requests: StockRequest[];
  loadingRequestId: string | null;
  onSelect: (request: StockRequest) => void;
}

const PAGE_SIZE = 20;

function money(value: number) {
  return `${value.toLocaleString("mn-MN")} ₮`;
}

function paymentView(request: StockRequest): PaymentView {
  if (!request.payment) {
    return {
      key: "NOT_CREATED",
      label: "Нэхэмжлээгүй",
      className: "border-slate-200 bg-slate-50 text-slate-600",
      total: 0,
      paid: 0,
      outstanding: 0,
    };
  }

  const total = Number(request.payment.totalAmount) || 0;
  const paid = Number(request.payment.paidAmount) || 0;
  const outstanding = Math.max(0, total - paid);
  if (request.payment.status === "PAID" || (total > 0 && outstanding === 0)) {
    return {
      key: "PAID",
      label: "Бүрэн төлсөн",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      total,
      paid,
      outstanding,
    };
  }
  if (paid > 0) {
    return {
      key: "PARTIAL",
      label: "Дутуу төлсөн",
      className: "border-blue-200 bg-blue-50 text-blue-700",
      total,
      paid,
      outstanding,
    };
  }
  return {
    key: "UNPAID",
    label: "Төлөөгүй",
    className: "border-rose-200 bg-rose-50 text-rose-700",
    total,
    paid,
    outstanding,
  };
}

function contactPhone(request: StockRequest) {
  return (
    request.deliveryPhone ||
    request.organization.phone ||
    request.requestedBy?.profile?.phoneNumber ||
    null
  );
}

function unpaidPriority(request: StockRequest) {
  const dueDate = request.payment?.dueDate
    ? new Date(request.payment.dueDate).getTime()
    : new Date(request.requestedAt).getTime();
  return Number.isFinite(dueDate) ? dueDate : Number.MAX_SAFE_INTEGER;
}

function overdueDays(request: StockRequest) {
  if (!request.payment?.dueDate) return 0;
  const dueTime = new Date(request.payment.dueDate).getTime();
  if (!Number.isFinite(dueTime)) return 0;
  return Math.max(0, Math.floor((Date.now() - dueTime) / 86_400_000));
}

export function StockRequestOverview({
  requests,
  loadingRequestId,
  onSelect,
}: StockRequestOverviewProps) {
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("ALL");
  const [page, setPage] = useState(1);

  const rows = useMemo(
    () =>
      requests.map((request) => ({ request, payment: paymentView(request) })),
    [requests],
  );
  const summary = useMemo(
    () => ({
      total: rows.length,
      paid: rows.filter(({ payment }) => payment.key === "PAID").length,
      unpaid: rows.filter(({ payment }) => payment.key === "UNPAID").length,
      partial: rows.filter(({ payment }) => payment.key === "PARTIAL").length,
      notCreated: rows.filter(({ payment }) => payment.key === "NOT_CREATED")
        .length,
      outstanding: rows.reduce(
        (total, row) => total + row.payment.outstanding,
        0,
      ),
    }),
    [rows],
  );
  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("mn-MN");
    const matched = rows.filter(({ request, payment }) => {
      const matchesPayment =
        paymentFilter === "ALL" || payment.key === paymentFilter;
      const matchesSearch =
        !query ||
        request.requestNumber.toLocaleLowerCase("mn-MN").includes(query) ||
        request.organization.name.toLocaleLowerCase("mn-MN").includes(query) ||
        request.requestedBy?.profile?.fullName
          ?.toLocaleLowerCase("mn-MN")
          .includes(query) ||
        request.requestedBy?.email.toLocaleLowerCase("mn-MN").includes(query) ||
        contactPhone(request)
          ?.replace(/\s+/g, "")
          .includes(query.replace(/\s+/g, ""));
      return matchesPayment && Boolean(matchesSearch);
    });
    if (paymentFilter === "UNPAID" || paymentFilter === "PARTIAL") {
      matched.sort(
        (left, right) =>
          unpaidPriority(left.request) - unpaidPriority(right.request),
      );
    }
    return matched;
  }, [paymentFilter, rows, search]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const visibleRows = filteredRows.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  useEffect(() => setPage(1), [paymentFilter, search]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const filters: Array<{ key: PaymentFilter; label: string; count: number }> = [
    { key: "ALL", label: "Бүгд", count: summary.total },
    { key: "PAID", label: "Төлсөн", count: summary.paid },
    { key: "UNPAID", label: "Төлөөгүй", count: summary.unpaid },
    { key: "PARTIAL", label: "Дутуу", count: summary.partial },
    {
      key: "NOT_CREATED",
      label: "Нэхэмжлээгүй",
      count: summary.notCreated,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          {
            label: "Нийт хүсэлт",
            value: summary.total.toLocaleString("mn-MN"),
            icon: FileQuestion,
            tone: "bg-indigo-50 text-indigo-600",
          },
          {
            label: "Бүрэн төлсөн",
            value: summary.paid.toLocaleString("mn-MN"),
            icon: CircleDollarSign,
            tone: "bg-emerald-50 text-emerald-600",
          },
          {
            label: "Төлөөгүй / дутуу",
            value: (
              summary.unpaid +
              summary.partial +
              summary.notCreated
            ).toLocaleString("mn-MN"),
            icon: WalletCards,
            tone: "bg-rose-50 text-rose-600",
          },
          {
            label: "Авлагын үлдэгдэл",
            value: money(summary.outstanding),
            icon: Banknote,
            tone: "bg-amber-50 text-amber-600",
          },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div
            key={label}
            className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
          >
            <span className={`rounded-lg p-2 ${tone}`}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-lg font-black text-slate-900">
                {value}
              </span>
              <span className="block truncate text-[11px] font-semibold text-slate-500">
                {label}
              </span>
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block min-w-0 flex-1 lg:max-w-sm">
          <span className="sr-only">Хүсэлт хайх</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Дугаар, байгууллага, хэрэглэгч хайх..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <div className="flex gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1">
          {filters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setPaymentFilter(filter.key)}
              className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-bold transition ${
                paymentFilter === filter.key
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              {filter.label} {filter.count}
            </button>
          ))}
        </div>
      </div>

      {visibleRows.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-sm font-semibold text-slate-400">
          Хайлт, шүүлтүүрт тохирох хүсэлт алга
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Хүсэлт</th>
                  <th className="px-4 py-3">Захиалагч</th>
                  <th className="px-4 py-3">Огноо</th>
                  <th className="px-4 py-3">Хүсэлтийн төлөв</th>
                  <th className="px-4 py-3 text-right">Нийт дүн</th>
                  <th className="px-4 py-3 text-right">Төлсөн</th>
                  <th className="px-4 py-3">Төлбөр</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {visibleRows.map(({ request, payment }) => {
                  const status = REQUEST_STATUS_CONFIG[request.status];
                  const daysOverdue = overdueDays(request);
                  return (
                    <tr
                      key={request.id}
                      tabIndex={0}
                      onClick={() => onSelect(request)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onSelect(request);
                        }
                      }}
                      aria-busy={loadingRequestId === request.id}
                      className="cursor-pointer transition hover:bg-indigo-50/40 focus:bg-indigo-50 focus:outline-none"
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-black text-slate-900">
                          {request.requestNumber}
                        </p>
                        {loadingRequestId === request.id && (
                          <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600">
                            <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                            Нээж байна...
                          </span>
                        )}
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {request.items.length} төрлийн бараа
                        </p>
                      </td>
                      <td className="max-w-60 px-4 py-3">
                        <p className="truncate text-sm font-bold text-slate-800">
                          {request.organization.name}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-400">
                          {request.requestedBy?.profile?.fullName ||
                            request.requestedBy?.email ||
                            request.organization.email ||
                            "Хэрэглэгчийн нэргүй"}
                        </p>
                        <p className="mt-1 text-xs font-bold text-blue-700">
                          {contactPhone(request) || "Утас бүртгэлгүй"}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                        {new Date(request.requestedAt).toLocaleString("mn-MN", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${REQUEST_TONE_CLASS[status.tone]}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-bold text-slate-700">
                        {payment.total ? money(payment.total) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-bold text-emerald-700">
                        {payment.paid ? money(payment.paid) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-black ${payment.className}`}
                        >
                          {payment.label}
                        </span>
                        {payment.outstanding > 0 && (
                          <p className="mt-1 whitespace-nowrap text-[10px] font-semibold text-rose-600">
                            Үлдэгдэл {money(payment.outstanding)}
                          </p>
                        )}
                        {daysOverdue > 0 && payment.outstanding > 0 && (
                          <p className="mt-0.5 whitespace-nowrap text-[10px] font-black text-rose-700">
                            {daysOverdue} хоног хэтэрсэн
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-500">
              {filteredRows.length} хүсэлтийн {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, filteredRows.length)}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Өмнөх хуудас"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:text-indigo-600 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-16 text-center text-xs font-bold text-slate-600">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                aria-label="Дараагийн хуудас"
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={page === totalPages}
                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:text-indigo-600 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
