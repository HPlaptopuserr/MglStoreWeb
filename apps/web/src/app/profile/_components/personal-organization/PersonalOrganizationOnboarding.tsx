"use client";

import { Building2, Loader2 } from "lucide-react";
import { CreateOrganizationForm } from "./CreateOrganizationForm";
import { InvitationCard, PendingOrganizationCard } from "./RequestCards";
import { usePersonalOrganizationOnboarding } from "./usePersonalOrganizationOnboarding";
import type { AuthFetch } from "./personalOrganizationApi";

type PersonalOrganizationOnboardingProps = {
  authFetch: AuthFetch;
  onActivated: () => Promise<void>;
};

export function PersonalOrganizationOnboarding({
  authFetch,
  onActivated,
}: PersonalOrganizationOnboardingProps) {
  const onboarding = usePersonalOrganizationOnboarding({
    authFetch,
    onActivated,
  });

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-orange-600">
            <Building2 className="h-4 w-4" />
            Байгууллага үүсгэх
          </div>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
            Personal account-аасаа байгууллага баталгаажуул
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Байгууллага active болохын тулд өөрөөсөө гадна нэг хэрэглэгч баталгаажуулах шаардлагатай.
          </p>
        </div>
        <div className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
          2 хүн баталсны дараа active
        </div>
      </div>

      {onboarding.overviewLoading ? (
        <div className="mt-6 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Хүсэлтүүд ачаалж байна...
        </div>
      ) : onboarding.overviewError ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-medium text-rose-700">
          {onboarding.overviewError}
        </div>
      ) : null}

      {!onboarding.overviewLoading && onboarding.overview.invitations.length > 0 ? (
        <div className="mt-6 space-y-3">
          {onboarding.overview.invitations.map((invitation) => (
            <InvitationCard
              key={invitation.id}
              invitation={invitation}
              busy={onboarding.respondingId === invitation.id}
              onRespond={onboarding.respondToInvitation}
            />
          ))}
        </div>
      ) : null}

      {!onboarding.overviewLoading && onboarding.overview.ownedPending.length > 0 ? (
        <div className="mt-6 grid gap-3">
          {onboarding.overview.ownedPending.map((organization) => (
            <PendingOrganizationCard
              key={organization.id}
              organization={organization}
            />
          ))}
        </div>
      ) : null}

      <CreateOrganizationForm {...onboarding} />
    </section>
  );
}
