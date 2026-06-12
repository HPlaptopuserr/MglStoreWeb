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
}: Props) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-3 sm:p-4">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
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

      <div className="grid gap-3 lg:grid-cols-3">
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
      className={`relative overflow-hidden rounded-[18px] border p-4 transition ${
        selected
          ? "border-orange-500 bg-orange-50 shadow-[0_18px_45px_rgba(249,115,22,0.16)]"
          : "border-slate-200 bg-slate-50/70 hover:border-orange-300 hover:bg-white"
      }`}
    >
      {meta.recommended && (
        <div className="absolute -right-10 top-4 rotate-45 bg-orange-600 px-9 py-1 text-[9px] font-black uppercase tracking-wide text-orange-50">
          санал болгох
        </div>
      )}

      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h4 className="text-xl font-black text-slate-950">{plan.label}</h4>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-3xl font-black tracking-tight text-slate-950">
              {plan.price.split("₮")[0]}
            </span>
            <span className="pb-1 text-xs font-black uppercase text-slate-400">
              ₮ / сар
            </span>
          </div>
        </div>
        <span
          className={`mt-1 flex h-9 w-9 items-center justify-center rounded-xl ${
            selected
              ? "bg-orange-500 text-white"
              : "bg-white text-orange-600 ring-1 ring-slate-200"
          }`}
        >
          <Icon size={18} />
        </span>
      </div>

      {plan.durations.length > 0 && (
        <div className="mb-4 grid gap-2">
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
                    : "border-slate-200 bg-white text-slate-600 hover:border-orange-300"
                }`}
              >
                {duration.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="space-y-2.5">
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
