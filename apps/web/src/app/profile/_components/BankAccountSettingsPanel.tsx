"use client";

import { MerchantSettingsSection } from "../../../../../vendor/src/app/(dashboard)/profile/merchant-settings";

/** Shared adapter: MGL Store and Vendor use one merchant settings implementation. */
export function BankAccountSettingsPanel({ organizationId }: { organizationId: string }) {
  return <MerchantSettingsSection organizationId={organizationId} mode="qpay" />;
}
