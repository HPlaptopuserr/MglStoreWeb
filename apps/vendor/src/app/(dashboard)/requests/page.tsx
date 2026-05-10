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
};

const STOCK_STATUS_LABEL: Record<StockRequestStatus, string> = {
  PENDING: "Хүлээгдэж буй",
  APPROVED: "Зөвшөөрөгдсөн",
  REJECTED: "Татгалзсан",
  PROCESSING: "Боловсруулж буй",
  COMPLETED: "Дууссан",
  CANCELLED: "Цуцлагдсан",
};

function statusBadge(status: string) {
  if (status === "PENDING") return "text-amber-700 bg-amber-100";
  if (status === "APPROVED" || status === "PROCESSING") return "text-blue-700 bg-blue-100";
  if (status === "COMPLETED") return "text-emerald-700 bg-emerald-100";
  if (status === "REJECTED" || status === "CANCELLED") return "text-red-700 bg-red-100";
  return "text-slate-700 bg-slate-100";
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

      {/* Recent stock requests */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900">Сүүлийн бараа таталтууд</h3>
          <ClipboardList className="h-5 w-5 text-slate-400" />
        </div>
        {stockRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
            <p className="text-sm font-medium text-slate-500">Одоогоор хүсэлт бүртгэгдээгүй байна.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stockRequests.slice(0, 8).map((r) => (
              <Link
                key={r.id}
                href="/shipments"
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-3.5 transition-colors hover:border-amber-200 hover:bg-amber-50/40"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <Truck className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">#{r.requestNumber}</p>
                    <p className="text-[11px] text-slate-400">{r.warehouse?.name || "Агуулах"}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${statusBadge(r.status)}`}>
                    {STOCK_STATUS_LABEL[r.status]}
                  </span>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {new Date(r.requestedAt).toLocaleDateString("mn-MN")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
