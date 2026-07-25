import { useMemo, useState } from "react";
import {
  Download,
  FileText,
  History,
  LayoutGrid,
  Loader2,
  ShoppingBag,
  Sparkles,
  BadgeCheck,
  CalendarClock,
  CreditCard,
  ExternalLink,
  ReceiptText,
} from "lucide-react";
import { AccountSectionToggle } from "./AccountSectionToggle";
import type {
  AccountContract,
  AccountPurchase,
  AccountTransaction,
  MPointHistory,
} from "./types";

function sourceLabel(sourceType: AccountPurchase["sourceType"]) {
  if (sourceType === "FRANCHISE") return "Franchise";
  if (sourceType === "SERVICE") return "Үйлчилгээ";
  if (sourceType === "POS_SALE") return "POS";
  return "Төсөл";
}

function sourcePaymentLabel(sourceType: AccountPurchase["sourceType"]) {
  if (sourceType === "FRANCHISE") return "Franchise access";
  if (sourceType === "SERVICE") return "Үйлчилгээний access";
  if (sourceType === "POS_SALE") return "POS худалдан авалт";
  return "Төслийн материал";
}

function formatMnt(value: number) {
  return `₮${Number(value || 0).toLocaleString("mn-MN")}`;
}

function fileDownloadName(title: string, fallback?: string | null) {
  if (fallback?.trim()) return fallback.trim();
  return `${title.trim().replace(/[\\/:*?"<>|]+/g, "-") || "mglstore-file"}.pdf`;
}

const TRANSACTION_STATUS_LABEL: Record<string, string> = {
  PENDING: "Хүлээгдэж байна",
  PAID: "Төлөгдсөн",
  FAILED: "Амжилтгүй",
  REFUNDED: "Буцаалт",
  CANCELLED: "Цуцлагдсан",
};

const TRANSACTION_METHOD_LABEL: Record<string, string> = {
  CASH: "Бэлэн",
  CARD: "Карт",
  BANK_TRANSFER: "Данс",
  ONLINE: "Online",
  POS: "POS",
  QPAY: "QPay",
};

type TransactionFilter = "all" | "orders" | "access" | "paid" | "pending";

const TRANSACTION_FILTERS: Array<{
  label: string;
  value: TransactionFilter;
}> = [
  { label: "Бүгд", value: "all" },
  { label: "Захиалга", value: "orders" },
  { label: "Access", value: "access" },
  { label: "Төлөгдсөн", value: "paid" },
  { label: "Хүлээгдэж буй", value: "pending" },
];

function transactionTypeLabel(type: AccountTransaction["type"]) {
  if (type === "ACCESS_PURCHASE") return "Access";
  if (type === "ORDER_PAYMENT") return "Захиалга";
  return "Захиалга";
}

function transactionStatusClass(status: string) {
  if (status === "PAID") return "bg-emerald-50 text-emerald-700";
  if (status === "PENDING") return "bg-amber-50 text-amber-700";
  if (status === "REFUNDED") return "bg-sky-50 text-sky-700";
  return "bg-slate-100 text-slate-600";
}

function PurchasePaymentSummary({ purchase }: { purchase: AccountPurchase }) {
  return (
    <div className="mt-3 rounded-2xl border border-orange-100 bg-white/75 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-xs font-black text-slate-600">
          <ReceiptText size={14} className="text-orange-500" />
          Юунд төлсөн
        </span>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">
          Баталгаажсан
        </span>
      </div>
      <div className="space-y-1.5 text-xs font-bold">
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500">
            {sourcePaymentLabel(purchase.sourceType)}
          </span>
          <span className="text-slate-950">{formatMnt(purchase.amount)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-slate-500">
            <CreditCard size={13} />
            Төлбөрийн хэсэг
          </span>
          <span className="text-slate-950">QPay / Online</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500">M point</span>
          <span className="text-emerald-600">2% нэмэгдсэн</span>
        </div>
        {purchase.invoiceId && (
          <p className="truncate pt-1 text-[11px] font-semibold text-slate-400">
            Invoice: {purchase.invoiceId}
          </p>
        )}
      </div>
    </div>
  );
}

export function AccountLibraryPanel({
  purchases,
  contracts,
  history,
  loading,
  onOpenChange,
  open,
  transactions,
}: {
  purchases: AccountPurchase[];
  contracts: AccountContract[];
  history: MPointHistory[];
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  transactions: AccountTransaction[];
}) {
  const hasLibraryItems = purchases.length > 0 || contracts.length > 0;
  const [transactionFilter, setTransactionFilter] =
    useState<TransactionFilter>("all");
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [pointsOpen, setPointsOpen] = useState(false);
  const [transactionsOpen, setTransactionsOpen] = useState(false);
  const filteredTransactions = useMemo(() => {
    if (transactionFilter === "orders") {
      return transactions.filter((item) => item.type !== "ACCESS_PURCHASE");
    }
    if (transactionFilter === "access") {
      return transactions.filter((item) => item.type === "ACCESS_PURCHASE");
    }
    if (transactionFilter === "paid") {
      return transactions.filter((item) => item.status === "PAID");
    }
    if (transactionFilter === "pending") {
      return transactions.filter((item) => item.status === "PENDING");
    }
    return transactions;
  }, [transactionFilter, transactions]);
  const visibleTransactions = showAllTransactions
    ? filteredTransactions
    : filteredTransactions.slice(0, 3);
  const hasHiddenTransactions = filteredTransactions.length > 3;

  return (
    <section className="rounded-[22px] border border-orange-100 bg-white p-3 shadow-[0_12px_34px_rgba(15,23,42,0.07)] sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 ring-1 ring-orange-100">
            <LayoutGrid size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-black text-slate-950">
              Сан ба гүйлгээ
            </h2>
            <p className="mt-0.5 truncate text-xs font-bold text-slate-400">
              Файл, оноо болон төлбөрийн мэдээлэл
            </p>
          </div>
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">
          Account
        </span>
      </div>

      <div className="space-y-2">
        <div
          className={`rounded-2xl border p-3 transition ${
            open
              ? "border-orange-100 bg-white shadow-sm"
              : "border-slate-100 bg-slate-50"
          }`}
        >
          <AccountSectionToggle
            badge={`${purchases.length + contracts.length} access`}
            controls="account-purchased-library"
            eyebrow="Purchased files"
            icon={ShoppingBag}
            open={open}
            subtitle="Төлбөр баталгаажсан PDF болон digital access энд хадгалагдана."
            title="Худалдан авсан файл, төсөл, franchise"
            onToggle={() => onOpenChange(!open)}
          />

          {open ? (
            <div id="account-purchased-library" className="mt-5">
              {loading ? (
                <div className="flex min-h-60 items-center justify-center rounded-2xl bg-slate-50">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                </div>
              ) : !hasLibraryItems ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-sm">
                    <ShoppingBag size={32} />
                  </div>
                  <h3 className="mt-5 text-lg font-black text-slate-900">
                    Одоогоор худалдан авсан файл алга
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">
                    Төсөл эсвэл franchise худалдан авмагц файл нь автоматаар энэ
                    хэсэгт хадгалагдаж, дахин QR төлөхгүйгээр нээгдэнэ.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {contracts.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="flex items-center gap-2 text-base font-black text-slate-950">
                          <BadgeCheck size={18} className="text-emerald-500" />
                          Миний гэрээнүүд
                        </h3>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                          {contracts.length} гэрээ
                        </span>
                      </div>
                      <div className="grid gap-3">
                        {contracts.map((contract) => {
                          const openUrl = contract.pdfUrl || contract.printUrl;
                          return (
                            <article
                              key={contract.id}
                              className="group grid gap-4 rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/70 p-4 transition hover:border-emerald-300 hover:shadow-lg sm:grid-cols-[auto_1fr_auto] sm:items-center"
                            >
                              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm shadow-emerald-200">
                                <FileText size={24} />
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">
                                    {contract.status === "SIGNED"
                                      ? "Баталгаажсан"
                                      : "Хүлээгдэж буй"}
                                  </span>
                                  {contract.feePlanLabel && (
                                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-700">
                                      {contract.feePlanLabel}
                                    </span>
                                  )}
                                </div>
                                <h3 className="mt-2 line-clamp-1 text-base font-black text-slate-950">
                                  {contract.title}
                                </h3>
                                <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-500">
                                  {contract.org}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold text-slate-400">
                                  <span>
                                    Үүссэн:{" "}
                                    {new Date(
                                      contract.createdAt,
                                    ).toLocaleDateString("mn-MN")}
                                  </span>
                                  {contract.expiresAt && (
                                    <span className="inline-flex items-center gap-1 text-amber-600">
                                      <CalendarClock size={13} />
                                      Дуусах:{" "}
                                      {new Date(
                                        contract.expiresAt,
                                      ).toLocaleDateString("mn-MN")}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {openUrl ? (
                                <div className="grid grid-cols-2 gap-2 sm:w-52">
                                  <a
                                    href={openUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-950 px-3 text-sm font-black text-white transition hover:bg-emerald-600"
                                  >
                                    <ExternalLink size={16} />
                                    Харах
                                  </a>
                                  <a
                                    href={openUrl}
                                    download={fileDownloadName(contract.title)}
                                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 text-sm font-black text-emerald-700 transition hover:bg-emerald-50"
                                  >
                                    <Download size={16} />
                                    Татах
                                  </a>
                                </div>
                              ) : (
                                <span className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-100 px-4 text-sm font-black text-slate-400">
                                  Файл бэлэн биш
                                </span>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {purchases.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="text-base font-black text-slate-950">
                          Худалдан авсан файлууд
                        </h3>
                        <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-600">
                          {purchases.length} access
                        </span>
                      </div>
                      <div className="grid gap-4">
                        {purchases.map((purchase) => (
                          <article
                            key={purchase.id}
                            className="group grid gap-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-orange-50/50 p-4 transition hover:border-orange-200 hover:shadow-lg sm:grid-cols-[auto_1fr_auto] sm:items-center"
                          >
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-orange-200">
                              <FileText size={24} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-orange-700">
                                  {sourceLabel(purchase.sourceType)}
                                </span>
                                <span className="text-xs font-bold text-slate-400">
                                  {new Date(
                                    purchase.purchasedAt,
                                  ).toLocaleDateString("mn-MN")}
                                </span>
                              </div>
                              <h3 className="mt-2 line-clamp-1 text-base font-black text-slate-950">
                                {purchase.title}
                              </h3>
                              <p className="mt-1 text-sm font-semibold text-slate-500">
                                {formatMnt(purchase.amount)} ·{" "}
                                {sourcePaymentLabel(purchase.sourceType)}
                              </p>
                              <PurchasePaymentSummary purchase={purchase} />
                            </div>
                            {purchase.fileUrl ? (
                              <div className="grid grid-cols-2 gap-2 sm:w-52">
                                <a
                                  href={purchase.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-950 px-3 text-sm font-black text-white transition hover:bg-orange-600"
                                >
                                  <ExternalLink size={16} />
                                  Харах
                                </a>
                                <a
                                  href={purchase.fileUrl}
                                  download={fileDownloadName(
                                    purchase.title,
                                    purchase.fileName,
                                  )}
                                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-orange-200 bg-white px-3 text-sm font-black text-orange-700 transition hover:bg-orange-50"
                                >
                                  <Download size={16} />
                                  Татах
                                </a>
                              </div>
                            ) : (
                              <span className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-100 px-4 text-sm font-black text-slate-400">
                                Файл оруулаагүй
                              </span>
                            )}
                          </article>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div
          className={`rounded-2xl border p-3 transition ${
            pointsOpen
              ? "border-orange-100 bg-white shadow-sm"
              : "border-slate-100 bg-slate-50"
          }`}
        >
          <AccountSectionToggle
            badge={`${history.length} log`}
            controls="account-points-history"
            icon={Sparkles}
            open={pointsOpen}
            title="Онооны түүх"
            onToggle={() => setPointsOpen((current) => !current)}
          />
          {pointsOpen ? (
            <div id="account-points-history" className="mt-4">
              {history.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-5 text-sm font-bold leading-6 text-slate-500">
                  Одоогоор онооны log алга байна.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {history.slice(0, 8).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="line-clamp-1 text-sm font-bold text-slate-900">
                          {entry.description}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-400">
                          {new Date(entry.date).toLocaleString("mn-MN")}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-600">
                        {entry.amount}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div
          className={`rounded-2xl border p-3 transition ${
            transactionsOpen
              ? "border-orange-100 bg-white shadow-sm"
              : "border-slate-100 bg-slate-50"
          }`}
        >
          <AccountSectionToggle
            badge={`${transactions.length} гүйлгээ`}
            controls="account-transactions-history"
            icon={History}
            open={transactionsOpen}
            subtitle="Төлбөрийн хөдөлгөөнөө төрөл, төлөвөөр шүүнэ."
            title="Гүйлгээний түүх"
            onToggle={() => setTransactionsOpen((current) => !current)}
          />
          {transactionsOpen ? (
            <div id="account-transactions-history" className="mt-4">
              <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {TRANSACTION_FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => {
                      setTransactionFilter(filter.value);
                      setShowAllTransactions(false);
                    }}
                    className={`h-9 shrink-0 rounded-full px-3 text-xs font-black transition ${
                      transactionFilter === filter.value
                        ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                        : "bg-slate-100 text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {transactions.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-5 text-sm font-bold leading-6 text-slate-500">
                  Одоогоор төлбөрийн гүйлгээ бүртгэгдээгүй байна.
                </p>
              ) : filteredTransactions.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-5 text-sm font-bold leading-6 text-slate-500">
                  Энэ шүүлтэд тохирох гүйлгээ алга.
                </p>
              ) : (
                <div>
                  <div className="divide-y divide-slate-100">
                    {visibleTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-black text-orange-600">
                              {transactionTypeLabel(transaction.type)}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-black ${transactionStatusClass(transaction.status)}`}
                            >
                              {TRANSACTION_STATUS_LABEL[transaction.status] ||
                                transaction.status}
                            </span>
                            {transaction.method && (
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">
                                {TRANSACTION_METHOD_LABEL[transaction.method] ||
                                  transaction.method}
                              </span>
                            )}
                          </div>
                          <p className="mt-2 line-clamp-1 text-sm font-black text-slate-950">
                            {transaction.title}
                          </p>
                          <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">
                            {transaction.description}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-400">
                            <span>
                              {new Date(transaction.occurredAt).toLocaleString(
                                "mn-MN",
                              )}
                            </span>
                            {transaction.reference && (
                              <span className="max-w-[220px] truncate">
                                Ref: {transaction.reference}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="shrink-0 text-right text-base font-black text-slate-950">
                          {formatMnt(transaction.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {hasHiddenTransactions && (
                    <button
                      type="button"
                      onClick={() =>
                        setShowAllTransactions((current) => !current)
                      }
                      className="mt-3 flex h-11 w-full items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 text-sm font-black text-orange-600 transition hover:bg-orange-500 hover:text-white"
                    >
                      {showAllTransactions
                        ? "Хураах"
                        : `Бүгдийг харах (${filteredTransactions.length})`}
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
