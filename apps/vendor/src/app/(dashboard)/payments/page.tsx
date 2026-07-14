"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Receipt,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  X,
  Printer,
  CreditCard,
  Banknote,
  Smartphone,
  ChevronRight,
  Search,
  Filter,
  ArrowUpDown,
  Wallet,
  TrendingUp,
  Calendar,
  FileText,
  DollarSign,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { API, authFetch } from "@/lib/api";

type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";

type Payment = {
  id: string;
  invoiceNumber: string;
  totalAmount: string;
  paidAmount: string;
  status: PaymentStatus;
  paidAt: string | null;
  dueDate: string | null;
  createdAt: string;
  paymentMethod: string | null;
  transactionId: string | null;
  request?: {
    id: string;
    requestNumber: string;
    status: string;
    warehouse?: { id: string; name: string; address?: string };
    items?: {
      id: string;
      quantity: number;
      approvedQuantity: number | null;
      product: {
        id: string;
        name: string;
        sku: string | null;
        price: string;
        images?: { url: string }[];
      };
    }[];
  };
  organization?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  confirmedBy?: {
    id: string;
    email: string;
    profile?: { fullName: string };
  };
};

type StatusFilter = "ALL" | PaymentStatus;

type QPayInvoice = {
  paymentId: string;
  invoiceNumber: string;
  amount: number;
  qrText: string;
  qrImage: string;
  expiresIn: number;
  deepLinks: Array<{
    name: string;
    description: string;
    logo: string;
    link: string;
  }>;
  devMode?: boolean;
};

const STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Төлөгдөөгүй",
  PAID: "Төлөгдсөн",
  FAILED: "Алдаатай",
  REFUNDED: "Буцаагдсан",
  CANCELLED: "Цуцлагдсан",
};

const STATUS_COLORS: Record<
  PaymentStatus,
  { bg: string; text: string; dot: string }
> = {
  PENDING: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  PAID: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  FAILED: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  REFUNDED: {
    bg: "bg-violet-50",
    text: "text-violet-700",
    dot: "bg-violet-500",
  },
  CANCELLED: {
    bg: "bg-slate-100",
    text: "text-slate-600",
    dot: "bg-slate-400",
  },
};

export default function PaymentsPage() {
  const [user, setUser] = useState<{
    id: string;
    organizationId?: string;
  } | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "amount">(
    "newest",
  );

  // Detail modal
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Pay modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [payingPayment, setPayingPayment] = useState<Payment | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [payNote, setPayNote] = useState("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [paySuccess, setPaySuccess] = useState(false);
  const [qpayInvoice, setQpayInvoice] = useState<QPayInvoice | null>(null);
  const [checkingQpay, setCheckingQpay] = useState(false);
  const [confirmingDevQpay, setConfirmingDevQpay] = useState(false);

  // Load user
  useEffect(() => {
    try {
      const stored = localStorage.getItem("vendor_user");
      if (stored) setUser(JSON.parse(stored));
    } catch {
      /* */
    }
  }, []);

  // Load payments
  const fetchPayments = async () => {
    if (!user?.organizationId) return;
    setLoading(true);
    try {
      const res = await authFetch(
        `${API}/stock-requests/payments/organization/${user.organizationId}`,
      );
      if (res.ok) setPayments(await res.json());
    } catch {
      /* */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.organizationId) fetchPayments();
  }, [user?.organizationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Computed
  const stats = useMemo(() => {
    const unpaid = payments.filter(
      (p) => p.status === "PENDING" || p.status === "FAILED",
    );
    const paid = payments.filter((p) => p.status === "PAID");
    const overdue = unpaid.filter(
      (p) => p.dueDate && new Date(p.dueDate) < new Date(),
    );
    return {
      unpaidCount: unpaid.length,
      paidCount: paid.length,
      overdueCount: overdue.length,
      totalUnpaid: unpaid.reduce(
        (s, p) => s + (Number(p.totalAmount) - Number(p.paidAmount)),
        0,
      ),
      totalPaid: paid.reduce((s, p) => s + Number(p.paidAmount), 0),
      totalAll: payments.reduce((s, p) => s + Number(p.totalAmount), 0),
    };
  }, [payments]);

  const filtered = useMemo(() => {
    let list = [...payments];
    if (statusFilter !== "ALL")
      list = list.filter((p) => p.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.invoiceNumber.toLowerCase().includes(q) ||
          p.request?.requestNumber?.toLowerCase().includes(q) ||
          p.request?.warehouse?.name?.toLowerCase().includes(q),
      );
    }
    list.sort((a, b) => {
      if (sortOrder === "amount")
        return Number(b.totalAmount) - Number(a.totalAmount);
      if (sortOrder === "oldest")
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list;
  }, [payments, statusFilter, searchQuery, sortOrder]);

  // Detail
  const openDetail = async (paymentId: string) => {
    setLoadingDetail(true);
    setShowDetail(true);
    try {
      const res = await authFetch(
        `${API}/stock-requests/payments/${paymentId}`,
      );
      if (res.ok) setSelectedPayment(await res.json());
    } catch {
      /* */
    } finally {
      setLoadingDetail(false);
    }
  };

  // Pay
  const openPayModal = (payment: Payment) => {
    setPayingPayment(payment);
    setPaymentMethod("");
    setTransactionId("");
    setPayNote("");
    setPayError("");
    setPaySuccess(false);
    setQpayInvoice(null);
    setShowPayModal(true);
  };

  const submitPayment = async () => {
    if (!payingPayment) return;
    if (!paymentMethod) {
      setPayError("Төлбөрийн хэлбэр сонгоно уу");
      return;
    }
    setPaying(true);
    setPayError("");
    try {
      if (paymentMethod === "QPAY") {
        const qpayResponse = await authFetch(
          `${API}/stock-requests/payments/${payingPayment.id}/qpay`,
          { method: "POST" },
        );
        const qpayBody = (await qpayResponse.json()) as
          | QPayInvoice
          | { message?: string };
        if (!qpayResponse.ok || !("paymentId" in qpayBody)) {
          setPayError(
            "message" in qpayBody && qpayBody.message
              ? qpayBody.message
              : "QPay нэхэмжлэх үүсгэж чадсангүй",
          );
          return;
        }
        setQpayInvoice(qpayBody);
        return;
      }

      const res = await authFetch(
        `${API}/stock-requests/payments/${payingPayment.id}/pay`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentMethod,
            transactionId: transactionId.trim() || null,
            note: payNote.trim() || null,
          }),
        },
      );
      if (!res.ok) {
        const err = await res.json();
        setPayError(err.message || "Алдаа гарлаа");
        return;
      }
      setPaySuccess(true);
      // Refresh payments list
      setTimeout(() => {
        setShowPayModal(false);
        setShowDetail(false);
        fetchPayments();
      }, 1500);
    } catch {
      setPayError("Серверт холбогдож чадсангүй");
    } finally {
      setPaying(false);
    }
  };

  useEffect(() => {
    if (!qpayInvoice || qpayInvoice.devMode || !showPayModal || paySuccess)
      return;

    const checkStatus = async () => {
      setCheckingQpay(true);
      try {
        const response = await authFetch(
          `${API}/stock-requests/payments/${qpayInvoice.paymentId}/qpay/status`,
        );
        if (!response.ok) return;
        const body = (await response.json()) as { status?: PaymentStatus };
        if (body.status === "PAID") {
          setPaySuccess(true);
          await fetchPayments();
          setTimeout(() => {
            setShowPayModal(false);
            setShowDetail(false);
            setQpayInvoice(null);
          }, 1500);
        }
      } finally {
        setCheckingQpay(false);
      }
    };

    void checkStatus();
    const interval = window.setInterval(() => void checkStatus(), 3000);
    return () => window.clearInterval(interval);
  }, [qpayInvoice, showPayModal, paySuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmDevQpay = async () => {
    if (!qpayInvoice?.devMode) return;
    setConfirmingDevQpay(true);
    setPayError("");
    try {
      const response = await authFetch(
        `${API}/stock-requests/payments/${qpayInvoice.paymentId}/qpay/dev-confirm`,
        { method: "POST" },
      );
      const body = (await response.json()) as {
        status?: PaymentStatus;
        message?: string;
      };
      if (!response.ok || body.status !== "PAID") {
        setPayError(body.message || "Fake QPay төлбөр баталгаажсангүй");
        return;
      }
      setPaySuccess(true);
      await fetchPayments();
      setTimeout(() => {
        setShowPayModal(false);
        setShowDetail(false);
        setQpayInvoice(null);
      }, 1000);
    } catch {
      setPayError("Local төлбөрийн хүсэлт илгээж чадсангүй");
    } finally {
      setConfirmingDevQpay(false);
    }
  };

  const daysUntilDue = (dueDate: string) => {
    const diff = Math.ceil(
      (new Date(dueDate).getTime() - Date.now()) / 86400000,
    );
    return diff;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* ═══════ HEADER ═══════ */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                Төлбөрийн түүх
              </h1>
              <p className="mt-1 text-base text-slate-500">
                Нэхэмжлэх удирдлага ба төлбөрийн мэдээлэл
              </p>
            </div>
            {stats.unpaidCount > 0 && (
              <div className="flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800 shadow-sm">
                <AlertCircle className="h-4 w-4" />
                {stats.unpaidCount} төлөгдөөгүй нэхэмжлэх
              </div>
            )}
          </div>
        </div>

        {/* ═══════ STATS CARDS ═══════ */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Unpaid */}
          <div className="group relative overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-5 transition-shadow hover:shadow-lg hover:shadow-amber-100/50">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-amber-200/30" />
            <div className="relative">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <p className="text-3xl font-black text-amber-900">
                {stats.unpaidCount}
              </p>
              <p className="mt-0.5 text-sm font-medium text-amber-600/80">
                Төлөгдөөгүй
              </p>
            </div>
          </div>

          {/* Total Unpaid Amount */}
          <div className="group relative overflow-hidden rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 to-rose-50 p-5 transition-shadow hover:shadow-lg hover:shadow-red-100/50">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-red-200/30" />
            <div className="relative">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10">
                <Wallet className="h-5 w-5 text-red-600" />
              </div>
              <p className="text-2xl font-black text-red-900 sm:text-3xl">
                {stats.totalUnpaid.toLocaleString()}₮
              </p>
              <p className="mt-0.5 text-sm font-medium text-red-600/80">
                Төлөх дүн
              </p>
            </div>
          </div>

          {/* Paid */}
          <div className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-green-50 p-5 transition-shadow hover:shadow-lg hover:shadow-emerald-100/50">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-emerald-200/30" />
            <div className="relative">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="text-3xl font-black text-emerald-900">
                {stats.paidCount}
              </p>
              <p className="mt-0.5 text-sm font-medium text-emerald-600/80">
                Төлөгдсөн
              </p>
            </div>
          </div>

          {/* Total Paid */}
          <div className="group relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 transition-shadow hover:shadow-lg hover:shadow-blue-100/50">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-blue-200/30" />
            <div className="relative">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-2xl font-black text-blue-900 sm:text-3xl">
                {stats.totalPaid.toLocaleString()}₮
              </p>
              <p className="mt-0.5 text-sm font-medium text-blue-600/80">
                Нийт төлсөн
              </p>
            </div>
          </div>
        </div>

        {/* ═══════ OVERDUE WARNING ═══════ */}
        {stats.overdueCount > 0 && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="font-bold text-red-800">
                {stats.overdueCount} нэхэмжлэхийн хугацаа хэтэрсэн!
              </p>
              <p className="mt-0.5 text-sm text-red-700">
                Хугацаа хэтэрсэн нэхэмжлэх байгаа тул шинэ хүсэлт
                зөвшөөрөгдөхгүй. Нэн даруй төлнө үү.
              </p>
            </div>
          </div>
        )}

        {/* ═══════ FILTERS & SEARCH ═══════ */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Status filters */}
          <div className="flex flex-wrap gap-2">
            {(
              [
                "ALL",
                "PENDING",
                "PAID",
                "FAILED",
                "CANCELLED",
              ] as StatusFilter[]
            ).map((status) => {
              const count =
                status === "ALL"
                  ? payments.length
                  : payments.filter((p) => p.status === status).length;
              const isActive = statusFilter === status;
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-slate-900 text-white shadow-md"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {status === "ALL" ? "Бүгд" : STATUS_LABELS[status]}
                  <span
                    className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-bold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search + Sort */}
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Нэхэмжлэх хайх..."
                className="h-10 w-56 rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>
            <button
              onClick={() =>
                setSortOrder((prev) =>
                  prev === "newest"
                    ? "oldest"
                    : prev === "oldest"
                      ? "amount"
                      : "newest",
                )
              }
              className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 hover:bg-slate-50"
              title={
                sortOrder === "newest"
                  ? "Шинэ → Хуучин"
                  : sortOrder === "oldest"
                    ? "Хуучин → Шинэ"
                    : "Дүнгээр"
              }
            >
              <ArrowUpDown className="h-4 w-4" />
              <span className="hidden sm:inline">
                {sortOrder === "newest"
                  ? "Шинэ"
                  : sortOrder === "oldest"
                    ? "Хуучин"
                    : "Дүн"}
              </span>
            </button>
          </div>
        </div>

        {/* ═══════ PAYMENT LIST ═══════ */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-[#FFAD02]" />
            <p className="mt-3 text-sm text-slate-400">Ачааллаж байна...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white py-20">
            <div className="mb-4 rounded-2xl bg-slate-100 p-5">
              <Receipt className="h-10 w-10 text-slate-300" />
            </div>
            <p className="text-xl font-bold text-slate-600">
              {searchQuery || statusFilter !== "ALL"
                ? "Хайлтад тохирох нэхэмжлэх олдсонгүй"
                : "Төлбөрийн түүх байхгүй"}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Бараа татах хүсэлт илгээсний дараа энд харагдана
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((payment) => {
              const isUnpaid =
                payment.status === "PENDING" || payment.status === "FAILED";
              const isOverdue =
                isUnpaid &&
                payment.dueDate &&
                new Date(payment.dueDate) < new Date();
              const sc = STATUS_COLORS[payment.status];
              const daysLeft = payment.dueDate
                ? daysUntilDue(payment.dueDate)
                : null;

              return (
                <div
                  key={payment.id}
                  className={`group relative overflow-hidden rounded-2xl border bg-white transition-all hover:shadow-lg ${
                    isOverdue
                      ? "border-red-200 hover:shadow-red-100/50"
                      : isUnpaid
                        ? "border-amber-200 hover:shadow-amber-100/50"
                        : "border-slate-100 hover:shadow-slate-100/50"
                  }`}
                >
                  {/* Overdue indicator stripe */}
                  {isOverdue && (
                    <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-red-500 to-red-400" />
                  )}

                  <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    {/* Left: icon + info */}
                    <div
                      className="flex cursor-pointer items-start gap-4"
                      onClick={() => openDetail(payment.id)}
                    >
                      <div className={`shrink-0 rounded-2xl p-3.5 ${sc.bg}`}>
                        <Receipt className={`h-6 w-6 ${sc.text}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-900">
                            {payment.invoiceNumber}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${sc.bg} ${sc.text}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${sc.dot}`}
                            />
                            {STATUS_LABELS[payment.status]}
                          </span>
                          {isOverdue && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                              ХУГАЦАА ХЭТЭРСЭН
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" />
                            {payment.request?.requestNumber || "—"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(payment.createdAt).toLocaleDateString(
                              "mn-MN",
                            )}
                          </span>
                          {payment.request?.warehouse && (
                            <span className="text-slate-400">
                              {payment.request.warehouse.name}
                            </span>
                          )}
                        </div>
                        {isUnpaid && daysLeft !== null && (
                          <p
                            className={`mt-1 text-xs font-medium ${
                              daysLeft < 0
                                ? "text-red-600"
                                : daysLeft <= 3
                                  ? "text-amber-600"
                                  : "text-slate-400"
                            }`}
                          >
                            {daysLeft < 0
                              ? `${Math.abs(daysLeft)} хоногоор хэтэрсэн`
                              : daysLeft === 0
                                ? "Өнөөдөр дуусна"
                                : `${daysLeft} хоног үлдсэн`}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: amount + actions */}
                    <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
                      <p className="text-2xl font-black text-slate-900 sm:text-right">
                        {Number(payment.totalAmount).toLocaleString()}₮
                      </p>
                      {isUnpaid ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openPayModal(payment);
                          }}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#FFAD02] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#FFAD02]/25 transition-all hover:bg-[#E09D00] hover:shadow-xl hover:shadow-[#FFAD02]/30 active:scale-95"
                        >
                          <CreditCard className="h-4 w-4" />
                          Төлөх
                        </button>
                      ) : payment.paidAt ? (
                        <p className="text-xs text-emerald-600">
                          {new Date(payment.paidAt).toLocaleDateString("mn-MN")}{" "}
                          төлсөн
                        </p>
                      ) : null}
                      <button
                        onClick={() => openDetail(payment.id)}
                        className="hidden text-xs text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline sm:block"
                      >
                        Дэлгэрэнгүй
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ═══════ DETAIL MODAL ═══════ */}
        {showDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm print:bg-white print:p-0">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-auto rounded-3xl bg-white shadow-2xl print:shadow-none print:max-w-none print:max-h-none print:rounded-none">
              {loadingDetail ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-[#FFAD02]" />
                </div>
              ) : selectedPayment ? (
                <>
                  {/* Modal header */}
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-6 py-4 backdrop-blur-sm print:hidden">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        Нэхэмжлэх
                      </h2>
                      <p className="text-sm text-slate-500">
                        {selectedPayment.invoiceNumber}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {(selectedPayment.status === "PENDING" ||
                        selectedPayment.status === "FAILED") && (
                        <button
                          onClick={() => openPayModal(selectedPayment)}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#FFAD02] px-4 py-2 text-sm font-bold text-white shadow-lg shadow-[#FFAD02]/20 hover:bg-[#E09D00]"
                        >
                          <CreditCard className="h-4 w-4" />
                          Төлөх
                        </button>
                      )}
                      <button
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setShowDetail(false);
                          setSelectedPayment(null);
                        }}
                        className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Invoice content */}
                  <div className="p-6 print:p-4">
                    {/* Status banner */}
                    <div
                      className={`mb-6 rounded-2xl p-4 ${STATUS_COLORS[selectedPayment.status].bg}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span
                            className={`h-3 w-3 rounded-full ${STATUS_COLORS[selectedPayment.status].dot}`}
                          />
                          <span
                            className={`text-lg font-bold ${STATUS_COLORS[selectedPayment.status].text}`}
                          >
                            {STATUS_LABELS[selectedPayment.status]}
                          </span>
                        </div>
                        <span className="text-2xl font-black text-slate-900">
                          {Number(selectedPayment.totalAmount).toLocaleString()}
                          ₮
                        </span>
                      </div>
                    </div>

                    {/* Info grid */}
                    <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-slate-400">Нэхэмжлэх №</p>
                        <p className="mt-0.5 font-bold text-slate-900">
                          {selectedPayment.invoiceNumber}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-slate-400">Огноо</p>
                        <p className="mt-0.5 font-bold text-slate-900">
                          {new Date(
                            selectedPayment.createdAt,
                          ).toLocaleDateString("mn-MN")}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-slate-400">Хүсэлтийн дугаар</p>
                        <p className="mt-0.5 font-bold text-slate-900">
                          {selectedPayment.request?.requestNumber || "—"}
                        </p>
                      </div>
                      {selectedPayment.request?.warehouse && (
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-slate-400">Агуулах</p>
                          <p className="mt-0.5 font-bold text-slate-900">
                            {selectedPayment.request.warehouse.name}
                          </p>
                        </div>
                      )}
                      {selectedPayment.dueDate && (
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-slate-400">Төлөх хугацаа</p>
                          <p
                            className={`mt-0.5 font-bold ${
                              new Date(selectedPayment.dueDate) < new Date() &&
                              selectedPayment.status === "PENDING"
                                ? "text-red-600"
                                : "text-slate-900"
                            }`}
                          >
                            {new Date(
                              selectedPayment.dueDate,
                            ).toLocaleDateString("mn-MN")}
                          </p>
                        </div>
                      )}
                      {selectedPayment.paidAt && (
                        <div className="rounded-xl bg-emerald-50 p-3">
                          <p className="text-emerald-500">Төлсөн огноо</p>
                          <p className="mt-0.5 font-bold text-emerald-700">
                            {new Date(
                              selectedPayment.paidAt,
                            ).toLocaleDateString("mn-MN")}
                          </p>
                        </div>
                      )}
                      {selectedPayment.paymentMethod && (
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-slate-400">Төлбөрийн хэлбэр</p>
                          <p className="mt-0.5 font-bold text-slate-900">
                            {selectedPayment.paymentMethod === "CASH"
                              ? "Бэлнээр"
                              : selectedPayment.paymentMethod === "BANK"
                                ? "Банк шилжүүлэг"
                                : selectedPayment.paymentMethod === "QPAY"
                                  ? "QPay"
                                  : selectedPayment.paymentMethod}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Items table */}
                    <div className="mb-6">
                      <h3 className="mb-3 font-bold text-slate-800">Бараа</h3>
                      <div className="overflow-hidden rounded-2xl border border-slate-200">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-3 text-left font-semibold text-slate-500">
                                №
                              </th>
                              <th className="px-4 py-3 text-left font-semibold text-slate-500">
                                Бараа
                              </th>
                              <th className="px-4 py-3 text-center font-semibold text-slate-500">
                                Тоо
                              </th>
                              <th className="px-4 py-3 text-right font-semibold text-slate-500">
                                Үнэ
                              </th>
                              <th className="px-4 py-3 text-right font-semibold text-slate-500">
                                Нийт
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selectedPayment.request?.items?.map(
                              (item, idx) => {
                                const qty =
                                  item.approvedQuantity || item.quantity;
                                const price = Number(item.product.price);
                                return (
                                  <tr
                                    key={item.id}
                                    className="hover:bg-slate-50/50"
                                  >
                                    <td className="px-4 py-3 text-slate-400">
                                      {idx + 1}
                                    </td>
                                    <td className="px-4 py-3">
                                      <p className="font-medium text-slate-800">
                                        {item.product.name}
                                      </p>
                                      {item.product.sku && (
                                        <p className="text-xs text-slate-400">
                                          {item.product.sku}
                                        </p>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      {qty}
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-600">
                                      {price.toLocaleString()}₮
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                                      {(qty * price).toLocaleString()}₮
                                    </td>
                                  </tr>
                                );
                              },
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="flex justify-end">
                      <div className="w-72 space-y-2 rounded-2xl bg-slate-50 p-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Нийт дүн</span>
                          <span className="text-2xl font-black text-slate-900">
                            {Number(
                              selectedPayment.totalAmount,
                            ).toLocaleString()}
                            ₮
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Print footer */}
                    <div className="mt-8 hidden border-t border-slate-200 pt-4 text-center text-xs text-slate-400 print:block">
                      <p>MGL Store — Нэхэмжлэх</p>
                      <p>Хэвлэсэн: {new Date().toLocaleString("mn-MN")}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-slate-500">
                  Нэхэмжлэх олдсонгүй
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════ PAY MODAL ═══════ */}
        {showPayModal && payingPayment && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
              {paySuccess ? (
                <div className="flex flex-col items-center p-10">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle className="h-10 w-10 text-emerald-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Амжилттай төлөгдлөө!
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {payingPayment.invoiceNumber} нэхэмжлэх амжилттай төлөгдлөө
                  </p>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="border-b border-slate-100 px-6 py-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">
                          Төлбөр хийх
                        </h2>
                        <p className="text-sm text-slate-500">
                          {payingPayment.invoiceNumber}
                        </p>
                      </div>
                      <button
                        onClick={() => setShowPayModal(false)}
                        className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    {/* Amount */}
                    <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-center">
                      <p className="text-sm text-slate-500">Төлөх дүн</p>
                      <p className="text-4xl font-black text-slate-900">
                        {(
                          Number(payingPayment.totalAmount) -
                          Number(payingPayment.paidAmount)
                        ).toLocaleString()}
                        ₮
                      </p>
                    </div>
                  </div>

                  {qpayInvoice ? (
                    <div className="space-y-5 p-6 text-center">
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {qpayInvoice.devMode
                            ? "Local fake QPay"
                            : "QPay QR уншуулж төлнө үү"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {qpayInvoice.devMode
                            ? "Энэ QR зөвхөн local хөгжүүлэлтийн туршилтад ашиглагдана."
                            : "Төлбөр баталгаажмагц энэ цонх автоматаар шинэчлэгдэнэ."}
                        </p>
                      </div>

                      <div className="mx-auto flex h-60 w-60 items-center justify-center rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
                        {qpayInvoice.qrImage ? (
                          <img
                            src={`data:image/png;base64,${qpayInvoice.qrImage}`}
                            alt="QPay төлбөрийн QR код"
                            className="h-full w-full object-contain"
                          />
                        ) : qpayInvoice.qrText ? (
                          <QRCodeSVG
                            value={qpayInvoice.qrText}
                            size={208}
                            level="M"
                            aria-label="Local fake QPay QR код"
                          />
                        ) : (
                          <p className="text-sm text-slate-500">QR үүссэнгүй</p>
                        )}
                      </div>

                      {qpayInvoice.deepLinks.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          {qpayInvoice.deepLinks.map((bank) => (
                            <a
                              key={`${bank.name}-${bank.link}`}
                              href={bank.link}
                              className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                            >
                              {bank.logo && (
                                <img
                                  src={bank.logo}
                                  alt=""
                                  className="h-5 w-5 rounded object-contain"
                                />
                              )}
                              <span className="truncate">{bank.name}</span>
                            </a>
                          ))}
                        </div>
                      )}

                      {qpayInvoice.devMode ? (
                        <button
                          type="button"
                          onClick={() => void confirmDevQpay()}
                          disabled={confirmingDevQpay}
                          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition-colors hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60"
                        >
                          {confirmingDevQpay ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          Төлсөн гэж батлах (Local)
                        </button>
                      ) : (
                        <div className="flex items-center justify-center gap-2 rounded-xl bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-700">
                          <Loader2
                            className={`h-4 w-4 ${checkingQpay ? "animate-spin" : ""}`}
                          />
                          QPay төлбөр шалгаж байна
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setQpayInvoice(null)}
                        className="text-sm font-semibold text-slate-500 hover:text-slate-800"
                      >
                        Төлбөрийн хэлбэрээ солих
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Body */}
                      <div className="space-y-5 p-6">
                        {payError && (
                          <div className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-600">
                            {payError}
                          </div>
                        )}

                        {/* Payment method */}
                        <div>
                          <label className="mb-2 block text-sm font-bold text-slate-700">
                            Төлбөрийн хэлбэр{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              {
                                value: "BANK",
                                label: "Банк шилжүүлэг",
                                icon: Banknote,
                                color: "blue",
                              },
                              {
                                value: "QPAY",
                                label: "QPay",
                                icon: Smartphone,
                                color: "violet",
                              },
                              {
                                value: "CASH",
                                label: "Бэлнээр",
                                icon: DollarSign,
                                color: "emerald",
                              },
                            ].map((method) => {
                              const isSelected = paymentMethod === method.value;
                              return (
                                <button
                                  key={method.value}
                                  type="button"
                                  onClick={() => setPaymentMethod(method.value)}
                                  className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all ${
                                    isSelected
                                      ? `border-${method.color}-500 bg-${method.color}-50 shadow-md`
                                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                                  }`}
                                >
                                  <method.icon
                                    className={`h-6 w-6 ${
                                      isSelected
                                        ? `text-${method.color}-600`
                                        : "text-slate-400"
                                    }`}
                                  />
                                  <span
                                    className={`text-xs font-semibold ${
                                      isSelected
                                        ? `text-${method.color}-700`
                                        : "text-slate-500"
                                    }`}
                                  >
                                    {method.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Transaction ID */}
                        {paymentMethod === "BANK" && (
                          <div>
                            <label className="mb-1.5 block text-sm font-bold text-slate-700">
                              Гүйлгээний дугаар
                            </label>
                            <input
                              value={transactionId}
                              onChange={(e) => setTransactionId(e.target.value)}
                              placeholder="Гүйлгээний лавлах дугаар оруулна уу"
                              className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                            />
                          </div>
                        )}

                        {/* Note */}
                        <div>
                          <label className="mb-1.5 block text-sm font-bold text-slate-700">
                            Тэмдэглэл
                          </label>
                          <input
                            value={payNote}
                            onChange={(e) => setPayNote(e.target.value)}
                            placeholder="Нэмэлт тайлбар (заавал биш)"
                            className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                          />
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
                        <button
                          onClick={() => setShowPayModal(false)}
                          className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Болих
                        </button>
                        <button
                          onClick={submitPayment}
                          disabled={paying || !paymentMethod}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#FFAD02] py-3 text-sm font-bold text-white shadow-lg shadow-[#FFAD02]/25 transition-all hover:bg-[#E09D00] disabled:opacity-50"
                        >
                          {paying ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CreditCard className="h-4 w-4" />
                              Төлбөр хийх
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
