"use client";

import { BadgeCheck, ChevronRight, Gem, Loader2, Medal, ShieldCheck, Sparkles } from "lucide-react";
import type { MembershipType } from "../../association/MembershipSelection";
import { parsePlanFeatures } from "./membershipPlanUtils";

type Props = {
  plans: MembershipType[];
  selectedType: string;
  onTypeChange: (value: string) => void;
  durationMonths: string;
  onDurationChange: (value: string) => void;
  submitting?: boolean;
  submittingPlanKey?: string;
  onPay: (type: string, months: string) => void;
  copy?: {
    tierEyebrow?: string;
    tierTitle?: string;
    tierDescription?: string;
    swipeHint?: string;
  };
};

const PLAN_META: Record<
  string,
  {
    action: string;
    icon: typeof ShieldCheck;
    recommended?: boolean;
    unavailable?: string[];
  }
> = {
  ACTIVE: {
    action: "Silver сонгох",
    icon: ShieldCheck,
    unavailable: ["Priority хүргэлтийн үйлчилгээ"],
  },
  BRANCH_COUNCIL: {
    action: "Gold сонгох",
    icon: Medal,
    recommended: true,
  },
  GOVERNING_COUNCIL: {
    action: "Platinum сонгох",
    icon: Gem,
  },
};

export function MembershipPlanPicker({
  plans,
  selectedType,
  onTypeChange,
  durationMonths,
  onDurationChange,
  submitting = false,
  submittingPlanKey = "",
  onPay,
  copy,
}: Props) {
  return (
    <div className="rounded-[22px] bg-white sm:border sm:border-slate-200 sm:p-4">
      <div className="mb-2 flex flex-col gap-0.5 sm:mb-3 sm:gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-orange-500 sm:text-[10px]">
            {copy?.tierEyebrow || "Tier сонгох"}
          </p>
          <h3 className="text-base font-black text-slate-950 sm:text-lg">
            {copy?.tierTitle || "Танд тохирох membership"}
          </h3>
        </div>
        <p className="text-[11px] font-bold text-slate-400 sm:text-xs">
          {copy?.tierDescription || "Хугацаа сонгоод card дээрээс төлнө."}
        </p>
      </div>

      <div className="mb-1.5 flex items-center justify-between rounded-full border border-orange-100 bg-orange-50 px-2.5 py-1.5 text-[10px] font-black text-orange-600 md:hidden">
        <span>{copy?.swipeHint || "Дараагийн tier-үүдийг хажуу тийш гүйлгэж харна"}</span>
        <span className="inline-flex items-center gap-1">
          Swipe
          <ChevronRight size={14} />
        </span>
      </div>

      <div className="-mx-2 flex snap-x gap-2 overflow-x-auto px-2 pb-1 [scrollbar-width:none] md:mx-0 md:grid md:gap-3 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3">
        {plans.map((plan) => (
          <MembershipTierCard
            key={plan.value}
            plan={plan}
            selected={selectedType === plan.value}
            durationMonths={durationMonths}
            onSelect={() => {
              onTypeChange(plan.value);
              const firstDuration = plan.durations[0];
              onDurationChange(
                firstDuration?.months ? String(firstDuration.months) : "",
              );
            }}
            onDurationChange={onDurationChange}
            submitting={submitting}
            submittingPlanKey={submittingPlanKey}
            onPay={onPay}
          />
        ))}
      </div>
    </div>
  );
}

function MembershipTierCard({
  plan,
  selected,
  durationMonths,
  onSelect,
  onDurationChange,
  submitting,
  submittingPlanKey,
  onPay,
}: {
  plan: MembershipType;
  selected: boolean;
  durationMonths: string;
  onSelect: () => void;
  onDurationChange: (value: string) => void;
  submitting: boolean;
  submittingPlanKey: string;
  onPay: (type: string, months: string) => void;
}) {
  const meta = PLAN_META[plan.value] || PLAN_META.ACTIVE;
  const Icon = meta.icon;
  const features = parsePlanFeatures(plan.desc, meta.unavailable);
  const defaultDuration = plan.durations[0];
  const activeDuration =
    plan.durations.find((duration) => durationMonths === String(duration.months)) ||
    defaultDuration;
  const activeDurationMonths = activeDuration ? String(activeDuration.months) : "";
  const activePlanKey = `${plan.value}:${activeDurationMonths}`;
  const isCreatingDefaultQr = submittingPlanKey === activePlanKey;

  return (
    <article
      className={`relative flex min-w-[58vw] snap-start flex-col overflow-hidden rounded-2xl border p-2.5 transition sm:min-w-[360px] sm:p-4 md:min-w-0 ${
        selected
          ? "border-orange-500 bg-orange-50 shadow-[0_18px_45px_rgba(249,115,22,0.16)]"
          : "border-slate-200 bg-slate-50/70 hover:border-orange-300 hover:bg-white"
      }`}
    >
      {meta.recommended && (
        <div className="absolute -right-10 top-4 rotate-45 bg-orange-600 px-9 py-1 text-[8px] font-black uppercase tracking-wide text-orange-50 sm:text-[9px]">
          санал болгох
        </div>
      )}

      <div className="mb-2 flex items-start justify-between gap-2 sm:mb-4 sm:gap-4">
        <div>
          <h4 className="text-lg font-black text-slate-950 sm:text-xl">{plan.label}</h4>
          <div className="mt-1.5 flex items-end gap-1.5 sm:mt-3 sm:gap-2">
            <span className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              {plan.price.split("₮")[0]}
            </span>
            <span className="pb-1 text-[10px] font-black uppercase text-slate-400 sm:text-xs">
              ₮ / сар
            </span>
          </div>
        </div>
        <span
          className={`mt-1 flex h-7 w-7 items-center justify-center rounded-lg sm:h-9 sm:w-9 sm:rounded-xl ${
            selected
              ? "bg-orange-500 text-white"
              : "bg-white text-orange-600 ring-1 ring-slate-200"
          }`}
        >
          <Icon size={16} />
        </span>
      </div>

      {plan.durations.length > 0 && (
        <div className="mb-2 grid gap-1.5 sm:mb-4 sm:gap-2">
          {plan.durations.map((duration) => {
            const durationSelected =
              selected && durationMonths === String(duration.months);
            return (
              <button
                key={duration.months}
                type="button"
                onClick={() => {
                  onSelect();
                  const months = String(duration.months);
                  onDurationChange(months);
                }}
                disabled={submitting}
                className={`min-h-9 rounded-xl border px-2.5 py-1.5 text-left text-[11px] font-black transition sm:min-h-10 sm:px-3 sm:py-2 sm:text-xs ${
                  durationSelected
                    ? "border-orange-500 bg-orange-500 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-orange-300"
                } disabled:cursor-not-allowed disabled:opacity-70`}
              >
                {submittingPlanKey === `${plan.value}:${duration.months}` ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={13} className="animate-spin" />
                    QR үүсгэж байна
                  </span>
                ) : (
                  duration.label
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex-1 space-y-1.5 sm:space-y-2.5">
        {features.map((feature) => (
          <FeatureLine key={`${feature.enabled}-${feature.text}`} enabled={feature.enabled}>
            {feature.text}
          </FeatureLine>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          if (!activeDurationMonths) return;
          onSelect();
          onDurationChange(activeDurationMonths);
          onPay(plan.value, activeDurationMonths);
        }}
        disabled={submitting || !activeDurationMonths}
        className={`mt-3 flex h-10 w-full items-center justify-center rounded-xl border text-[11px] font-black transition sm:mt-7 sm:h-12 sm:text-sm ${
          selected
            ? "border-orange-600 bg-orange-600 text-white shadow-lg shadow-orange-600/20 hover:bg-orange-500"
            : "border-slate-200 bg-white text-slate-600 hover:border-orange-400 hover:text-orange-600"
        } disabled:cursor-not-allowed disabled:opacity-70`}
      >
        {isCreatingDefaultQr ? (
          <>
            <Loader2 size={16} className="mr-2 animate-spin" />
            QR үүсгэж байна
          </>
        ) : (
          <>
            <BadgeCheck size={16} className="mr-2" />
            {selected && activeDuration
              ? `${activeDuration.price.toLocaleString()}₮ төлөх`
              : meta.action.replace("сонгох", "төлөх")}
          </>
        )}
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
      className={`flex items-start gap-2 text-[11px] font-bold leading-4 sm:gap-3 sm:text-sm sm:leading-6 ${
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
