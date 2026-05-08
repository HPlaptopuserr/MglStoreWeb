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
  ExternalLink,
  Image,
  Tag,
  BarChart2,
  Package,
  Sparkles,
  X,
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

function FeatureRow({ icon: Icon, label, value }: { icon: any; label: string; value: string | boolean }) {
  const isOk = value === true || (typeof value === "string" && value !== "—");
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className={`w-3.5 h-3.5 shrink-0 ${isOk ? "text-emerald-500" : "text-slate-300"}`} />
      <span className="text-slate-500 flex-1">{label}</span>
      <span className={`font-semibold text-xs ${isOk ? "text-slate-800" : "text-slate-300"}`}>
        {value === true ? "✓" : value === false ? "—" : value}
      </span>
    </div>
  );
}

function PlanCard({
  plan,
  selected,
  trialUsed,
  onSelect,
}: {
  plan: Plan;
  selected: boolean;
  trialUsed: boolean;
  onSelect: (id: string) => void;
}) {
  const disabled = plan.isTrial && trialUsed;
  return (
    <button
      onClick={() => !disabled && onSelect(plan.id)}
      disabled={disabled}
      className={`relative w-full text-left rounded-2xl border-2 p-4 transition-all ${
        disabled
          ? "opacity-40 cursor-not-allowed border-slate-200 bg-slate-50"
          : selected
          ? "border-[#FFAD02] bg-amber-50/60 shadow-md shadow-amber-100"
          : "border-slate-200 bg-white hover:border-amber-300 hover:shadow-sm"
      }`}
    >
      {plan.badge && (
        <span className="absolute -top-2.5 left-4 px-2.5 py-0.5 bg-[#FFAD02] text-black text-[10px] font-black rounded-full uppercase tracking-wide">
          {plan.badge}
        </span>
      )}
      {plan.isTrial && (
        <span className="absolute -top-2.5 left-4 px-2.5 py-0.5 bg-emerald-500 text-white text-[10px] font-black rounded-full uppercase tracking-wide">
          Үнэгүй
        </span>
      )}

      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-black text-slate-900 text-base">{plan.name}</p>
          <p className="text-xs text-slate-400">{plan.durationDays} хоног</p>
        </div>
        <div className="text-right">
          {plan.price === 0 ? (
            <p className="text-xl font-black text-emerald-600">Үнэгүй</p>
          ) : (
            <p className="text-xl font-black text-slate-900">
              {plan.price.toLocaleString()}
              <span className="text-sm font-bold text-slate-400">₮</span>
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-slate-100">
        <FeatureRow icon={Globe} label="Subdomain хаяг" value={true} />
        <FeatureRow icon={Package} label="Бүтээгдэхүүн" value={fmt(plan.maxProducts)} />
        <FeatureRow icon={Image} label="Зургийн тоо / бараа" value={fmt(plan.maxImages)} />
        <FeatureRow icon={Tag} label="Ангилал" value={fmt(plan.maxCategories)} />
        <FeatureRow icon={Image} label="Banner зураг" value={plan.hasBanner} />
        <FeatureRow icon={BarChart2} label="Аналитик" value={plan.hasAnalytics} />
      </div>

      {selected && !disabled && (
        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-bold text-[#FFAD02]">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Сонгогдсон
        </div>
      )}
      {disabled && (
        <div className="mt-3 text-center text-xs font-semibold text-slate-400">Аль хэдийн ашигласан</div>
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

  useEffect(() => { loadStatus(); }, []);

  // Auto-poll when pending invoice exists
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
          setMessage({ type: "success", text: `Амжилттай! ${data.subdomain} хаяг идэвхжлээ.` });
          await loadStatus();
        }
      } catch { /* silent */ }
    }, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [status?.pendingInvoice?.invoiceId, paid]);

  const handleActivateTrial = async () => {
    setIsActing(true);
    setMessage(null);
    try {
      const res = await authFetch(withOrgId(`${API}/vendor/upgrade/trial`), { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setPaid(true);
        setMessage({ type: "success", text: `14 хоногийн үнэгүй туршилт идэвхжлээ!` });
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
        setMessage({ type: "success", text: `Амжилттай! ${data.subdomain} хаяг идэвхжлээ.` });
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
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#FFAD02]" />
      </div>
    );
  }

  const isActive = status?.isActive || paid;
  const plans = status?.plans ?? [];
  const hasPendingInvoice = !!status?.pendingInvoice && !paid && !isActive;
  const pendingPlan = hasPendingInvoice ? plans.find((p) => p.id === status?.pendingInvoice?.planType) : null;
  const chosenPlan = selectedPlan ? plans.find((p) => p.id === selectedPlan) : null;

  return (
    <div className="max-w-4xl mx-auto p-4 pb-16 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#FFAD02] to-amber-500 rounded-3xl p-6 text-black shadow-lg shadow-amber-200/40">
        <div className="flex items-center gap-3 mb-2">
          <Crown className="w-7 h-7" />
          <h1 className="text-2xl font-black">MglStore Pro</h1>
        </div>
        <p className="text-black/70 font-medium">
          Өөрийн веб хаягтай болж, онлайн дэлгүүрийг брэндчилж эхэл
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className={`rounded-xl p-4 text-sm font-semibold flex items-start justify-between gap-3 ${
          message.type === "success"
            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
            : "bg-red-50 text-red-800 border border-red-200"
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="shrink-0 opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Active plan banner */}
      {isActive && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-bold text-slate-900">Идэвхтэй план</h2>
            {status?.currentPlan && (
              <span className="ml-auto px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-black rounded-full">
                {status.currentPlan.name}
              </span>
            )}
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-emerald-700 mb-1">Таны веб хаяг</p>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-lg font-black text-emerald-900 font-mono">{status?.subdomain}</span>
              <a
                href={`https://${status?.subdomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-600 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {status?.currentPlan && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { icon: Package, label: "Бүтээгдэхүүн", value: fmt(status.currentPlan.maxProducts) },
                { icon: Image, label: "Зураг / бараа", value: fmt(status.currentPlan.maxImages) },
                { icon: Tag, label: "Ангилал", value: fmt(status.currentPlan.maxCategories) },
              ].map((s) => (
                <div key={s.label} className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <s.icon className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{s.label}</p>
                  </div>
                  <p className="text-sm font-black text-slate-800">{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {status?.planExpiresAt && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Calendar className="w-4 h-4" />
              Дуусах:{" "}
              <span className="font-semibold text-slate-700">
                {new Date(status.planExpiresAt).toLocaleDateString("mn-MN")}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Pending QPay payment */}
      {hasPendingInvoice && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">QPay төлбөр</h2>
            {pendingPlan && (
              <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-black rounded-full">
                {pendingPlan.name} — {pendingPlan.price.toLocaleString()}₮
              </span>
            )}
          </div>

          <div className="bg-slate-50 rounded-xl p-5 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-600">QPay апп-аар уншуулна уу</p>
            <div className="inline-flex items-center justify-center w-48 h-48 bg-white border-2 border-dashed border-slate-200 rounded-xl mx-auto">
              <div className="text-center px-3">
                <Globe className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-[10px] text-slate-400 font-mono break-all">
                  {status?.pendingInvoice?.qrText.slice(0, 50)}...
                </p>
              </div>
            </div>
            <button
              onClick={copyQR}
              className="flex items-center gap-2 mx-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-semibold text-slate-700 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? "Хуулагдлаа" : "QR текст хуулах"}
            </button>
          </div>

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Нэхэмжлэлийн №</span>
              <span className="font-mono font-semibold text-slate-700">{status?.pendingInvoice?.invoiceNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Дүн</span>
              <span className="font-bold text-slate-900">{status?.pendingInvoice?.amount.toLocaleString()}₮</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCheck}
              disabled={isChecking}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-bold rounded-xl transition-colors"
            >
              {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
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
              className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl transition-colors text-sm"
            >
              Шинэчлэх
            </button>
          </div>
          <p className="text-xs text-slate-400 text-center">
            Төлбөр хийсний дараа автоматаар шалгана. Хэрэв удаан бол "Төлбөр шалгах" дарна уу.
          </p>
        </div>
      )}

      {/* Plan selector — shown when no active plan and no pending payment */}
      {!isActive && !hasPendingInvoice && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Багц сонгох</h2>

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
            <div className="bg-white rounded-2xl border border-[#FFAD02]/40 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Сонгосон багц</p>
                  <p className="text-xl font-black text-slate-900">
                    {chosenPlan?.name}
                    {chosenPlan && chosenPlan.price > 0 && (
                      <span className="ml-2 text-base font-bold text-[#FFAD02]">
                        {chosenPlan.price.toLocaleString()}₮
                      </span>
                    )}
                  </p>
                </div>
                <Sparkles className="w-6 h-6 text-[#FFAD02]" />
              </div>

              {selectedPlan === "trial" ? (
                <button
                  onClick={handleActivateTrial}
                  disabled={isActing}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-bold rounded-xl transition-colors text-base"
                >
                  {isActing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                  {isActing ? "Идэвхжүүлж байна..." : "14 хоног үнэгүй эхлэх"}
                </button>
              ) : (
                <button
                  onClick={handleInitiate}
                  disabled={isActing}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#FFAD02] hover:bg-amber-500 disabled:bg-amber-300 text-black font-bold rounded-xl transition-colors text-base shadow-sm shadow-amber-200"
                >
                  {isActing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Crown className="w-5 h-5" />}
                  {isActing ? "Үүсгэж байна..." : `QPay-р ${chosenPlan?.price.toLocaleString()}₮ төлөх`}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Renew CTA when active */}
      {isActive && !hasPendingInvoice && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <h3 className="text-base font-bold text-slate-900">Багц сунгах / шинэчлэх</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {plans.filter((p) => !p.isTrial).map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id === selectedPlan ? null : plan.id)}
                className={`relative rounded-xl border-2 p-3 text-left transition-all ${
                  selectedPlan === plan.id
                    ? "border-[#FFAD02] bg-amber-50"
                    : "border-slate-200 hover:border-amber-300"
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-2 left-2 px-2 py-0.5 bg-[#FFAD02] text-black text-[9px] font-black rounded-full uppercase">
                    {plan.badge}
                  </span>
                )}
                <p className="font-bold text-slate-900 text-sm">{plan.name}</p>
                <p className="text-sm font-black text-[#FFAD02] mt-0.5">{plan.price.toLocaleString()}₮</p>
              </button>
            ))}
          </div>
          {selectedPlan && selectedPlan !== "trial" && (
            <button
              onClick={handleInitiate}
              disabled={isActing}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#FFAD02] hover:bg-amber-500 disabled:bg-amber-300 text-black font-bold rounded-xl transition-colors"
            >
              {isActing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {isActing ? "Үүсгэж байна..." : `${plans.find((p) => p.id === selectedPlan)?.name} багцаар сунгах`}
            </button>
          )}
        </div>
      )}

      {isActive && (
        <p className="text-xs text-slate-400 text-center">
          DNS тархахад хэдэн цаг шаардлагатай тул хаяг шууд ажиллаагүй тохиолдолд хүлээнэ үү.
        </p>
      )}
    </div>
  );
}
