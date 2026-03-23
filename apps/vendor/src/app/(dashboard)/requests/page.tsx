"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Boxes,
  ClipboardList,
  Loader2,
  RotateCcw,
  Sparkles,
  Truck,
  Wrench,
} from "lucide-react";
import { API } from "@/lib/api";

type StockRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "PROCESSING"
  | "COMPLETED"
  | "CANCELLED";

type ServiceRequestStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

type StockRequest = {
  id: string;
  requestNumber: string;
  status: StockRequestStatus;
  requestedAt: string;
  warehouse?: { name: string };
};

type ServiceRequest = {
  id: string;
  title: string;
  status: ServiceRequestStatus;
  createdAt: string;
};

const stockStatusLabel: Record<StockRequestStatus, string> = {
  PENDING: "Хүлээгдэж буй",
  APPROVED: "Зөвшөөрөгдсөн",
  REJECTED: "Татгалзсан",
  PROCESSING: "Боловсруулж буй",
  COMPLETED: "Дууссан",
  CANCELLED: "Цуцлагдсан",
};

const serviceStatusLabel: Record<ServiceRequestStatus, string> = {
  PENDING: "Хүлээгдэж буй",
  IN_PROGRESS: "Хийгдэж буй",
  COMPLETED: "Дууссан",
  CANCELLED: "Цуцлагдсан",
};

const statusColor = (status: string) => {
  if (status === "PENDING") return "text-amber-700 bg-amber-100";
  if (status === "APPROVED" || status === "IN_PROGRESS") {
    return "text-blue-700 bg-blue-100";
  }
  if (status === "COMPLETED") return "text-emerald-700 bg-emerald-100";
  if (status === "REJECTED" || status === "CANCELLED") {
    return "text-red-700 bg-red-100";
  }
  return "text-slate-700 bg-slate-100";
};

export default function RequestsHubPage() {
  const [loading, setLoading] = useState(true);
  const [stockRequests, setStockRequests] = useState<StockRequest[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const storedUser = JSON.parse(localStorage.getItem("vendor_user") || "{}");
        if (!storedUser.organizationId) {
          setLoading(false);
          return;
        }

        const [stockRes, serviceRes] = await Promise.all([
          fetch(`${API}/stock-requests?organizationId=${storedUser.organizationId}`),
          fetch(`${API}/service-requests/organization/${storedUser.organizationId}`),
        ]);

        if (stockRes.ok) {
          const stockData = (await stockRes.json()) || [];
          setStockRequests(stockData);
        }

        if (serviceRes.ok) {
          const serviceData = (await serviceRes.json()) || [];
          setServiceRequests(serviceData);
        }
      } catch (error) {
        console.error("Failed to load requests hub data:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const summary = useMemo(() => {
    const stockPending = stockRequests.filter((r) => r.status === "PENDING").length;
    const servicePending = serviceRequests.filter((r) => r.status === "PENDING").length;

    return {
      total: stockRequests.length + serviceRequests.length,
      pending: stockPending + servicePending,
      stock: stockRequests.length,
      service: serviceRequests.length,
      returns: 0,
    };
  }, [serviceRequests, stockRequests]);

  const recentFeed = useMemo(() => {
    const stockFeed = stockRequests.slice(0, 5).map((item) => ({
      id: item.id,
      type: "Бараа таталт",
      title: `#${item.requestNumber}`,
      status: item.status,
      date: item.requestedAt,
      meta: item.warehouse?.name || "Агуулах",
      href: "/shipments",
    }));

    const serviceFeed = serviceRequests.slice(0, 5).map((item) => ({
      id: item.id,
      type: "Үйлчилгээ",
      title: item.title,
      status: item.status,
      date: item.createdAt,
      meta: "Үйлчилгээний хүсэлт",
      href: "/services",
    }));

    return [...stockFeed, ...serviceFeed]
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
      .slice(0, 8);
  }, [serviceRequests, stockRequests]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-9 w-9 animate-spin text-[#FFAD02]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-2 md:space-y-8">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Буцах
        </Link>
      </div>

      <section className="relative overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-slate-100 p-6 md:p-8">
        <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-amber-200/50 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 left-10 h-32 w-32 rounded-full bg-black/10 blur-2xl" />

        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white/90 px-3 py-1">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-black tracking-wide text-amber-700">
                REQUEST COMMAND CENTER
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
              Хүсэлтүүд
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-slate-600 md:text-base">
              Бараа таталт, буцаалт, үйлчилгээний хүсэлтээ нэг дэлгэцээс хянаж,
              шаардлагатай үйлдэл рүү шууд орно.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:min-w-[340px]">
            <div className="rounded-2xl bg-black p-4 text-white shadow-xl shadow-black/15">
              <p className="text-xs uppercase tracking-wide text-white/70">Нийт хүсэлт</p>
              <p className="mt-1 text-2xl font-black">{summary.total}</p>
            </div>
            <div className="rounded-2xl bg-amber-400 p-4 text-black shadow-xl shadow-amber-200">
              <p className="text-xs uppercase tracking-wide text-black/70">Хүлээгдэж буй</p>
              <p className="mt-1 text-2xl font-black">{summary.pending}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            key: "stock",
            title: "Бараа татах хүсэлт",
            desc: "Агуулахаас бараа татах урсгал",
            count: summary.stock,
            href: "/shipments",
            icon: Truck,
            accent: "from-[#FFAD02] to-amber-300 text-black",
          },
          {
            key: "returns",
            title: "Буцаалтын хүсэлт",
            desc: "Гэмтэл, зөрүүтэй барааны буцаалт",
            count: summary.returns,
            href: "/returns",
            icon: RotateCcw,
            accent: "from-slate-900 to-slate-700 text-white",
          },
          {
            key: "service",
            title: "Үйлчилгээний хүсэлт",
            desc: "Маркетинг, зураг авалт, сургалт",
            count: summary.service,
            href: "/services",
            icon: Wrench,
            accent: "from-amber-100 to-amber-50 text-slate-900",
          },
        ].map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
          >
            <div
              className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${item.accent}`}
            />
            <div className="mb-4 flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                <item.icon className="h-6 w-6" />
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-slate-500" />
            </div>
            <h2 className="text-lg font-black tracking-tight text-slate-900">{item.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{item.desc}</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
              <Boxes className="h-3.5 w-3.5" />
              {item.count} бүртгэл
            </div>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900">Сүүлийн хүсэлтүүд</h3>
            <ClipboardList className="h-5 w-5 text-slate-400" />
          </div>

          {recentFeed.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
              <p className="text-sm font-medium text-slate-500">Одоогоор хүсэлт бүртгэгдээгүй байна.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentFeed.map((entry) => (
                <Link
                  key={`${entry.type}-${entry.id}`}
                  href={entry.href}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 transition-colors hover:border-amber-200 hover:bg-amber-50/40"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900">{entry.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{entry.type} • {entry.meta}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${statusColor(entry.status)}`}>
                      {entry.type === "Үйлчилгээ"
                        ? serviceStatusLabel[entry.status as ServiceRequestStatus]
                        : stockStatusLabel[entry.status as StockRequestStatus]}
                    </span>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {new Date(entry.date).toLocaleDateString("mn-MN")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="text-sm font-black uppercase tracking-wide">Анхаарах хэсэг</h3>
          </div>
          <p className="text-sm text-red-800">
            Буцаалтын хүсэлтийн API урсгал одоогоор demo төлөвтэй байна. Хэрэглэгчийн
            үйлдлийг алдахгүйгээр шилжүүлэхийн тулд буцаалтын backend-ийг дараагийн
            алхмаар нэгтгэнэ.
          </p>
          <Link
            href="/returns"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700"
          >
            Буцаалт нээх <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
