import { Capability } from "@mgl/database";
import {
  BUSINESS_CAPABILITY_OPTIONS,
  type BusinessAppFeatureKey,
} from "@mgl/types";

export function parseMemberCapabilities(body: unknown): Capability[] | null {
  if (typeof body !== "object" || body === null || Array.isArray(body))
    return null;
  const value = body as Record<string, unknown>;
  if (
    Object.keys(value).some(
      (key) => key !== "capabilities" && key !== "expectedCapabilities",
    )
  )
    return null;
  if (
    !Array.isArray(value.capabilities) ||
    !value.capabilities.every(isCapability)
  )
    return null;
  return [...new Set(value.capabilities)];
}

export function isCapability(value: unknown): value is Capability {
  return (
    typeof value === "string" &&
    Object.values(Capability).some((item) => item === value)
  );
}

/** Existing disabled assignments may be retained or revoked; only new grants are checked. */
export function blockedCapabilityGrants(
  next: readonly Capability[],
  previous: readonly Capability[],
  features: Record<BusinessAppFeatureKey, boolean>,
): Capability[] {
  return next.filter((capability) => {
    if (previous.includes(capability)) return false;
    const option = BUSINESS_CAPABILITY_OPTIONS[capability];
    return !option || !features[option.feature];
  });
}

export function sameCapabilities(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length && left.every((item) => right.includes(item))
  );
}
