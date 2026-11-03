import { prisma } from "@mgl/database";

const POS_ACTIVATION_PREFIX = "pos-enabled-";
const enabledValues = new Set(["1", "true", "on", "yes"]);

export function isPosActivationEnabled(value: string | null | undefined): boolean {
  return typeof value === "string" && enabledValues.has(value.trim().toLowerCase());
}

/** Read the same organization setting written by Admin's POS open/close button.
 * No cache: the next session refresh must observe a close immediately. */
export async function readOpenPosOrganizationIds(
  organizationIds: readonly string[],
): Promise<ReadonlySet<string>> {
  const keys = [...new Set(organizationIds.filter(Boolean))]
    .map((id) => `${POS_ACTIVATION_PREFIX}${id}`);
  if (keys.length === 0) return new Set();
  const settings = await prisma.siteSetting.findMany({
    where: { key: { in: keys } },
    select: { key: true, value: true },
  });
  return new Set(settings
    .filter((setting) => isPosActivationEnabled(setting.value))
    .map((setting) => setting.key.slice(POS_ACTIVATION_PREFIX.length)));
}
