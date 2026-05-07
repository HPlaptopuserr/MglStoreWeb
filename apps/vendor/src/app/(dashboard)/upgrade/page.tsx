"use client";

import { useEffect, useRef, useState } from "react";
import {
  Zap,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  Calendar,
  Crown,
  Globe,
  Image,
  Tag,
  BarChart2,
  Package,
  Sparkles,
  X,
  Star,
  ArrowLeft,
  ShieldCheck,
  Clock3,
  CreditCard,
  Info,
  ChevronRight,
  Layers3,
} from "lucide-react";
import { API, authFetch } from "@/lib/api";
import type { Plan, UpgradeStatus } from "@mgl/types";

function fmt(n: number) {
  return n === -1 ? "Хязгааргүй" : n.toLocaleString();
}

function monthlyEquivalent(price: number, days: number): string | null {
  if (price === 0 || days <= 30) return null;

  const monthly = Math.round((price / days) * 30);
  return `Сард ~${monthly.toLocaleString()}₮`;
}

function getDurationText(days: number) {
  if (days >= 365) return "1 жилийн эрх";
  if (days >= 180) return "6 сарын эрх";
  if (days >= 90) return "3 сарын эрх";
  if (days >= 30) return "1 сарын эрх";
  return `${days} хоногийн эрх`;
}

function resolvePlanDescription(plan: Plan) {
  if (plan.description) return plan.description;
  if (plan.isTrial) return "Системийг эрсдэлгүй туршиж үзэхэд";
  if (plan.durationDays <= 30) return "Шинээр эхэлж байгаа дэлгүүрт";
  if (plan.durationDays <= 90) return "Тогтвортой ашиглах хамгийн тохиромжтой";
  if (plan.durationDays <= 180) return "Борлуулалт идэвхтэй дэлгүүрт";
  return "Брэндээ урт хугацаанд хөгжүүлэхэд";
}

function FeatureRow({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string | boolean;
}) {
  const isOk = value === true || (typeof value === "string" && value !== "—");

  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-slate-50">
      <Icon
        className={`h-3.5 w-3.5 shrink-0 ${
          isOk ? "text-emerald-500" : "text-slate-300"
        }`}
      />
      <span className="min-w-0 flex-1 text-slate-500">{label}</span>
      <span
        className={`text-xs font-bold ${
          isOk ? "text-slate-900" : "text-slate-300"
        }`}
      >
        {value === true ? "✓" : value === false ? "—" : value}
      </span>
    </div>
  );
}

function MiniFeature({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string | boolean;
}) {
  const isOk = value === true || (typeof value === "string" && value !== "—");

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <Icon
          className={`h-3.5 w-3.5 shrink-0 ${
            isOk ? "text-emerald-500" : "text-slate-300"
          }`}
        />
        <span className="truncate text-[11px] font-semibold text-slate-500">
          {label}
        </span>
      </div>

      <span
        className={`shrink-0 text-[11px] font-black ${
          isOk ? "text-slate-900" : "text-slate-300"
        }`}
      >
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
  const recommended = !!plan.isRecommended && !disabled;
  const monthly = monthlyEquivalent(plan.price, plan.durationDays);
  const description = resolvePlanDescription(plan);

  return (
    <button
      type="button"
      onClick={() => !disabled && onSelect(plan.id)}
      disabled={disabled}
      className={`group relative w-full overflow-hidden rounded-3xl border-2 p-5 text-left transition-all duration-200 ${
        disabled
          ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-45"
          : selected
            ? "border-[#FFAD02] bg-amber-50 shadow-xl shadow-amber-100/70"
            : recommended
              ? "border-amber-300 bg-gradient-to-b from-amber-50/80 to-white shadow-md shadow-amber-50"
              : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-lg hover:shadow-slate-100"
      }`}
    >
      {recommended && (
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#FFAD02] via-amber-400 to-yellow-300" />
      )}

      {plan.badge && !plan.isTrial && (
        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-[#FFAD02] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-black shadow-sm">
          <Star className="h-3 w-3 fill-black" />
          {plan.badge}
        </span>
      )}

      {plan.isTrial && (
        <span className="absolute right-4 top-4 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">
          Үнэгүй
        </span>
      )}

      <div className="mb-4 pr-24">
        <p className="text-base font-black text-slate-950">{plan.name}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          {description}
        </p>
      </div>

      <div className="mb-4 rounded-2xl bg-slate-50 p-3">
        {plan.price === 0 ? (
          <p className="text-2xl font-black text-emerald-600">Үнэгүй</p>
        ) : (
          <p className="text-2xl font-black tracking-tight text-slate-950">
            {plan.price.toLocaleString()}
            <span className="ml-0.5 text-sm font-bold text-slate-400">₮</span>
          </p>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200">
            {getDurationText(plan.durationDays)}
          </span>

          {monthly && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
              {monthly}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-0.5 border-t border-slate-100 pt-3">
        <FeatureRow
          icon={Package}
          label="Бүтээгдэхүүн"
          value={fmt(plan.maxProducts)}
        />
        <FeatureRow
          icon={Image}
          label="Зураг / бараа"
          value={fmt(plan.maxImages)}
        />
        <FeatureRow
          icon={Tag}
          label="Ангилал"
          value={fmt(plan.maxCategories)}
        />
        <FeatureRow icon={Image} label="Banner зураг" value={plan.hasBanner} />
        <FeatureRow
          icon={BarChart2}
          label="Аналитик"
          value={plan.hasAnalytics}
        />
      </div>

      {selected && !disabled && (
        <div className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-[#FFAD02] py-2 text-xs font-black text-black">
          <CheckCircle2 className="h-4 w-4" />
          Сонгогдсон
        </div>
      )}

      {disabled && (
        <div className="mt-4 rounded-xl bg-slate-100 py-2 text-center text-xs font-bold text-slate-400">
          Аль хэдийн ашигласан
        </div>
      )}
    </button>
  );
}

function RenewPlanCard({
  plan,
  selected,
  onSelect,
}: {
  plan: Plan;
  selected: boolean;
  onSelect: () => void;
}) {
  const monthly = monthlyEquivalent(plan.price, plan.durationDays);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative rounded-3xl border-2 p-4 text-left transition-all duration-200 ${
        selected
          ? "border-[#FFAD02] bg-amber-50 shadow-lg shadow-amber-100"
          : plan.isRecommended
            ? "border-amber-300 bg-gradient-to-b from-amber-50/70 to-white hover:shadow-md"
            : "border-slate-200 bg-white hover:border-amber-300 hover:shadow-md hover:shadow-slate-100"
      }`}
    >
      {plan.badge && (
        <span className="absolute -top-2.5 left-4 inline-flex items-center gap-1 rounded-full bg-[#FFAD02] px-2.5 py-0.5 text-[9px] font-black uppercase text-black shadow-sm">
          <Star className="h-2.5 w-2.5 fill-black" />
          {plan.badge}
        </span>
      )}

      {selected && (
        <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#FFAD02] text-black">
          <Check className="h-3.5 w-3.5" />
        </span>
      )}

      <div className="mb-3 pr-8">
        <p className="text-base font-black text-slate-950">{plan.name}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
          {resolvePlanDescription(plan)}
        </p>
      </div>

      <div className="mb-3 rounded-2xl bg-slate-50 p-3">
        <p className="text-xl font-black text-[#FFAD02]">
          {plan.price.toLocaleString()}₮
        </p>

        <div className="mt-1 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">
            {getDurationText(plan.durationDays)}
          </span>

          {monthly && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              {monthly}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <MiniFeature
          icon={Package}
          label="Бүтээгдэхүүн"
          value={fmt(plan.maxProducts)}
        />
        <MiniFeature
          icon={Image}
          label="Зураг / бараа"
          value={fmt(plan.maxImages)}
        />
        <MiniFeature
          icon={Tag}
          label="Ангилал"
          value={fmt(plan.maxCategories)}
        />
        <MiniFeature icon={Layers3} label="Banner" value={plan.hasBanner} />
        <MiniFeature
          icon={BarChart2}
          label="Аналитик"
          value={plan.hasAnalytics}
        />
      </div>

      <div
        className={`mt-4 flex items-center justify-center gap-1.5 rounded-2xl py-2 text-xs font-black transition ${
          selected
            ? "bg-[#FFAD02] text-black"
            : "bg-slate-100 text-slate-500 group-hover:bg-amber-50"
        }`}
      >
        {selected ? "Сонгогдсон" : "Сунгах багц сонгох"}
      </div>
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
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadStatus = async () => {
    try {
      const res = await authFetch(`${API}/vendor/upgrade/status`);

      if (res.ok) {
        const data = await res.json();

        if (data.success) {
          setStatus(data);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    if (!status?.pendingInvoice?.invoiceId || paid || showPlanSelector) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await authFetch(
          `${API}/vendor/upgrade/check/${status.pendingInvoice!.invoiceId}`,
          { method: "POST" },
        );

        const data = await res.json();

        if (data.paid) {
          if (pollRef.current) clearInterval(pollRef.current);

          setPaid(true);
          setMessage({
            type: "success",
            text: "Амжилттай! Таны план идэвхжлээ.",
          });

          await loadStatus();
        }
      } catch {
        // Silent polling failure.
      }
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [status?.pendingInvoice?.invoiceId, paid, showPlanSelector]);

  const handleActivateTrial = async () => {
    setIsActing(true);
    setMessage(null);

    try {
      const res = await authFetch(`${API}/vendor/upgrade/trial`, {
        method: "POST",
      });

      const data = await res.json();

      if (data.success) {
        setPaid(true);
        setShowPlanSelector(false);
        setMessage({
          type: "success",
          text: "Үнэгүй туршилт амжилттай идэвхжлээ!",
        });

        await loadStatus();
      } else {
        setMessage({
          type: "error",
          text: data.message || "Алдаа гарлаа",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Серверийн алдаа" });
    } finally {
      setIsActing(false);
    }
  };

  const handleInitiate = async (overridePlanId?: string | null) => {
    const pid = overridePlanId ?? selectedPlan;
    if (!pid) return;

    const plan = status?.plans.find((p) => p.id === pid || p.code === pid);

    if (plan?.isTrial) return;

    setIsActing(true);
    setMessage(null);

    try {
      const res = await authFetch(`${API}/vendor/upgrade/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan?.id ?? pid }),
      });

      const data = await res.json();

      if (data.success) {
        setShowPlanSelector(false);
        await loadStatus();
      } else {
        setMessage({
          type: "error",
          text: data.message || "Нэхэмжлэл үүсгэхэд алдаа гарлаа",
        });
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
        `${API}/vendor/upgrade/check/${status.pendingInvoice.invoiceId}`,
        { method: "POST" },
      );

      const data = await res.json();

      if (data.paid) {
        setPaid(true);
        setShowPlanSelector(false);
        setMessage({
          type: "success",
          text: "Амжилттай! Таны план идэвхжлээ.",
        });

        await loadStatus();
      } else {
        setMessage({
          type: "error",
          text: "Төлбөр баталгаажаагүй байна. Түр хүлээгээд дахин шалгана уу.",
        });
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-9 w-9 animate-spin text-[#FFAD02]" />
          <p className="text-sm font-medium text-slate-400">
            Багцын мэдээлэл ачаалж байна...
          </p>
        </div>
      </div>
    );
  }

  const isActive = status?.isActive || paid;
  const plans = status?.plans ?? [];

  const hasPendingInvoice =
    !!status?.pendingInvoice && !paid && !isActive && !showPlanSelector;

  const pendingPlan = hasPendingInvoice
    ? plans.find(
        (p) =>
          p.id === status?.pendingInvoice?.planId ||
          p.id === status?.pendingInvoice?.planType ||
          p.code === status?.pendingInvoice?.planType,
      )
    : null;

  const chosenPlan = selectedPlan
    ? plans.find((p) => p.id === selectedPlan)
    : null;

  const trialPlan = plans.find((p) => p.isTrial);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 pb-16 pt-6">
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#FFAD02] via-amber-400 to-amber-500 p-7 text-black shadow-xl shadow-amber-200/50">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/20 blur-2xl" />
        <div className="absolute -bottom-20 left-10 h-52 w-52 rounded-full bg-black/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-black/10 px-3 py-1 text-xs font-black uppercase tracking-wide">
              <Crown className="h-3.5 w-3.5" />
              Pro Upgrade
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/10">
                <Crown className="h-6 w-6" />
              </div>

              <div>
                <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                  MglStore Pro
                </h1>
                <p className="mt-1 max-w-md text-sm font-semibold leading-relaxed text-black/70">
                  Онлайн дэлгүүрээ өөрийн нэр, хаягтайгаар ажиллуулж эхлээрэй
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white/20 p-2 backdrop-blur-sm">
            <div className="rounded-xl bg-white/40 px-3 py-2 text-center">
              <ShieldCheck className="mx-auto mb-1 h-4 w-4" />
              <p className="text-[10px] font-black">Аюулгүй</p>
            </div>
            <div className="rounded-xl bg-white/40 px-3 py-2 text-center">
              <CreditCard className="mx-auto mb-1 h-4 w-4" />
              <p className="text-[10px] font-black">QPay</p>
            </div>
            <div className="rounded-xl bg-white/40 px-3 py-2 text-center">
              <Clock3 className="mx-auto mb-1 h-4 w-4" />
              <p className="text-[10px] font-black">Шуурхай</p>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`flex items-start justify-between gap-3 rounded-2xl border p-4 text-sm font-semibold ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <span>{message.text}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="shrink-0 opacity-60 transition hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {isActive && (
        <div className="space-y-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-black text-slate-950">
              Идэвхтэй план
            </h2>

            {status?.currentPlan && (
              <span className="ml-auto rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                {status.currentPlan.name}
              </span>
            )}
          </div>

          {status?.currentPlan && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                {
                  icon: Package,
                  label: "Бүтээгдэхүүн",
                  value: fmt(status.currentPlan.maxProducts),
                },
                {
                  icon: Image,
                  label: "Зураг / бараа",
                  value: fmt(status.currentPlan.maxImages),
                },
                {
                  icon: Tag,
                  label: "Ангилал",
                  value: fmt(status.currentPlan.maxCategories),
                },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl bg-slate-50 p-4">
                  <div className="mb-1 flex items-center gap-1.5">
                    <s.icon className="h-3.5 w-3.5 text-slate-400" />
                    <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                      {s.label}
                    </p>
                  </div>
                  <p className="text-base font-black text-slate-900">
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {status?.planExpiresAt && (
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <Calendar className="h-4 w-4" />
              Дуусах огноо:
              <span className="font-black">
                {new Date(status.planExpiresAt).toLocaleDateString("mn-MN")}
              </span>
            </div>
          )}
        </div>
      )}

      {hasPendingInvoice && (
        <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-xl shadow-slate-100">
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-500" />
                <h2 className="text-lg font-black text-slate-950">
                  QPay төлбөр хүлээгдэж байна
                </h2>
              </div>
              <p className="text-sm text-slate-400">
                Төлбөрөө төлөх эсвэл өөр багц сонгох боломжтой.
              </p>
            </div>

            {pendingPlan && (
              <span className="inline-flex w-fit items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                {pendingPlan.name} — {pendingPlan.price.toLocaleString()}₮
              </span>
            )}
          </div>

          <div className="grid gap-5 p-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl bg-slate-50 p-5 text-center">
              <p className="mb-4 text-sm font-bold text-slate-600">
                QPay апп-аар уншуулна уу
              </p>

              <div className="mx-auto flex h-52 w-52 items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white">
                <div className="px-4 text-center">
                  <Globe className="mx-auto mb-3 h-9 w-9 text-slate-300" />
                  <p className="break-all font-mono text-[10px] leading-relaxed text-slate-400">
                    {status?.pendingInvoice?.qrText.slice(0, 70)}...
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={copyQR}
                className="mx-auto mt-4 flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Хуулагдлаа" : "QR текст хуулах"}
              </button>
            </div>

            <div className="flex flex-col justify-between gap-5">
              <div className="space-y-3 rounded-3xl border border-slate-100 p-5">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-slate-500">Нэхэмжлэлийн №</span>
                  <span className="text-right font-mono font-bold text-slate-800">
                    {status?.pendingInvoice?.invoiceNo}
                  </span>
                </div>

                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-slate-500">Төлөх дүн</span>
                  <span className="text-right text-lg font-black text-slate-950">
                    {status?.pendingInvoice?.amount.toLocaleString()}₮
                  </span>
                </div>

                <div className="flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-xs font-medium leading-relaxed text-amber-800">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  Хэрэв та өөр багц сонговол шинэ нэхэмжлэл үүснэ. Өмнөх
                  төлөгдөөгүй нэхэмжлэл идэвхжихгүй.
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={handleCheck}
                  disabled={isChecking}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 font-black text-white transition hover:bg-emerald-600 disabled:bg-emerald-300"
                >
                  {isChecking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {isChecking ? "Шалгаж байна..." : "Төлбөр шалгах"}
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      handleInitiate(
                        status?.pendingInvoice?.planId ??
                          status?.pendingInvoice?.planType,
                      )
                    }
                    disabled={isActing}
                    className="rounded-2xl bg-slate-100 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-200 disabled:opacity-60"
                  >
                    Шинэчлэх
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlan(null);
                      setShowPlanSelector(true);
                      setMessage({
                        type: "success",
                        text: "Та өөр багц сонгож болно.",
                      });
                    }}
                    className="flex items-center justify-center gap-1 rounded-2xl bg-amber-50 py-3 text-sm font-black text-amber-800 ring-1 ring-amber-200 transition hover:bg-amber-100"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Багц сонгох
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isActive && (!hasPendingInvoice || showPlanSelector) && (
        <div className="space-y-5">
          {showPlanSelector && status?.pendingInvoice && (
            <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <div>
                  <p className="text-sm font-black text-amber-900">
                    Та багцаа өөрчилж болно
                  </p>
                  <p className="text-xs leading-relaxed text-amber-700">
                    Өмнөх QPay нэхэмжлэл төлөгдөөгүй бол идэвхжихгүй. Шинэ багц
                    сонгоход шинэ нэхэмжлэл үүснэ.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPlanSelector(false)}
                className="inline-flex items-center justify-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-black text-amber-800 ring-1 ring-amber-200 transition hover:bg-amber-100"
              >
                QPay руу буцах
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div>
            <h2 className="text-xl font-black text-slate-950">
              Танд тохирох багцаа сонгоно уу
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Хүссэн үедээ багцаа өөрчилж, сунгах боломжтой.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
            <div className="sticky bottom-4 z-10 rounded-[24px] border border-[#FFAD02]/50 bg-white/95 p-5 shadow-2xl shadow-amber-100 backdrop-blur-md">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-500">
                    Сонгосон багц
                  </p>

                  <p className="text-xl font-black text-slate-950">
                    {chosenPlan?.name}

                    {chosenPlan && chosenPlan.price > 0 && (
                      <span className="ml-2 text-base font-black text-[#FFAD02]">
                        {chosenPlan.price.toLocaleString()}₮
                      </span>
                    )}
                  </p>

                  {chosenPlan && (
                    <p className="mt-0.5 text-xs text-slate-400">
                      {resolvePlanDescription(chosenPlan)}
                    </p>
                  )}
                </div>

                {selectedPlan === trialPlan?.id ? (
                  <button
                    type="button"
                    onClick={handleActivateTrial}
                    disabled={isActing}
                    className="flex min-w-[240px] items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3.5 text-base font-black text-white transition hover:bg-emerald-600 disabled:bg-emerald-300"
                  >
                    {isActing ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Zap className="h-5 w-5" />
                    )}
                    {isActing
                      ? "Идэвхжүүлж байна..."
                      : `${chosenPlan?.durationDays ?? 14} хоног үнэгүй эхлэх`}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleInitiate()}
                    disabled={isActing}
                    className="flex min-w-[240px] items-center justify-center gap-2 rounded-2xl bg-[#FFAD02] px-5 py-3.5 text-base font-black text-black shadow-sm shadow-amber-200 transition hover:bg-amber-500 disabled:bg-amber-300"
                  >
                    {isActing ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Crown className="h-5 w-5" />
                    )}
                    {isActing
                      ? "Үүсгэж байна..."
                      : `QPay-р ${chosenPlan?.price.toLocaleString()}₮ төлөх`}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {isActive && !hasPendingInvoice && (
        <div className="space-y-5 rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-950">
                Багц сунгах / шинэчлэх
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Илүү олон бүтээгдэхүүн, зураг, ангилал хэрэгтэй бол дараах
                багцаас сонгоно уу.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500">
              <RefreshCw className="h-3.5 w-3.5" />
              Сунгалт QPay-р баталгаажна
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {plans
              .filter((p) => !p.isTrial)
              .map((plan) => (
                <RenewPlanCard
                  key={plan.id}
                  plan={plan}
                  selected={selectedPlan === plan.id}
                  onSelect={() =>
                    setSelectedPlan(plan.id === selectedPlan ? null : plan.id)
                  }
                />
              ))}
          </div>

          {selectedPlan &&
            !plans.find((p) => p.id === selectedPlan)?.isTrial && (
              <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-amber-600">
                      Сонгосон сунгалт
                    </p>

                    <p className="mt-1 text-xl font-black text-slate-950">
                      {plans.find((p) => p.id === selectedPlan)?.name}
                      <span className="ml-2 text-base font-black text-[#FFAD02]">
                        {plans
                          .find((p) => p.id === selectedPlan)
                          ?.price.toLocaleString()}
                        ₮
                      </span>
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {plans.find((p) => p.id === selectedPlan)
                        ? resolvePlanDescription(
                            plans.find((p) => p.id === selectedPlan)!,
                          )
                        : ""}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleInitiate()}
                    disabled={isActing}
                    className="flex min-w-[240px] items-center justify-center gap-2 rounded-2xl bg-[#FFAD02] px-5 py-3.5 text-base font-black text-black shadow-sm shadow-amber-200 transition hover:bg-amber-500 disabled:bg-amber-300"
                  >
                    {isActing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    {isActing
                      ? "Үүсгэж байна..."
                      : `${
                          plans.find((p) => p.id === selectedPlan)?.name
                        } багцаар сунгах`}
                  </button>
                </div>
              </div>
            )}
        </div>
      )}

      {isActive && (
        <p className="text-center text-xs text-slate-400">
          DNS тархахад хэдэн цаг шаардлагатай тул хаяг шууд ажиллаагүй
          тохиолдолд хүлээнэ үү.
        </p>
      )}
    </div>
  );
}