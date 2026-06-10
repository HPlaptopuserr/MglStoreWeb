"use client";

import { CheckCircle2, Gem, Medal, ShieldCheck, Sparkles } from "lucide-react";
import type { MembershipType } from "../../association/MembershipSelection";

type Props = {
  plans: MembershipType[];
  selectedType: string;
  onTypeChange: (value: string) => void;
  durationMonths: string;
  onDurationChange: (value: string) => void;
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
    action: "Get Silver",
    icon: ShieldCheck,
    unavailable: ["Priority delivery service"],
  },
  BRANCH_COUNCIL: {
    action: "Upgrade to Gold",
    icon: Medal,
    recommended: true,
  },
  GOVERNING_COUNCIL: {
    action: "Go Platinum",
    icon: Gem,
  },
};

export function MembershipPlanPicker({
  plans,
  selectedType,
  onTypeChange,
  durationMonths,
  onDurationChange,
}: Props) {
  return (
    <div className="rounded-[24px] bg-[#171d1d] p-4 text-white shadow-inner shadow-black/20 sm:p-6">
      <div className="mb-6 text-center">
        <p className="mx-auto inline-flex rounded-full border border-orange-400/30 bg-orange-500/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-orange-100">
          Elevate your experience
        </p>
        <h3 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
          MGL Premium Membership
        </h3>
        <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/60">
          Exclusive perks, priority service, meaningful rewards. Choose the tier
          that moves with you.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
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
}: {
  plan: MembershipType;
  selected: boolean;
  durationMonths: string;
  onSelect: () => void;
  onDurationChange: (value: string) => void;
}) {
  const meta = PLAN_META[plan.value] || PLAN_META.ACTIVE;
  const Icon = meta.icon;
  const features = plan.desc
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <article
      className={`relative overflow-hidden rounded-[18px] border p-5 transition ${
        selected
          ? "border-orange-500 bg-[#121818] shadow-[0_24px_70px_rgba(249,115,22,0.22)]"
          : "border-white/10 bg-white/[0.04] hover:border-orange-500/50"
      }`}
    >
      {meta.recommended && (
        <div className="absolute -right-11 top-5 rotate-45 bg-orange-600 px-10 py-1 text-[9px] font-black uppercase tracking-wide text-orange-50">
          Recommended
        </div>
      )}

      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h4 className="text-xl font-black text-white">{plan.label}</h4>
          <div className="mt-5 flex items-end gap-2">
            <span className="text-3xl font-black tracking-tight text-orange-100">
              {plan.price.split("₮")[0]}
            </span>
            <span className="pb-1 text-xs font-black uppercase text-slate-500">
              MNT / Mo
            </span>
          </div>
        </div>
        <span
          className={`mt-1 flex h-9 w-9 items-center justify-center rounded-xl ${
            selected
              ? "bg-orange-500 text-white"
              : "bg-white/5 text-orange-100 ring-1 ring-white/10"
          }`}
        >
          <Icon size={18} />
        </span>
      </div>

      {plan.durations.length > 0 && (
        <div className="mb-6 grid gap-2">
          {plan.durations.map((duration) => {
            const durationSelected =
              selected && durationMonths === String(duration.months);
            return (
              <button
                key={duration.months}
                type="button"
                onClick={() => {
                  if (!selected) onSelect();
                  onDurationChange(String(duration.months));
                }}
                className={`min-h-11 rounded-xl border px-3 py-2 text-left text-xs font-black transition ${
                  durationSelected
                    ? "border-orange-500 bg-orange-500 text-white"
                    : "border-white/10 bg-white/[0.06] text-white/72 hover:border-orange-500/60"
                }`}
              >
                {duration.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="space-y-4">
        {features.map((feature) => (
          <FeatureLine key={feature} enabled>
            {feature}
          </FeatureLine>
        ))}
        {meta.unavailable?.map((feature) => (
          <FeatureLine key={feature} enabled={false}>
            {feature}
          </FeatureLine>
        ))}
      </div>

      <button
        type="button"
        onClick={onSelect}
        className={`mt-7 flex h-12 w-full items-center justify-center rounded-xl border text-sm font-black transition ${
          selected
            ? "border-orange-600 bg-orange-600 text-white shadow-lg shadow-orange-600/20 hover:bg-orange-500"
            : "border-white/15 text-white/72 hover:border-orange-500 hover:text-white"
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
        enabled ? "text-white/86" : "text-white/34 line-through"
      }`}
    >
      <span
        className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
          enabled ? "text-orange-500" : "text-white/24"
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
