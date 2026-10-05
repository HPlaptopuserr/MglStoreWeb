import { AuditAction, prisma } from "@mgl/database";
import type { MerchantConfigurationEvent } from "@mgl/types";

/** Never store credentials, request bodies or bank account numbers in audit metadata. */
export async function recordMerchantConfigurationChange(
  userId: string,
  organizationId: string,
  channel: "POS" | "WEB",
  event: MerchantConfigurationEvent,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: { userId, action: AuditAction.MERCHANT_CONFIGURATION_CHANGED, meta: { organizationId, channel, event } },
    });
  } catch {
    // The provider mutation already succeeded; do not invite duplicate retries.
    console.error("Merchant configuration audit write failed", { organizationId, channel, event });
  }
}
