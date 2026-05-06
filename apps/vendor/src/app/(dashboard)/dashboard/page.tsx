"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Megaphone,
  Wrench,
  AlertCircle,
  Eye,
  ArrowRight,
  TrendingUp,
  ShoppingCart,
  CreditCard,
  Barcode,
  ChevronRight,
  Boxes,
  Zap,
  ReceiptText,
} from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:4000";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Хүлээгдэж буй",
  APPROVED: "Зөвшөөрсөн",
  COMPLETED: "Дууссан",
  REJECTED: "Татгалзсан",
  CANCELLED: "Цуцлагдсан",
  IN_PROGRESS: "Хийгдэж байна",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-blue-50 text-blue-700 border-blue-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  CANCELLED: "bg-gray-100 text-gray-500 border-gray-200",
  IN_PROGRESS: "bg-purple-50 text-purple-700 border-purple-200",
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
};

const SERVICE_TYPE_LABEL: Record<string, string> = {
  POSTER_DESIGN: "Постер дизайн",
  PRODUCT_PHOTOSHOOT: "Бараа зурагчлал",
  LEGAL_CONSULTATION: "Хуулийн зөвлөгөө",
  TRAINING: "Сургалт",
  HR_SERVICE: "HR үйлчилгээ",
  MARKETING: "Маркетинг",
  OTHER: "Бусад",
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

interface DashboardData {
  products: { total: number; active: number; inactive: number };
  servicePosts: { total: number; active: number; totalViews: number };
  stockRequests: {
    pending: number;
    approved: number;
    completed: number;
    rejected: number;
    cancelled: number;
    total: number;
  };
  serviceRequests: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  };
  warehouses: number;
  pendingPayments: { count: number; totalAmount: number };
  recentStockRequests: {
    id: string;
    requestNumber: string;
    status: string;
    warehouseName: string;
    itemCount: number;
    totalAmount: number | null;
    paymentStatus: string | null;
    createdAt: string;
    dispatch: {
      id: string;
      dispatchNumber: string;
      status: string;
      driverName: string | null;
      driverPhone: string | null;
      vehicleNumber: string | null;
      dispatchedAt: string | null;
      deliveredAt: string | null;
    } | null;
  }[];
  recentServiceRequests: {
    id: string;
    title: string;
    type: string;
    status: string;
    createdAt: string;
  }[];
}

export default function Dashboard() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("Байгууллага");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("vendor_user");
      if (raw) {
        const u = JSON.parse(raw);
        if (u.organizationName) setOrgName(u.organizationName);
        if (u.organizationId) setOrgId(u.organizationId);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    const token = localStorage.getItem("vendor_token");
    fetch(`${API_BASE}/api/vendor/dashboard/stats?organizationId=${orgId}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((r) => {
        if (r.status === 401) {
          localStorage.removeItem("vendor_token");
          localStorage.removeItem("vendor_user");
          router.replace("/login");
          return;
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (d) {
          setData(d);
          setError("");
        }
      })
      .catch(() => setError("Мэдээлэл татахад алдаа гарлаа"))
      .finally(() => setLoading(false));
  }, [orgId, router]);

  const activeShipments = data
    ? (data.stockRequests?.pending ?? 0) + (data.stockRequests?.approved ?? 0)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8">
      {/* ── Header ── */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Хяналтын самбар
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {orgName}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/sales"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <ReceiptText size={15} />
            Борлуулалт
          </Link>
          <Link
            href="/pos"
            className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700 hover:bg-violet-100 transition-colors"
          >
            <Barcode size={15} />
            POS Demo
          </Link>
          {(data?.pendingPayments?.count ?? 0) > 0 && (
            <Link
              href="/shipments"
              className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-100 transition-colors"
            >
              <AlertCircle size={15} />
              {data!.pendingPayments.count} төлбөр хүлээгдэж байна
            </Link>
          )}
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-wide text-slate-600">
              Онлайн
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#FFAD02]" />
          <p className="text-sm text-slate-400 font-medium">Мэдээлэл татаж байна...</p>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <AlertCircle className="mx-auto mb-3 text-red-400" size={40} />
            <p className="text-sm font-medium text-slate-500">{error}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Hero Stats row ── */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {/* Active shipments - hero yellow */}
            <Link
              href="/shipments"
              className="group col-span-2 relative overflow-hidden rounded-2xl bg-[#FFAD02] p-6 shadow-lg shadow-amber-200/60 transition-all hover:-translate-y-0.5 hover:shadow-amber-200/80"
            >
              <div className="relative z-10 flex flex-col h-full min-h-[130px] justify-between">
                <div className="flex items-start justify-between">
                  <div className="rounded-2xl bg-black/10 p-3">
                    <Truck className="h-6 w-6 text-black" />
                  </div>
                  <span className="flex items-center gap-1.5 rounded-full bg-black/10 px-3 py-1 text-xs font-bold text-black/80">
                    <Zap size={11} />
                    Идэвхтэй
                  </span>
                </div>
                <div>
                  <p className="mb-1 text-4xl font-bold leading-none text-black">
                    {activeShipments}
                  </p>
                  <p className="text-sm font-medium text-black/60">
                    Нийлүүлэлтийн хүсэлт —{" "}
                    <span className="font-semibold text-black/80">
                      {data?.stockRequests.pending ?? 0} хүлээгдэж,{" "}
                      {data?.stockRequests.approved ?? 0} зөвшөөрсөн
                    </span>
                  </p>
                </div>
              </div>
              <div className="absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-white/15 blur-2xl group-hover:scale-110 transition-transform duration-500" />
            </Link>

            {/* Completed */}
            <Link
              href="/shipments"
              className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative z-10 flex flex-col h-full min-h-[130px] justify-between">
                <div className="rounded-2xl bg-white/10 p-3 w-fit">
                  <CheckCircle2 className="h-5 w-5 text-[#FFAD02]" />
                </div>
                <div>
                  <p className="mb-1 text-4xl font-bold leading-none text-white">
                    {data?.stockRequests.completed ?? 0}
                  </p>
                  <p className="text-sm font-medium text-slate-300">Хүргэгдсэн</p>
                </div>
              </div>
              <div className="absolute -bottom-10 -right-10 h-36 w-36 rounded-full bg-[#FFAD02]/10 blur-2xl" />
            </Link>

            {/* Pending payment */}
            <Link
              href="/shipments"
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex flex-col h-full min-h-[130px] justify-between">
                <div className="rounded-2xl bg-rose-50 p-3 w-fit">
                  <CreditCard className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <p className="mb-1 text-2xl font-bold leading-none text-slate-900">
                    {data?.pendingPayments.totalAmount
                      ? formatMNT(data.pendingPayments.totalAmount)
                      : "0₮"}
                  </p>
                  <p className="text-sm font-medium text-slate-500">Төлөх дүн</p>
                </div>
              </div>
            </Link>
          </div>

          {/* ── Secondary stat row ── */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              {
                icon: Package,
                label: "Бүтээгдэхүүн",
                value: data?.products.total ?? 0,
                sub: `${data?.products.active ?? 0} идэвхтэй`,
                href: "/products",
                color: "bg-violet-50 text-violet-600",
              },
              {
                icon: Megaphone,
                label: "Зар",
                value: data?.servicePosts.total ?? 0,
                sub: `${data?.servicePosts.totalViews ?? 0} үзэлт`,
                href: "/service-posts",
                color: "bg-pink-50 text-pink-600",
              },
              {
                icon: Wrench,
                label: "Үйлчилгээ",
                value: data?.serviceRequests.total ?? 0,
                sub: `${data?.serviceRequests.pending ?? 0} хүлээгдэж буй`,
                href: "/service-posts",
                color: "bg-emerald-50 text-emerald-600",
              },
            ].map((s) => (
              <Link
                key={s.label}
                href={s.href}
                className="group flex flex-col gap-4 rounded-2xl bg-white border border-slate-100 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className={`w-fit rounded-xl p-2.5 ${s.color}`}>
                  <s.icon size={18} />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">{s.value}</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">{s.label}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{s.sub}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* ── Stock request status overview ── */}
          <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-slate-100 p-2">
                  <Boxes size={16} className="text-slate-700" />
                </div>
                <h2 className="text-base font-semibold text-slate-900">Нийлүүлэлтийн хүсэлтийн байдал</h2>
              </div>
              <Link
                href="/shipments"
                className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors"
              >
                Бүгдийг харах <ChevronRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: "Хүлээгдэж буй", value: data?.stockRequests.pending ?? 0, color: "text-amber-600 bg-amber-50", bar: "bg-amber-400" },
                { label: "Зөвшөөрсөн", value: data?.stockRequests.approved ?? 0, color: "text-blue-600 bg-blue-50", bar: "bg-blue-400" },
                { label: "Дууссан", value: data?.stockRequests.completed ?? 0, color: "text-emerald-600 bg-emerald-50", bar: "bg-emerald-400" },
                { label: "Татгалзсан", value: data?.stockRequests.rejected ?? 0, color: "text-red-600 bg-red-50", bar: "bg-red-400" },
                { label: "Цуцлагдсан", value: data?.stockRequests.cancelled ?? 0, color: "text-slate-500 bg-slate-100", bar: "bg-slate-300" },
              ].map((s) => {
                const pct = data?.stockRequests.total
                  ? Math.round((s.value / data.stockRequests.total) * 100)
                  : 0;
                return (
                  <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
                    <p className="text-xl font-bold">{s.value}</p>
                    <p className="mt-1 text-xs font-semibold opacity-80">{s.label}</p>
                    <div className="mt-2 h-1.5 rounded-full bg-black/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s.bar} opacity-70`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Bottom two columns ── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            {/* Recent stock requests with dispatch tracking */}
            <div className="lg:col-span-3 rounded-2xl bg-white border border-slate-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-slate-100 p-2">
                    <ShoppingCart size={16} className="text-slate-700" />
                  </div>
                  <h2 className="text-base font-semibold text-slate-900">Сүүлийн хүсэлтүүд</h2>
                </div>
                <Link
                  href="/shipments"
                  className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors"
                >
                  Бүгд <ChevronRight size={14} />
                </Link>
              </div>

              {data?.recentStockRequests?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Truck size={32} className="text-slate-200 mb-3" />
                  <p className="text-sm font-medium text-slate-400">Нийлүүлэлтийн хүсэлт байхгүй</p>
                  <Link
                    href="/shipments"
                    className="mt-3 text-xs font-bold text-[#FFAD02] hover:underline"
                  >
                    Шинэ хүсэлт үүсгэх →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {data?.recentStockRequests?.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-xl border border-slate-100 p-4 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="hidden shrink-0 sm:flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
                            <Truck size={15} className="text-slate-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">
                              #{r.requestNumber}
                            </p>
                            <p className="text-xs text-slate-400 truncate">
                              {r.warehouseName} · {r.itemCount} бүтээгдэхүүн
                              {r.totalAmount ? ` · ${formatMNT(r.totalAmount)}` : ""}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                          {timeAgo(r.createdAt)}
                        </span>
                      </div>
                      <DispatchStepper status={r.status} dispatch={r.dispatch} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right column: Quick actions + Service requests */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              {/* Quick actions */}
              <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="rounded-lg bg-slate-100 p-2">
                    <Zap size={16} className="text-slate-700" />
                  </div>
                  <h2 className="text-base font-semibold text-slate-900">Хурдан үйлдэл</h2>
                </div>
                <div className="space-y-2">
                  {[
                    { href: "/shipments", icon: Truck, label: "Нийлүүлэлт хүсэх", desc: "Агуулахаас бараа авах", color: "bg-[#FFAD02]", textColor: "text-black" },
                    { href: "/products", icon: Package, label: "Бараа нэмэх", desc: "Шинэ бүтээгдэхүүн", color: "bg-slate-900", textColor: "text-white" },
                    { href: "/service-posts", icon: Megaphone, label: "Зар нийтлэх", desc: "Зар сурталчилгаа", color: "bg-pink-500", textColor: "text-white" },
                    { href: "/service-posts", icon: Wrench, label: "Үйлчилгээний постууд", desc: "Хүсэлтүүдээ харах", color: "bg-slate-100", textColor: "text-slate-700" },
                  ].map((a) => (
                    <Link
                      key={a.href}
                      href={a.href}
                      className="flex items-center justify-between rounded-xl p-3 hover:bg-slate-50 transition-colors border border-slate-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${a.color}`}>
                          <a.icon size={16} className={a.textColor} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{a.label}</p>
                          <p className="text-[11px] text-slate-400">{a.desc}</p>
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-slate-300" />
                    </Link>
                  ))}
                </div>
              </div>

              {/* Recent service requests */}
              {(data?.recentServiceRequests?.length ?? 0) > 0 && (
                <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-slate-100 p-2">
                        <Wrench size={16} className="text-slate-700" />
                      </div>
                      <h2 className="text-sm font-semibold text-slate-900">Сүүлийн үйлчилгээ</h2>
                    </div>
                    <Link href="/service-posts" className="text-[10px] font-bold text-slate-400 hover:text-slate-600">
                      Бүгд →
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {data?.recentServiceRequests?.map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-700 truncate">{r.title}</p>
                          <p className="text-[10px] text-slate-400">{SERVICE_TYPE_LABEL[r.type] || r.type}</p>
                        </div>
                        <span className={`ml-2 shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold ${STATUS_COLOR[r.status] || "bg-slate-100 text-slate-500 border-slate-200"}`}>
                          {STATUS_LABEL[r.status] || r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
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
  dispatch: { status: string } | null,
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
  } | null;
}) {
  const level = getDispatchLevel(status, dispatch);

  // Cancelled / rejected — show red badge
  if (level === -1) {
    const isCancelled = status === "CANCELLED" || dispatch?.status === "CANCELLED";
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
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
      <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2">
        <Clock size={14} className="text-amber-500 animate-pulse" />
        <span className="text-xs font-bold text-amber-600">
          Админ зөвшөөрөлтөө хүлээж байна
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0">
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
