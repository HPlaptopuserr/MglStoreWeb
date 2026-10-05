"use client";

import { MerchantSettingsSection } from "../../../../../vendor/src/app/(dashboard)/profile/merchant-settings";

/** Organization bank settings use the same merchant connection as Vendor. */
export function BankAccountSettingsPanel({ organizationId }: { organizationId: string }) {
  return (
    <MerchantSettingsSection
      key={organizationId}
      organizationId={organizationId}
      mode="qpay"
      channel="POS"
    />
  );
}
