"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  Loader2,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingBag,
  WalletCards,
  XCircle,
} from "lucide-react";
import { useOrg } from "@/components/org/OrgContext";
import { money } from "@/lib/org-format";
import { formatRestaurantOrderNumber } from "@/lib/restaurant-order-number";
import {
  attachEbarimtReceipt,
  returnLocalEbarimtReceipt,
  sendLocalEbarimtData,
} from "@/lib/ebarimt";
import {
  getRestaurantPosRegisters,
  getRestaurantSalesHistory,
  voidRestaurantSale,
  type RestaurantPosRegister,
  type RestaurantSalesHistoryItem,
} from "@/lib/restaurant-pos-api";

type RangePreset = "TODAY" | "WEEK" | "MONTH" | "PREVIOUS_MONTH";

const RANGE_OPTIONS: Array<{ id: RangePreset; label: string }> = [
  { id: "TODAY", label: "Өнөөдөр" },
  { id: "WEEK", label: "7 хоног" },
  { id: "MONTH", label: "Энэ сар" },
  { id: "PREVIOUS_MONTH", label: "Өмнөх сар" },
];

const PAGE_SIZE = 20;
const API_PAGE_SIZE = 100;

const paymentLabels: Record<string, string> = {
  CASH: "Бэлэн",
  CARD: "Карт",
  QPAY: "QR",
  QR: "QR",
  CREDIT: "Зээл",
  MIXED: "Холимог",
};

const orderModeLabels: Record<string, string> = {
  DINE_IN: "Энд хэрэглэх",
  TO_GO: "Авч явах",
  DELIVERY: "Хүргэлт",
};

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function getDateRange(preset: RangePreset) {
  const now = new Date();
  if (preset === "TODAY") {
    return { from: startOfDay(now), to: endOfDay(now) };
  }
  if (preset === "WEEK") {
    const from = startOfDay(now);
    from.setDate(from.getDate() - 6);
    return { from, to: endOfDay(now) };
  }
  if (preset === "PREVIOUS_MONTH") {
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0),
      to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
    };
  }
  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
    to: endOfDay(now),
  };
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("mn-MN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const formatRangeDate = (value: Date) =>
  new Intl.DateTimeFormat("mn-MN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(value);

const formatFileDate = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const displayOrderNumber = (sale: RestaurantSalesHistoryItem) =>
  formatRestaurantOrderNumber(sale.ticketNo || sale.receiptNo, sale.id);

const ebarimtStatus = (sale: RestaurantSalesHistoryItem) =>
  String(sale.ebarimt?.status || "").toUpperCase();

const paymentReturnWarning = (paymentMethod: string) => {
  const method = paymentMethod.toUpperCase();
  if (method === "CARD") {
    return "Картын мөнгөн буцаалтыг POS терминал дээр тусад нь хийнэ.";
  }
  if (method === "QPAY" || method === "QR") {
    return "QR төлбөрийн мөнгөн буцаалтыг банкны систем дээр тусад нь хийнэ.";
  }
  if (method === "CASH") {
    return "Бэлэн мөнгийг хэрэглэгчид буцааж өгсөн эсэхээ шалгана уу.";
  }
  return "Төлбөрийн мөнгөн буцаалтыг тухайн төлбөрийн сувгаар тусад нь хийнэ.";
};

function csvCell(value: unknown) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadSalesCsv(
  sales: RestaurantSalesHistoryItem[],
  range: { from: Date; to: Date },
) {
  const headers = [
    "Захиалгын дугаар",
    "Баримтын дугаар",
    "Огноо",
    "Төрөл",
    "Салбар",
    "Касс",
    "Төлбөр",
    "Төлөв",
    "Бүтээгдэхүүн",
    "Тоо",
    "Нэгж үнэ",
    "Хөнгөлөлт",
    "Мөрийн дүн",
    "Захиалгын нийт дүн",
  ];
  const rows = sales.flatMap((sale) => {
    const base = [
      displayOrderNumber(sale),
      sale.receiptNo,
      formatDate(sale.createdAt),
      sale.orderMode ? orderModeLabels[sale.orderMode] || sale.orderMode : "",
      sale.branchName,
      sale.registerName || "",
      paymentLabels[sale.paymentMethod] || sale.paymentMethod,
      sale.status === "VOIDED" ? "Цуцлагдсан" : "Амжилттай",
    ];
    if (sale.lines.length === 0) {
      return [[...base, "", "", "", "", "", sale.grandTotal]];
    }
    return sale.lines.map((line) => [
      ...base,
      line.productName,
      line.qty,
      line.unitPrice,
      line.discount,
      line.lineTotal,
      sale.grandTotal,
    ]);
  });
  const csv = [headers, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `zahialgiin-tuuh-${formatFileDate(range.from)}-${formatFileDate(range.to)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function OrderHistoryScreen() {
  const { user } = useOrg();
  const [rangePreset, setRangePreset] = useState<RangePreset>("WEEK");
  const [sales, setSales] = useState<RestaurantSalesHistoryItem[]>([]);
  const [registers, setRegisters] = useState<RestaurantPosRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [expandedSaleId, setExpandedSaleId] = useState("");
  const [voidingSaleId, setVoidingSaleId] = useState("");
  const [returningSaleId, setReturningSaleId] = useState("");

  const range = useMemo(() => getDateRange(rangePreset), [rangePreset]);

  const loadSales = useCallback(
    async (signal?: AbortSignal) => {
      if (!user.organizationId) {
        setSales([]);
        setLoading(false);
        setError("Байгууллагын мэдээлэл олдсонгүй.");
        return;
      }

      setLoading(true);
      setError("");
      try {
        const options = {
          from: range.from.toISOString(),
          to: range.to.toISOString(),
          limit: API_PAGE_SIZE,
        };
        const first = await getRestaurantSalesHistory(
          user.organizationId,
          { ...options, page: 1 },
          signal,
        );
        const remainingPages = Array.from(
          { length: Math.max(0, first.pages - 1) },
          (_, index) => index + 2,
        );
        const remaining = await Promise.all(
          remainingPages.map((nextPage) =>
            getRestaurantSalesHistory(
              user.organizationId as string,
              { ...options, page: nextPage },
              signal,
            ),
          ),
        );
        setSales([
          ...first.sales,
          ...remaining.flatMap((result) => result.sales),
        ]);
        setPage(1);
        setExpandedSaleId("");
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setSales([]);
        setError(
          cause instanceof Error
            ? cause.message
            : "Захиалгын түүх авахад алдаа гарлаа.",
        );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [range.from, range.to, user.organizationId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadSales(controller.signal);
    return () => controller.abort();
  }, [loadSales]);

  useEffect(() => {
    let active = true;
    void getRestaurantPosRegisters()
      .then((items) => {
        if (active) setRegisters(items);
      })
      .catch(() => {
        if (active) setRegisters([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const returnSaleEbarimt = useCallback(
    async (sale: RestaurantSalesHistoryItem) => {
      const initialStatus = ebarimtStatus(sale);
      if (
        initialStatus !== "SUCCESS" &&
        initialStatus !== "RETURN_PENDING" &&
        initialStatus !== "RETURNED"
      ) {
        return "";
      }

      setReturningSaleId(sale.id);
      try {
        let register =
          registers.find((item) => item.id === sale.registerId) || null;
        if (!register && sale.registerId) {
          try {
            const latestRegisters = await getRestaurantPosRegisters();
            setRegisters(latestRegisters);
            register =
              latestRegisters.find((item) => item.id === sale.registerId) ||
              null;
          } catch {
            // The local PosAPI URL fallback can still be used below.
          }
        }
        let currentEbarimt = sale.ebarimt;
        const returned = await returnLocalEbarimtReceipt(sale, register);
        if (!returned) {
          throw new Error("Ebarimt буцаалтын хүсэлт үүссэнгүй.");
        }

        // Repeat DELETE on retries as well. A previous sendData attempt may
        // have run with a timestamp altered by Date/UTC conversion, in which
        // case resending sendData alone cannot create the app-side action.
        const pending = await attachEbarimtReceipt(sale.id, {
          status: "RETURN_PENDING",
          billId: currentEbarimt?.billId ?? null,
          receiptId: currentEbarimt?.receiptId ?? null,
          qrData: currentEbarimt?.qrData ?? null,
          lottery: currentEbarimt?.lottery ?? null,
          date: returned.date,
          error: null,
          receiptType: currentEbarimt?.receiptType ?? null,
          customerName: currentEbarimt?.customerName ?? null,
          customerTin: currentEbarimt?.customerTin ?? null,
          customerRegNo: currentEbarimt?.customerRegNo ?? null,
          payload: {
            returnedAt: new Date().toISOString(),
            posApiDate: returned.date,
            response: returned.response,
          },
        });
        currentEbarimt = pending.ebarimt;
        setSales((current) =>
          current.map((item) =>
            item.id === sale.id
              ? { ...item, ebarimt: pending.ebarimt }
              : item,
          ),
        );

        const info = await sendLocalEbarimtData(register);
        const completed = await attachEbarimtReceipt(sale.id, {
          status: "RETURNED",
          billId: currentEbarimt?.billId ?? null,
          receiptId: currentEbarimt?.receiptId ?? null,
          qrData: currentEbarimt?.qrData ?? null,
          lottery: currentEbarimt?.lottery ?? null,
          date: currentEbarimt?.date ?? null,
          error: null,
          receiptType: currentEbarimt?.receiptType ?? null,
          customerName: currentEbarimt?.customerName ?? null,
          customerTin: currentEbarimt?.customerTin ?? null,
          customerRegNo: currentEbarimt?.customerRegNo ?? null,
          payload: {
            sentAt: new Date().toISOString(),
            lastSentDate: info.lastSentDate ?? null,
          },
        });
        setSales((current) =>
          current.map((item) =>
            item.id === sale.id
              ? { ...item, ebarimt: completed.ebarimt }
              : item,
          ),
        );
        return info.lastSentDate
          ? ` SendData амжилттай (${info.lastSentDate}).`
          : " SendData амжилттай.";
      } finally {
        setReturningSaleId("");
      }
    },
    [registers],
  );

  const handleVoidSale = useCallback(
    async (sale: RestaurantSalesHistoryItem) => {
      const reason = window.prompt(
        `№${displayOrderNumber(sale)} захиалгыг цуцлах шалтгаан:`,
        "Хэрэглэгчийн хүсэлтээр",
      );
      if (reason === null) return;
      const normalizedReason = reason.trim();
      if (!normalizedReason) {
        setActionError("Захиалга цуцлах шалтгаан оруулна уу.");
        return;
      }

      const hasEbarimt = ["SUCCESS", "RETURN_PENDING"].includes(
        ebarimtStatus(sale),
      );
      const confirmed = window.confirm(
        [
          `№${displayOrderNumber(sale)} захиалгыг цуцлах уу?`,
          hasEbarimt
            ? "Ebarimt автоматаар буцаагдана."
            : "Энэ захиалгад буцаах амжилттай Ebarimt алга.",
          paymentReturnWarning(sale.paymentMethod),
        ].join("\n\n"),
      );
      if (!confirmed) return;

      setVoidingSaleId(sale.id);
      setActionError("");
      setNotice("");
      try {
        await voidRestaurantSale(sale.id, normalizedReason);
        const voidedSale = {
          ...sale,
          status: "VOIDED",
          voidReason: normalizedReason,
          voidedAt: new Date().toISOString(),
        };
        setSales((current) =>
          current.map((item) => (item.id === sale.id ? voidedSale : item)),
        );

        try {
          const sendWarning = await returnSaleEbarimt(sale);
          setNotice(
            `№${displayOrderNumber(sale)} захиалга цуцлагдлаа.${
              hasEbarimt ? " Ebarimt буцаалтын хүсэлт илгээгдлээ." : ""
            }${sendWarning}`,
          );
        } catch (cause) {
          setActionError(
            `Захиалга цуцлагдсан боловч Ebarimt буцаалт амжилтгүй боллоо. Доорх “Ebarimt буцаах” товчоор дахин оролдоно уу. ${
              cause instanceof Error ? cause.message : ""
            }`.trim(),
          );
        }
      } catch (cause) {
        setActionError(
          cause instanceof Error
            ? cause.message
            : "Захиалга цуцлахад алдаа гарлаа.",
        );
      } finally {
        setVoidingSaleId("");
      }
    },
    [returnSaleEbarimt],
  );

  const handleRetryEbarimtReturn = useCallback(
    async (sale: RestaurantSalesHistoryItem) => {
      setActionError("");
      setNotice("");
      try {
        const sendWarning = await returnSaleEbarimt(sale);
        setNotice(
          `№${displayOrderNumber(sale)} захиалгын Ebarimt буцаалтын хүсэлт дахин илгээгдлээ.${sendWarning}`,
        );
      } catch (cause) {
        setActionError(
          cause instanceof Error
            ? cause.message
            : "Ebarimt буцаахад алдаа гарлаа.",
        );
      }
    },
    [returnSaleEbarimt],
  );

  const filteredSales = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("mn-MN");
    if (!normalized) return sales;
    return sales.filter((sale) =>
      [
        sale.receiptNo,
        sale.ticketNo || "",
        sale.branchName,
        sale.registerName || "",
        sale.cashierName,
        ...sale.lines.map((line) => line.productName),
      ].some((value) => value.toLocaleLowerCase("mn-MN").includes(normalized)),
    );
  }, [query, sales]);

  useEffect(() => setPage(1), [query]);

  const completedSales = useMemo(
    () => sales.filter((sale) => sale.status !== "VOIDED"),
    [sales],
  );
  const totalAmount = completedSales.reduce(
    (sum, sale) => sum + sale.grandTotal,
    0,
  );
  const averageAmount = completedSales.length
    ? totalAmount / completedSales.length
    : 0;
  const voidedCount = sales.length - completedSales.length;
  const totalPages = Math.max(1, Math.ceil(filteredSales.length / PAGE_SIZE));
  const visibleSales = filteredSales.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  return (
    <div className="space-y-5">
      <header className="rounded-3xl bg-slate-950 px-5 py-6 text-white shadow-sm sm:px-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
              Тайлан
            </p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              Захиалгын түүх
            </h1>
            <p className="mt-2 text-sm font-semibold text-slate-400">
              {formatRangeDate(range.from)} — {formatRangeDate(range.to)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setRangePreset(option.id)}
                className={`h-10 rounded-xl px-4 text-xs font-black transition ${
                  rangePreset === option.id
                    ? "bg-emerald-300 text-slate-950"
                    : "border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Нийт захиалга",
            value: completedSales.length.toLocaleString("mn-MN"),
            icon: ShoppingBag,
            tone: "bg-indigo-50 text-indigo-700",
          },
          {
            label: "Нийт борлуулалт",
            value: money(totalAmount),
            icon: WalletCards,
            tone: "bg-emerald-50 text-emerald-700",
          },
          {
            label: "Дундаж захиалга",
            value: money(averageAmount),
            icon: ReceiptText,
            tone: "bg-sky-50 text-sky-700",
          },
          {
            label: "Цуцлагдсан",
            value: voidedCount.toLocaleString("mn-MN"),
            icon: XCircle,
            tone: "bg-rose-50 text-rose-700",
          },
        ].map((item) => (
          <article
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-black tabular-nums text-slate-950">
                  {item.value}
                </p>
              </div>
              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.tone}`}>
                <item.icon className="h-5 w-5" />
              </span>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Захиалга, баримт, бүтээгдэхүүн хайх"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold outline-none transition focus:border-slate-400 focus:bg-white"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadSales()}
              disabled={loading}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Шинэчлэх
            </button>
            <button
              type="button"
              onClick={() => downloadSalesCsv(sales, range)}
              disabled={loading || sales.length === 0}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              CSV татах
            </button>
          </div>
        </div>

        {notice ? (
          <div className="mx-5 mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
            {notice}
          </div>
        ) : null}

        {actionError ? (
          <div className="mx-5 mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            {actionError}
          </div>
        ) : null}

        {error ? (
          <div className="m-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            {error}
          </div>
        ) : loading ? (
          <div className="flex h-64 items-center justify-center gap-2 text-sm font-bold text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Захиалгын түүх ачаалж байна...
          </div>
        ) : visibleSales.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <CalendarDays className="h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-black text-slate-700">
              Сонгосон хугацаанд захиалга олдсонгүй
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Захиалга</th>
                  <th className="px-4 py-3">Огноо</th>
                  <th className="px-4 py-3">Төрөл</th>
                  <th className="px-4 py-3">Төлбөр</th>
                  <th className="px-4 py-3">Бүтээгдэхүүн</th>
                  <th className="px-4 py-3 text-right">Дүн</th>
                  <th className="w-12 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {visibleSales.map((sale) => {
                  const expanded = expandedSaleId === sale.id;
                  const voided = sale.status === "VOIDED";
                  const receiptStatus = ebarimtStatus(sale);
                  const isVoiding = voidingSaleId === sale.id;
                  const isReturning = returningSaleId === sale.id;
                  const itemQty = sale.lines.reduce((sum, line) => sum + line.qty, 0);
                  return (
                    <Fragment key={sale.id}>
                      <tr className={`border-t border-slate-100 ${voided ? "bg-rose-50/40" : ""}`}>
                        <td className="px-5 py-4">
                          <p className="font-black text-slate-950">
                            №{displayOrderNumber(sale)}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-400">
                            {sale.receiptNo}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-sm font-bold text-slate-600">
                          {formatDate(sale.createdAt)}
                        </td>
                        <td className="px-4 py-4">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
                            {sale.orderMode
                              ? orderModeLabels[sale.orderMode] || sale.orderMode
                              : "Борлуулалт"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm font-black text-slate-700">
                          {paymentLabels[sale.paymentMethod] || sale.paymentMethod}
                        </td>
                        <td className="px-4 py-4 text-sm font-bold text-slate-600">
                          {itemQty.toLocaleString("mn-MN")} ширхэг
                        </td>
                        <td className={`px-4 py-4 text-right font-black tabular-nums ${voided ? "text-rose-600 line-through" : "text-slate-950"}`}>
                          {money(sale.grandTotal)}
                          {voided ? (
                            <span className="mt-1 block text-[10px] font-black no-underline">
                              Цуцлагдсан
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => setExpandedSaleId(expanded ? "" : sale.id)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                            aria-label="Захиалгын дэлгэрэнгүй"
                          >
                            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="border-t border-slate-100 bg-slate-50/70">
                          <td colSpan={7} className="px-5 py-4">
                            <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
                              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                {sale.lines.map((line, index) => (
                                  <div
                                    key={`${sale.id}-${line.productId}-${index}`}
                                    className={`flex items-center justify-between gap-4 px-4 py-3 text-sm ${index ? "border-t border-slate-100" : ""}`}
                                  >
                                    <div>
                                      <p className="font-black text-slate-800">{line.productName}</p>
                                      <p className="mt-1 text-xs font-semibold text-slate-400">
                                        {line.qty} × {money(line.unitPrice)}
                                      </p>
                                    </div>
                                    <p className="font-black tabular-nums text-slate-800">
                                      {money(line.lineTotal)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                              <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs font-bold text-slate-500">
                                <p>{sale.branchName}</p>
                                <p className="mt-2">{sale.registerName || "POS касс"}</p>
                                <p className="mt-2">{sale.cashierName}</p>
                                {receiptStatus === "RETURNED" ? (
                                  <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-emerald-700">
                                    Ebarimt буцаалтын хүсэлт илгээгдсэн
                                  </p>
                                ) : receiptStatus === "RETURN_PENDING" ? (
                                  <p className="mt-3 rounded-lg bg-amber-50 p-3 text-amber-700">
                                    Ebarimt SendData хүлээгдэж байна
                                  </p>
                                ) : receiptStatus === "SUCCESS" ? (
                                  <p className="mt-3 rounded-lg bg-sky-50 p-3 text-sky-700">
                                    Ebarimt гарсан
                                  </p>
                                ) : null}
                                {sale.voidReason ? (
                                  <p className="mt-3 rounded-lg bg-rose-50 p-3 text-rose-700">
                                    {sale.voidReason}
                                  </p>
                                ) : null}
                                {!voided ? (
                                  <button
                                    type="button"
                                    onClick={() => void handleVoidSale(sale)}
                                    disabled={isVoiding || isReturning}
                                    className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 text-xs font-black text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {isVoiding || isReturning ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <XCircle className="h-4 w-4" />
                                    )}
                                    Захиалга цуцлах
                                  </button>
                                ) : receiptStatus === "SUCCESS" ||
                                  receiptStatus === "RETURN_PENDING" ||
                                  receiptStatus === "RETURNED" ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleRetryEbarimtReturn(sale)
                                    }
                                    disabled={isReturning}
                                    className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 text-xs font-black text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {isReturning ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <RotateCcw className="h-4 w-4" />
                                    )}
                                    {receiptStatus === "RETURN_PENDING" ||
                                    receiptStatus === "RETURNED"
                                      ? "Ebarimt буцаалтыг дахин илгээх"
                                      : "Ebarimt буцаах"}
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredSales.length > 0 ? (
          <footer className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-xs font-bold text-slate-500">
              {filteredSales.length.toLocaleString("mn-MN")} захиалга · {page}/{totalPages} хуудас
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-600 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Өмнөх
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
                className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-600 disabled:opacity-40"
              >
                Дараах
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </footer>
        ) : null}
      </section>
    </div>
  );
}
