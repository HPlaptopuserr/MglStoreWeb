import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { prisma } from "@mgl/database";
import { recordMerchantConfigurationChange } from "./merchant-configuration-audit";

const original = prisma.auditLog.create;
afterEach(() => { Reflect.set(prisma.auditLog, "create", original); });
test("merchant audit records actor, organization, channel and event without credentials", async () => {
  let payload: unknown;
  Reflect.set(prisma.auditLog, "create", async (args: unknown) => { payload = args; return {}; });
  await recordMerchantConfigurationChange("owner", "org", "WEB", "CONNECTED");
  assert.deepEqual(payload, { data: { userId: "owner", action: "MERCHANT_CONFIGURATION_CHANGED", meta: { organizationId: "org", channel: "WEB", event: "CONNECTED" } } });
});
test("audit failure does not turn a completed provider mutation into a retryable failure", async () => {
  Reflect.set(prisma.auditLog, "create", async () => { throw new Error("audit unavailable"); });
  await assert.doesNotReject(recordMerchantConfigurationChange("owner", "org", "POS", "DISCONNECTED"));
});
