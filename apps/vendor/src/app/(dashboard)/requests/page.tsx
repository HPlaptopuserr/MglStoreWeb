"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  ClipboardList,
  CreditCard,
  Loader2,
  RotateCcw,
  Sparkles,
  Truck,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { API, authFetch } from "@/lib/api";

/* ── Types ──────────────────────────────────────────────── */
type StockRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "PROCESSING" | "COMPLETED" | "CANCELLED";
type StockRequest = {
  id: string;
  requestNumber: string;
  status: StockRequestStatus;
  requestedAt: string;
  warehouse?: { name: string };
  dispatch?: {
    status: string;
    driverName: string | null;
    driverPhone: string | null;
    vehicleNumber: string | null;
    dispatchedAt: string | null;
    deliveredAt: string | null;
  } | null;
  payment?: {
    totalAmount: number;
  } | null;
  items?: any[];
};

function formatMNT(amount: number) {
  return new Intl.NumberFormat("mn-MN").format(Math.round(amount)) + "₮";
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} мин өмнө`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} цаг өмнө`;
  const days = Math.floor(hrs / 24);
  return `${days} өдрийн өмнө`;
}

/* ════════════════════════════════════════════
   4-Level Dispatch Status Stepper
   ════════════════════════════════════════════ */
const DISPATCH_STEPS = [
  { key: "PENDING", label: "Хүлээгдэж буй", icon: Clock },
  { key: "CONFIRMED", label: "Баталгаажсан", icon: CheckCircle2 },
  { key: "DISPATCHED", label: "Илгээгдсэн", icon: Truck },
  { key: "DELIVERED", label: "Хүргэгдсэн", icon: CheckCircle2 },
] as const;

function getDispatchLevel(
  requestStatus: string,
  dispatch: { status: string } | null | undefined,
): number {
  if (requestStatus === "REJECTED" || requestStatus === "CANCELLED") return -1;
  if (requestStatus === "PENDING") return 0; // Not yet approved
  if (!dispatch) return 0;
  switch (dispatch.status) {
    case "PENDING":
      return 1;
    case "CONFIRMED":
      return 2;
    case "DISPATCHED":
      return 3;
    case "DELIVERED":
      return 4;
    case "CANCELLED":
      return -1;
    default:
      return 0;
  }
}

function DispatchStepper({
  status,
  dispatch,
}: {
  status: string;
  dispatch: {
    status: string;
    driverName: string | null;
    driverPhone: string | null;
    vehicleNumber: string | null;
    dispatchedAt: string | null;
    deliveredAt: string | null;
  } | null | undefined;
}) {
  const level = getDispatchLevel(status, dispatch || null);

  // Cancelled / rejected — show red badge
  if (level === -1) {
    const isCancelled = status === "CANCELLED" || dispatch?.status === "CANCELLED";
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 mt-3">
        <AlertCircle size={14} className="text-red-500" />
        <span className="text-xs font-bold text-red-600">
          {isCancelled ? "Цуцлагдсан" : "Татгалзсан"}
        </span>
      </div>
    );
  }

  // Pending request (not yet approved)
  if (status === "PENDING") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 mt-3">
        <Clock size={14} className="text-amber-500 animate-pulse" />
        <span className="text-xs font-bold text-amber-600">
          Админ зөвшөөрөлтөө хүлээж байна
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0 mt-3">
      {DISPATCH_STEPS.map((step, idx) => {
        const stepNum = idx + 1;
        const isCompleted = level >= stepNum;
        const isCurrent = level === stepNum;
        const StepIcon = step.icon;
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all ${
                  isCompleted
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : isCurrent
                      ? "border-[#FFAD02] bg-[#FFAD02] text-black animate-pulse"
                      : "border-slate-200 bg-white text-slate-300"
                }`}
              >
                <StepIcon size={13} />
              </div>
              <span
                className={`mt-1 text-[10px] font-bold text-center leading-tight ${
                  isCompleted
                    ? "text-emerald-600"
                    : isCurrent
                      ? "text-[#FFAD02]"
                      : "text-slate-300"
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < DISPATCH_STEPS.length - 1 && (
              <div
                className={`mx-1 h-0.5 flex-1 rounded-full transition-all ${
                  level > stepNum ? "bg-emerald-400" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────── */
export default function RequestsHubPage() {
  const [loading, setLoading] = useState(true);
  const [stockRequests, setStockRequests] = useState<StockRequest[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const storedUser = JSON.parse(localStorage.getItem("vendor_user") || "{}");
        if (storedUser.organizationId) {
          const res = await authFetch(`${API}/stock-requests?organizationId=${storedUser.organizationId}`);
          if (res?.ok) setStockRequests(await res.json() || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const summary = useMemo(() => ({
    total: stockRequests.length,
    pending: stockRequests.filter((r) => r.status === "PENDING").length,
    completed: stockRequests.filter((r) => r.status === "COMPLETED").length,
  }), [stockRequests]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-9 w-9 animate-spin text-[#FFAD02]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-2 md:space-y-8">

      {/* Back */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Буцах
        </Link>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-slate-100 p-6 md:p-8">
        <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-amber-200/50 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 left-10 h-32 w-32 rounded-full bg-black/10 blur-2xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white/90 px-3 py-1">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-black tracking-wide text-amber-700">ХҮСЭЛТҮҮД</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">Хүсэлтүүд</h1>
            <p className="mt-2 max-w-xl text-sm font-medium text-slate-600 md:text-base">
              Бараа таталт болон буцаалтын хүсэлтээ нэг дэлгэцээс хянана.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 md:min-w-[360px]">
            <div className="rounded-2xl bg-black p-4 text-white shadow-xl shadow-black/15">
              <p className="text-[10px] uppercase tracking-wide text-white/70">Нийт</p>
              <p className="mt-1 text-2xl font-black">{summary.total}</p>
            </div>
            <div className="rounded-2xl bg-amber-400 p-4 text-black shadow-xl shadow-amber-200">
              <p className="text-[10px] uppercase tracking-wide text-black/70">Хүлээгдэж буй</p>
              <p className="mt-1 text-2xl font-black">{summary.pending}</p>
            </div>
            <div className="rounded-2xl bg-emerald-500 p-4 text-white shadow-xl shadow-emerald-200">
              <p className="text-[10px] uppercase tracking-wide text-white/70">Дууссан</p>
              <p className="mt-1 text-2xl font-black">{summary.completed}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Request type cards */}
      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            key: "stock",
            title: "Бараа татах хүсэлт",
            desc: "Агуулахаас бараа татах урсгал",
            count: `${summary.total} бүртгэл`,
            href: "/shipments",
            icon: Truck,
            accent: "from-[#FFAD02] to-amber-300",
            iconBg: "bg-amber-50 text-amber-700",
          },
          {
            key: "returns",
            title: "Буцаалтын хүсэлт",
            desc: "Гэмтэл, зөрүүтэй барааны буцаалт",
            count: "0 бүртгэл",
            href: "/returns",
            icon: RotateCcw,
            accent: "from-slate-900 to-slate-700",
            iconBg: "bg-slate-100 text-slate-700",
          },
          {
            key: "card",
            title: "Card Terminal",
            desc: "Картаар төлбөр хүлээн авах terminal холбох",
            count: "Хүсэлт илгээх",
            href: "/card-terminal",
            icon: CreditCard,
            accent: "from-blue-500 to-indigo-500",
            iconBg: "bg-blue-50 text-blue-600",
          },
        ].map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
          >
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${item.accent}`} />
            <div className="mb-4 flex items-start justify-between">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.iconBg}`}>
                <item.icon className="h-6 w-6" />
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-slate-500" />
            </div>
            <h2 className="text-base font-black tracking-tight text-slate-900">{item.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{item.desc}</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
              <Boxes className="h-3.5 w-3.5" />
              {item.count}
            </div>
          </Link>
        ))}
      </section>

      {/* Recent stock requests detailed list */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Бүх бараа таталтууд</h3>
              <p className="text-xs text-slate-500">Түүхчилсэн жагсаалт ба явц</p>
            </div>
          </div>
        </div>
        {stockRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
            <Truck size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">Одоогоор хүсэлт бүртгэгдээгүй байна.</p>
            <Link
              href="/shipments"
              className="mt-3 inline-flex text-xs font-bold text-[#FFAD02] hover:underline"
            >
              Шинэ хүсэлт үүсгэх →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {stockRequests.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-slate-100 bg-white p-5 transition-colors hover:border-amber-200 hover:bg-amber-50/20 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="hidden shrink-0 sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                      <Truck className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 pt-1">
                      <p className="text-base font-black text-slate-900 truncate">
                        #{r.requestNumber}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">
                        {r.warehouse?.name || "Агуулах"} · {r.items?.length || 0} бүтээгдэхүүн
                        {r.payment?.totalAmount ? ` · ${formatMNT(r.payment.totalAmount)}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4 pt-1">
                    <span className="text-xs font-semibold text-slate-400 block mb-1">
                      {timeAgo(r.requestedAt)}
                    </span>
                    <span className="text-[10px] text-slate-300">
                      {new Date(r.requestedAt).toLocaleDateString("mn-MN")}
                    </span>
                  </div>
                </div>
                
                <DispatchStepper status={r.status} dispatch={r.dispatch} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
