"use client";

import { useEffect, useState, useRef } from "react";
import {
  Globe,
  Zap,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  Calendar,
  Crown,
  Image,
  Tag,
  BarChart2,
  Package,
  Sparkles,
  X,
  ShieldCheck,
  TrendingUp,
  Star,
  ArrowRight,
  Clock,
} from "lucide-react";
import { API, authFetch } from "@/lib/api";

type Plan = {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  maxProducts: number;
  maxImages: number;
  maxCategories: number;
  hasBanner: boolean;
  hasAnalytics: boolean;
  isTrial: boolean;
  badge?: string;
};

type UpgradeStatus = {
  subdomainEnabled: boolean;
  subdomain: string;
  planType: string | null;
  planActivatedAt: string | null;
  planExpiresAt: string | null;
  trialUsed: boolean;
  isActive: boolean;
  currentPlan: Plan | null;
  pendingInvoice: {
    invoiceId: string;
    invoiceNo: string;
    qrText: string;
    amount: number;
    planType: string;
    createdAt: string;
  } | null;
  plans: Plan[];
};

function fmt(n: number) {
  return n === -1 ? "Хязгааргүй" : n.toLocaleString();
}

function StatCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: any;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-4 ${highlight ? "bg-amber-50 border border-amber-100" : "bg-slate-50 border border-slate-100"}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${highlight ? "bg-amber-100" : "bg-white border border-slate-200"}`}>
          <Icon className={`w-3.5 h-3.5 ${highlight ? "text-amber-600" : "text-slate-500"}`} />
        </div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-lg font-black ${highlight ? "text-amber-700" : "text-slate-800"}`}>{value}</p>
    </div>
  );
}

const PLAN_LABELS: Record<string, { months: string; perMonth: string }> = {
  "1 Сар": { months: "1", perMonth: "" },
  "3 Сар": { months: "3", perMonth: "43,300₮/сар" },
  "6 Сар": { months: "6", perMonth: "39,983₮/сар" },
  "1 Жил": { months: "12", perMonth: "37,492₮/сар" },
};

function PlanCard({
  plan,
  selected,
  trialUsed,
  onSelect,
  isRenew,
}: {
  plan: Plan;
  selected: boolean;
  trialUsed: boolean;
  onSelect: (id: string) => void;
  isRenew?: boolean;
}) {
  const disabled = plan.isTrial && trialUsed;
  const isMostPopular = plan.badge === "ХЭМНЭЛТТЭЙ" || plan.badge === "Most Popular";
  const isBestValue = plan.badge === "ХАМГИЙН АШИГТАЙ";
  const isUrgent = plan.badge === "АЛДАРТАЙ";

  const getBadgeStyle = () => {
    if (isMostPopular) return "bg-[#FFAD02] text-black";
    if (isBestValue) return "bg-emerald-500 text-white";
    if (isUrgent) return "bg-rose-500 text-white";
    return "bg-slate-700 text-white";
  };

  return (
    <button
      onClick={() => !disabled && onSelect(plan.id)}
      disabled={disabled}
      className={`relative w-full text-left rounded-2xl border-2 p-5 transition-all duration-200 ${
        disabled
          ? "opacity-40 cursor-not-allowed border-slate-200 bg-slate-50"
          : selected
          ? "border-[#FFAD02] bg-gradient-to-br from-amber-50 to-white shadow-lg shadow-amber-100/60 scale-[1.02]"
          : isMostPopular
          ? "border-amber-200 bg-white hover:border-[#FFAD02] hover:shadow-md hover:scale-[1.01]"
          : "border-slate-200 bg-white hover:border-amber-300 hover:shadow-sm hover:scale-[1.005]"
      }`}
    >
      {(plan.badge || plan.isTrial) && (
        <span
          className={`absolute -top-3 left-4 px-3 py-0.5 text-[10px] font-black rounded-full uppercase tracking-widest ${
            plan.isTrial ? "bg-emerald-500 text-white" : getBadgeStyle()
          }`}
        >
          {plan.isTrial ? "Үнэгүй туршилт" : plan.badge}
        </span>
      )}

      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-black text-slate-900 text-base leading-tight">{plan.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {plan.isTrial ? "14 хоног" : `${plan.durationDays} хоног`}
          </p>
        </div>
        <div className="text-right">
          {plan.price === 0 ? (
            <p className="text-2xl font-black text-emerald-600">Үнэгүй</p>
          ) : (
            <>
              <p className="text-2xl font-black text-slate-900 leading-none">
                {plan.price.toLocaleString()}
                <span className="text-sm font-bold text-slate-400">₮</span>
              </p>
              {PLAN_LABELS[plan.name]?.perMonth && (
                <p className="text-[10px] text-slate-400 mt-0.5">{PLAN_LABELS[plan.name].perMonth}</p>
              )}
            </>
          )}
        </div>
      </div>

      {!isRenew && (
        <div className="space-y-2 pt-3 border-t border-slate-100">
          {[
            { icon: Package, label: "Бүтээгдэхүүн", value: fmt(plan.maxProducts) },
            { icon: Image, label: "Зураг / бараа", value: fmt(plan.maxImages) },
            { icon: Tag, label: "Ангилал", value: fmt(plan.maxCategories) },
            { icon: Star, label: "Banner зураг", value: plan.hasBanner },
            { icon: BarChart2, label: "Аналитик", value: plan.hasAnalytics },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-2 text-xs">
              <Icon className={`w-3.5 h-3.5 shrink-0 ${value === false ? "text-slate-200" : "text-amber-400"}`} />
              <span className="text-slate-500 flex-1">{label}</span>
              <span className={`font-bold ${value === false ? "text-slate-300" : "text-slate-700"}`}>
                {value === true ? "✓" : value === false ? "—" : value}
              </span>
            </div>
          ))}
        </div>
      )}

      {selected && !disabled && (
        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 rounded-xl py-2">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Сонгогдсон
        </div>
      )}
      {disabled && (
        <p className="mt-3 text-center text-xs font-semibold text-slate-400">Аль хэдийн ашигласан</p>
      )}
    </button>
  );
}

export default function UpgradePage() {
  const [status, setStatus] = useState<UpgradeStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [paid, setPaid] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getOrgId = () => {
    try {
      const user = JSON.parse(localStorage.getItem("vendor_user") || "{}");
      if (user.organizationId) return user.organizationId as string;
      const token = localStorage.getItem("vendor_token");
      const payload = token ? JSON.parse(atob(token.split(".")[1] || "")) : null;
      return payload?.organizationId as string | undefined;
    } catch {
      return undefined;
    }
  };

  const withOrgId = (url: string) => {
    const orgId = getOrgId();
    if (!orgId) return url;
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}organizationId=${encodeURIComponent(orgId)}`;
  };

  const loadStatus = async () => {
    try {
      const res = await authFetch(withOrgId(`${API}/vendor/upgrade/status`));
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStatus(data);
        } else {
          setMessage({ type: "error", text: data.message || "Төлөвийн мэдээлэл авахад алдаа гарлаа" });
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage({ type: "error", text: err.message || "Серверийн алдаа. Дахин оролдоно уу." });
      }
    } catch (e) {
      console.error(e);
      setMessage({ type: "error", text: "Холболтын алдаа. Дахин оролдоно уу." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    if (!status?.pendingInvoice?.invoiceId || paid) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await authFetch(
          withOrgId(`${API}/vendor/upgrade/check/${status.pendingInvoice!.invoiceId}`),
          { method: "POST" },
        );
        const data = await res.json();
        if (data.paid) {
          clearInterval(pollRef.current!);
          setPaid(true);
          setMessage({ type: "success", text: "Амжилттай! Таны Pro план идэвхжлээ." });
          await loadStatus();
        }
      } catch {
        /* silent */
      }
    }, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [status?.pendingInvoice?.invoiceId, paid]);

  const handleActivateTrial = async () => {
    setIsActing(true);
    setMessage(null);
    try {
      const res = await authFetch(withOrgId(`${API}/vendor/upgrade/trial`), { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setPaid(true);
        setMessage({ type: "success", text: "14 хоногийн үнэгүй туршилт идэвхжлээ!" });
        await loadStatus();
      } else {
        setMessage({ type: "error", text: data.message || "Алдаа гарлаа" });
      }
    } catch {
      setMessage({ type: "error", text: "Серверийн алдаа" });
    } finally {
      setIsActing(false);
    }
  };

  const handleInitiate = async () => {
    if (!selectedPlan || selectedPlan === "trial") return;
    setIsActing(true);
    setMessage(null);
    try {
      const res = await authFetch(withOrgId(`${API}/vendor/upgrade/initiate`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlan }),
      });
      const data = await res.json();
      if (data.success) {
        await loadStatus();
      } else {
        setMessage({ type: "error", text: data.message || "Нэхэмжлэл үүсгэхэд алдаа гарлаа" });
      }
    } catch {
      setMessage({ type: "error", text: "Серверийн алдаа" });
    } finally {
      setIsActing(false);
    }
  };

  const handleCheck = async () => {
    if (!status?.pendingInvoice?.invoiceId) return;
    setIsChecking(true);
    try {
      const res = await authFetch(
        withOrgId(`${API}/vendor/upgrade/check/${status.pendingInvoice.invoiceId}`),
        { method: "POST" },
      );
      const data = await res.json();
      if (data.paid) {
        setPaid(true);
        setMessage({ type: "success", text: "Амжилттай! Таны Pro план идэвхжлээ." });
        await loadStatus();
      } else {
        setMessage({ type: "error", text: "Төлбөр баталгаажаагүй байна. Түр хүлээгээд дахин шалгана уу." });
      }
    } catch {
      setMessage({ type: "error", text: "Серверийн алдаа" });
    } finally {
      setIsChecking(false);
    }
  };

  const copyQR = () => {
    if (!status?.pendingInvoice?.qrText) return;
    navigator.clipboard.writeText(status.pendingInvoice.qrText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#FFAD02]" />
        <p className="text-sm text-slate-400 font-medium">Уншиж байна...</p>
      </div>
    );
  }

  const isActive = status?.isActive || paid;
  const plans = status?.plans ?? [];
  const hasPendingInvoice = !!status?.pendingInvoice && !paid && !isActive;
  const pendingPlan = hasPendingInvoice
    ? plans.find((p) => p.id === status?.pendingInvoice?.planType)
    : null;
  const chosenPlan = selectedPlan ? plans.find((p) => p.id === selectedPlan) : null;

  const daysLeft = status?.planExpiresAt
    ? Math.max(0, Math.ceil((new Date(status.planExpiresAt).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-20 space-y-6">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FFAD02] via-amber-400 to-amber-500 p-8 shadow-xl shadow-amber-200/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.2),transparent_60%)]" />
        <div className="absolute -bottom-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-black/10 rounded-xl backdrop-blur-sm">
              <Crown className="w-6 h-6 text-black" />
            </div>
            <h1 className="text-3xl font-black text-black tracking-tight">MglStore Pro</h1>
          </div>
          <p className="text-black/70 font-medium text-base max-w-sm leading-relaxed">
            Өөрийн брэндтэй онлайн дэлгүүр нээж, илүү олон үйлчлүүлэгчид хүр
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {[
              { icon: Globe, text: "Өөрийн веб хаяг" },
              { icon: ShieldCheck, text: "Найдвартай платформ" },
              { icon: TrendingUp, text: "Борлуулалт нэмэгдүүл" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 bg-black/10 backdrop-blur-sm rounded-full px-3 py-1.5">
                <Icon className="w-3.5 h-3.5 text-black/70" />
                <span className="text-xs font-bold text-black/80">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Notification ── */}
      {message && (
        <div
          className={`rounded-2xl p-4 text-sm font-semibold flex items-start justify-between gap-3 ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <X className="w-4 h-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Active Plan ── */}
      {isActive && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">Идэвхтэй план</h2>
                <p className="text-xs text-slate-400 font-medium">Таны одоогийн багц</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {status?.currentPlan?.isTrial && (
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-black rounded-full">
                  Үнэгүй туршилт
                </span>
              )}
              {status?.currentPlan && (
                <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-black rounded-full">
                  {status.currentPlan.name}
                </span>
              )}
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Stats grid */}
            {status?.currentPlan && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={Package} label="Бүтээгдэхүүн" value={fmt(status.currentPlan.maxProducts)} />
                <StatCard icon={Image} label="Зураг / бараа" value={fmt(status.currentPlan.maxImages)} />
                <StatCard icon={Tag} label="Ангилал" value={fmt(status.currentPlan.maxCategories)} />
                {daysLeft !== null && (
                  <StatCard
                    icon={Clock}
                    label="Үлдсэн хоног"
                    value={`${daysLeft} хоног`}
                    highlight={daysLeft <= 7}
                  />
                )}
              </div>
            )}

            {/* Expiry */}
            {status?.planExpiresAt && (
              <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
                daysLeft !== null && daysLeft <= 7
                  ? "bg-rose-50 border border-rose-100"
                  : "bg-slate-50 border border-slate-100"
              }`}>
                <Calendar className={`w-4 h-4 shrink-0 ${daysLeft !== null && daysLeft <= 7 ? "text-rose-500" : "text-slate-400"}`} />
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${daysLeft !== null && daysLeft <= 7 ? "text-rose-700" : "text-slate-600"}`}>
                    {daysLeft !== null && daysLeft <= 7 ? "Удахгүй дуусна!" : "Дуусах огноо"}
                  </p>
                  <p className={`text-xs font-medium mt-0.5 ${daysLeft !== null && daysLeft <= 7 ? "text-rose-500" : "text-slate-400"}`}>
                    {new Date(status.planExpiresAt).toLocaleDateString("mn-MN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                {daysLeft !== null && daysLeft <= 7 && (
                  <span className="text-xs font-black text-rose-600 bg-rose-100 px-2 py-1 rounded-lg">
                    {daysLeft} хоног
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Pending QPay ── */}
      {hasPendingInvoice && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-xl">
                <Sparkles className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">QPay төлбөр хүлээгдэж байна</h2>
                <p className="text-xs text-slate-400 font-medium">Апп-аар уншуулж гүйлгээ хийнэ үү</p>
              </div>
            </div>
            {pendingPlan && (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-black rounded-full">
                {pendingPlan.name} · {pendingPlan.price.toLocaleString()}₮
              </span>
            )}
          </div>

          <div className="p-6 space-y-5">
            {/* QR placeholder */}
            <div className="flex flex-col items-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-8 gap-4">
              <div className="w-48 h-48 bg-white rounded-2xl border-2 border-slate-200 flex items-center justify-center shadow-sm">
                <div className="text-center px-4">
                  <Globe className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-[9px] text-slate-300 font-mono break-all leading-relaxed">
                    {status?.pendingInvoice?.qrText.slice(0, 60)}...
                  </p>
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-500">QPay апп-аар уншуулна уу</p>
              <button
                onClick={copyQR}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-sm font-semibold text-slate-700 transition-all hover:shadow-sm"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-400" />
                )}
                {copied ? "Хуулагдлаа!" : "QR текст хуулах"}
              </button>
            </div>

            {/* Invoice details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-2xl p-4">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Нэхэмжлэлийн №</p>
                <p className="font-mono font-bold text-slate-800 text-sm">{status?.pendingInvoice?.invoiceNo}</p>
              </div>
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider mb-1">Нийт дүн</p>
                <p className="font-black text-amber-700 text-lg">{status?.pendingInvoice?.amount.toLocaleString()}₮</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleCheck}
                disabled={isChecking}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-bold rounded-2xl transition-colors shadow-sm shadow-emerald-200"
              >
                {isChecking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {isChecking ? "Шалгаж байна..." : "Төлбөр шалгах"}
              </button>
              <button
                onClick={async () => {
                  await (authFetch as any)(withOrgId(`${API}/vendor/upgrade/initiate`), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ planId: status?.pendingInvoice?.planType }),
                  });
                  await loadStatus();
                }}
                className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-2xl transition-colors text-sm"
              >
                Шинэчлэх
              </button>
            </div>

            <div className="flex items-center gap-2 justify-center">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-xs text-slate-400">Төлбөр автоматаар шалгагдаж байна</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Plan Selector (no active plan) ── */}
      {!isActive && !hasPendingInvoice && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">Багц сонгох</h2>
              <p className="text-sm text-slate-400 mt-0.5">Танд тохирох хугацааг сонгоно уу</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                selected={selectedPlan === plan.id}
                trialUsed={status?.trialUsed ?? false}
                onSelect={setSelectedPlan}
              />
            ))}
          </div>

          {selectedPlan && (
            <div className="bg-white rounded-3xl border border-[#FFAD02]/30 shadow-md shadow-amber-50 p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Сонгосон багц</p>
                  <p className="text-xl font-black text-slate-900 mt-0.5 flex items-baseline gap-2">
                    {chosenPlan?.name}
                    {chosenPlan && chosenPlan.price > 0 && (
                      <span className="text-lg font-black text-[#FFAD02]">
                        {chosenPlan.price.toLocaleString()}₮
                      </span>
                    )}
                  </p>
                </div>
                <div className="p-2.5 bg-amber-50 rounded-2xl">
                  <Crown className="w-6 h-6 text-amber-500" />
                </div>
              </div>

              {selectedPlan === "trial" ? (
                <button
                  onClick={handleActivateTrial}
                  disabled={isActing}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-black rounded-2xl transition-all text-base shadow-md shadow-emerald-100 active:scale-[0.98]"
                >
                  {isActing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                  {isActing ? "Идэвхжүүлж байна..." : "14 хоног үнэгүй эхлэх"}
                </button>
              ) : (
                <button
                  onClick={handleInitiate}
                  disabled={isActing}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-[#FFAD02] hover:bg-amber-500 disabled:bg-amber-300 text-black font-black rounded-2xl transition-all text-base shadow-md shadow-amber-100 active:scale-[0.98]"
                >
                  {isActing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ArrowRight className="w-5 h-5" />
                  )}
                  {isActing
                    ? "Үүсгэж байна..."
                    : `QPay-р ${chosenPlan?.price.toLocaleString()}₮ төлөх`}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Renew (when active) ── */}
      {isActive && !hasPendingInvoice && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-base font-black text-slate-900">Багц сунгах / шинэчлэх</h3>
            <p className="text-xs text-slate-400 mt-0.5">Хугацааг сунгаж тасалдалгүй үргэлжлүүлнэ</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {plans
                .filter((p) => !p.isTrial)
                .map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id === selectedPlan ? null : plan.id)}
                    className={`relative rounded-2xl border-2 p-4 text-left transition-all ${
                      selectedPlan === plan.id
                        ? "border-[#FFAD02] bg-amber-50 shadow-sm"
                        : "border-slate-200 hover:border-amber-300 bg-white"
                    }`}
                  >
                    {plan.badge && (
                      <span className="absolute -top-2.5 left-3 px-2 py-0.5 bg-[#FFAD02] text-black text-[9px] font-black rounded-full uppercase tracking-wide">
                        {plan.badge}
                      </span>
                    )}
                    <p className="font-black text-slate-900 text-sm">{plan.name}</p>
                    <p className="text-base font-black text-[#FFAD02] mt-1">
                      {plan.price.toLocaleString()}
                      <span className="text-xs font-bold text-slate-400">₮</span>
                    </p>
                  </button>
                ))}
            </div>

            {selectedPlan && selectedPlan !== "trial" && (
              <button
                onClick={handleInitiate}
                disabled={isActing}
                className="w-full flex items-center justify-center gap-2 py-4 bg-[#FFAD02] hover:bg-amber-500 disabled:bg-amber-300 text-black font-black rounded-2xl transition-all shadow-sm shadow-amber-100 active:scale-[0.98]"
              >
                {isActing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {isActing
                  ? "Үүсгэж байна..."
                  : `${plans.find((p) => p.id === selectedPlan)?.name} багцаар сунгах`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Trust footer ── */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
        {[
          { icon: ShieldCheck, text: "Аюулгүй төлбөр" },
          { icon: Zap, text: "Шууд идэвхждэг" },
          { icon: Clock, text: "24/7 дэмжлэг" },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-1.5 text-slate-400">
            <Icon className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
