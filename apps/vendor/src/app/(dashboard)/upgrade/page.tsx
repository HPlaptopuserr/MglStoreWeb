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
  Package,
  Sparkles,
  X,
  ShieldCheck,
  TrendingUp,
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
  tier?: "SILVER" | "GOLD" | "PLATINUM";
  durationMonths?: number;
  durationLabel?: string;
  benefits?: string[];
  unavailable?: string[];
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

const TIER_META: Record<
  string,
  {
    label: string;
    action: string;
    icon: typeof ShieldCheck;
    recommended?: boolean;
    unavailable?: string[];
  }
> = {
  SILVER: {
    label: "Silver",
    action: "Silver сонгох",
    icon: ShieldCheck,
    unavailable: ["Priority хүргэлтийн үйлчилгээ"],
  },
  GOLD: {
    label: "Gold",
    action: "Gold сонгох",
    icon: Crown,
    recommended: true,
  },
  PLATINUM: {
    label: "Platinum",
    action: "Platinum сонгох",
    icon: Sparkles,
  },
};

type MembershipPlanGroup = {
  tier: "SILVER" | "GOLD" | "PLATINUM";
  name: string;
  monthlyPrice: number;
  plans: Plan[];
  benefits: string[];
  unavailable: string[];
};

function groupMembershipPlans(plans: Plan[]): MembershipPlanGroup[] {
  const order: MembershipPlanGroup["tier"][] = ["SILVER", "GOLD", "PLATINUM"];
  return order
    .map((tier) => {
      const tierPlans = plans
        .filter((plan) => plan.tier === tier && !plan.isTrial)
        .sort((a, b) => (a.durationMonths ?? 0) - (b.durationMonths ?? 0));
      const base = tierPlans[0];
      if (!base) return null;
      return {
        tier,
        name: base.name,
        monthlyPrice: base.durationMonths
          ? Math.round(base.price / base.durationMonths)
          : base.price,
        plans: tierPlans,
        benefits: base.benefits ?? [],
        unavailable: base.unavailable ?? TIER_META[tier]?.unavailable ?? [],
      };
    })
    .filter(Boolean) as MembershipPlanGroup[];
}

function VendorMembershipTierCard({
  group,
  selected,
  selectedPlanId,
  onSelectPlan,
}: {
  group: MembershipPlanGroup;
  selected: boolean;
  selectedPlanId: string | null;
  onSelectPlan: (id: string) => void;
}) {
  const meta = TIER_META[group.tier];
  const Icon = meta.icon;

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border-2 p-5 transition-all duration-200 ${
        selected
          ? "border-orange-500 bg-orange-50 shadow-lg shadow-orange-100/70"
          : "border-slate-200 bg-white hover:border-orange-300 hover:shadow-sm"
      }`}
    >
      {meta.recommended && (
        <div className="absolute -right-10 top-4 rotate-45 bg-orange-600 px-9 py-1 text-[9px] font-black uppercase tracking-wide text-orange-50">
          санал болгох
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-black text-slate-950 text-xl leading-tight">{group.name}</p>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-3xl font-black tracking-tight text-slate-950">
              {group.monthlyPrice.toLocaleString()}
            </span>
            <span className="pb-1 text-xs font-black uppercase text-slate-400">
              ₮ / сар
            </span>
          </div>
        </div>
        <span
          className={`mt-1 flex h-10 w-10 items-center justify-center rounded-xl ${
            selected
              ? "bg-orange-500 text-white"
              : "bg-white text-orange-600 ring-1 ring-slate-200"
          }`}
        >
          <Icon size={18} />
        </span>
      </div>

      <div className="mb-4 grid gap-2">
        {group.plans.map((plan) => {
          const durationSelected = selectedPlanId === plan.id;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => onSelectPlan(plan.id)}
              className={`min-h-11 rounded-xl border px-3 py-2 text-left text-xs font-black transition ${
                durationSelected
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-orange-300"
              }`}
            >
              {plan.durationLabel || `${plan.durationDays} хоног`}
            </button>
          );
        })}
      </div>

      <div className="space-y-2.5">
        {group.benefits.map((feature) => (
          <FeatureLine key={feature} enabled>
            {feature}
          </FeatureLine>
        ))}
        {group.unavailable.map((feature) => (
          <FeatureLine key={feature} enabled={false}>
            {feature}
          </FeatureLine>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onSelectPlan(group.plans[0]?.id || "")}
        className={`mt-7 flex h-12 w-full items-center justify-center rounded-xl border text-sm font-black transition ${
          selected
            ? "border-orange-600 bg-orange-600 text-white shadow-lg shadow-orange-600/20 hover:bg-orange-500"
            : "border-slate-200 bg-white text-slate-600 hover:border-orange-400 hover:text-orange-600"
        }`}
      >
        {selected && <CheckCircle2 size={16} className="mr-2" />}
        {selected ? "Сонгогдсон" : meta.action}
      </button>
    </article>
  );
}

function FeatureLine({
  children,
  enabled,
}: {
  children: string;
  enabled: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-3 text-sm font-bold leading-6 ${
        enabled ? "text-slate-700" : "text-slate-300 line-through"
      }`}
    >
      <span
        className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
          enabled ? "text-orange-500" : "text-slate-300"
        }`}
      >
        {enabled ? (
          <Sparkles size={13} />
        ) : (
          <span className="h-2 w-2 rounded-full border border-current" />
        )}
      </span>
      <span>{children}</span>
    </div>
  );
}

function CurrentPlanName({ plan }: { plan: Plan }) {
  return (
    <span>
      {plan.name}
      {plan.durationLabel ? (
        <span className="ml-1 text-slate-400">· {plan.durationLabel}</span>
      ) : null}
    </span>
  );
}

function SelectedPaymentSummary({ plan }: { plan: Plan }) {
  return (
    <div className="bg-white rounded-3xl border border-orange-200 shadow-md shadow-orange-50 p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Сонгосон membership
          </p>
          <p className="text-xl font-black text-slate-900 mt-0.5 flex items-baseline gap-2">
            {plan.name}
            {plan.durationLabel && (
              <span className="text-sm font-bold text-slate-400">{plan.durationLabel}</span>
            )}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Төлөх дүн</p>
          <p className="mt-0.5 text-2xl font-black text-orange-500">
            {plan.price.toLocaleString()}₮
          </p>
        </div>
      </div>
    </div>
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
  const membershipPlanGroups = groupMembershipPlans(plans);
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
            Personal account-ийн membership-тэй ижил Silver, Gold, Platinum эрхээр vendor боломжуудаа идэвхжүүл
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
                  <CurrentPlanName plan={status.currentPlan} />
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
              <h2 className="text-xl font-black text-slate-900">Membership сонгох</h2>
              <p className="text-sm text-slate-400 mt-0.5">
                Personal account-ийн Silver, Gold, Platinum tier-тэй ижил эрхээр идэвхжүүлнэ.
              </p>
            </div>
          </div>

          <div className="rounded-[24px] border border-orange-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-500">
                  Tier сонгох
                </p>
                <h3 className="text-lg font-black text-slate-950">
                  Танд тохирох membership
                </h3>
              </div>
              <p className="text-xs font-bold text-slate-400">
                1 сар эсвэл 6 сарын багцаар идэвхжүүлнэ.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {membershipPlanGroups.map((group) => (
                <VendorMembershipTierCard
                  key={group.tier}
                  group={group}
                  selected={group.plans.some((plan) => plan.id === selectedPlan)}
                  selectedPlanId={selectedPlan}
                  onSelectPlan={setSelectedPlan}
                />
              ))}
            </div>
          </div>

          {chosenPlan && (
            <>
              <SelectedPaymentSummary plan={chosenPlan} />
              <button
                onClick={handleInitiate}
                disabled={isActing}
                className="w-full flex items-center justify-center gap-2 py-4 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-black rounded-2xl transition-all text-base shadow-md shadow-orange-100 active:scale-[0.98]"
              >
                {isActing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ArrowRight className="w-5 h-5" />
                )}
                {isActing
                  ? "Үүсгэж байна..."
                  : `QuickQR-р ${chosenPlan.price.toLocaleString()}₮ төлөх`}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Renew (when active) ── */}
      {isActive && !hasPendingInvoice && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-base font-black text-slate-900">Membership сунгах / шинэчлэх</h3>
            <p className="text-xs text-slate-400 mt-0.5">Хугацааг сунгаж тасалдалгүй үргэлжлүүлнэ</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              {membershipPlanGroups.map((group) => (
                <VendorMembershipTierCard
                  key={group.tier}
                  group={group}
                  selected={group.plans.some((plan) => plan.id === selectedPlan)}
                  selectedPlanId={selectedPlan}
                  onSelectPlan={setSelectedPlan}
                />
              ))}
            </div>

            {chosenPlan && (
              <>
                <SelectedPaymentSummary plan={chosenPlan} />
                <button
                  onClick={handleInitiate}
                  disabled={isActing}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-black rounded-2xl transition-all shadow-sm shadow-orange-100 active:scale-[0.98]"
                >
                  {isActing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {isActing
                    ? "Үүсгэж байна..."
                    : `${chosenPlan.name} ${chosenPlan.durationLabel || ""}-аар сунгах`}
                </button>
              </>
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
