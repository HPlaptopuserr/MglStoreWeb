import assert from "node:assert/strict";
import test from "node:test";
import { Capability } from "@mgl/database";
import {
  BUSINESS_CAPABILITY_OPTIONS,
  type BusinessAppFeatureKey,
} from "@mgl/types";
import {
  availableMemberCapabilities,
  blockedCapabilityGrants,
} from "./business-member-capabilities";
const disabled: Record<BusinessAppFeatureKey, boolean> = {
  pos: false,
  sales: false,
  orders: false,
  inventory: false,
  attendance: false,
  tasks: false,
  delivery: false,
  checklist: false,
};
test("closed apps expose no staff capabilities and reject every new grant", () => {
  assert.deepEqual(availableMemberCapabilities(disabled), []);
  const capabilities = Object.values(Capability);
  assert.deepEqual(
    blockedCapabilityGrants(capabilities, [], disabled),
    capabilities,
  );
});
test("each capability follows its admin-controlled application", () => {
  for (const [key, option] of Object.entries(BUSINESS_CAPABILITY_OPTIONS)) {
    const capability = key as Capability;
    const features = { ...disabled, [option.feature]: true };
    assert.ok(availableMemberCapabilities(features).includes(key));
    assert.deepEqual(blockedCapabilityGrants([capability], [], features), []);
    assert.deepEqual(blockedCapabilityGrants([capability], [], disabled), [
      capability,
    ]);
  }
});
test("existing closed grants can be retained or removed, but not newly assigned", () => {
  assert.deepEqual(
    blockedCapabilityGrants(
      [Capability.POS_CASHIER],
      [Capability.POS_CASHIER],
      disabled,
    ),
    [],
  );
  assert.deepEqual(
    blockedCapabilityGrants([], [Capability.POS_CASHIER], disabled),
    [],
  );
  assert.deepEqual(
    blockedCapabilityGrants(
      [Capability.ORDER_PROCESSOR],
      [Capability.POS_CASHIER],
      disabled,
    ),
    [Capability.ORDER_PROCESSOR],
  );
});
