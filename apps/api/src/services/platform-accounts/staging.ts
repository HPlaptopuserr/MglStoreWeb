/** No HTTP code imports this module until the complete cutover is reviewed. */
export const ACCOUNT_PLATFORMS = [
  "STORE",
  "BUSINESS",
  "VENDOR",
  "WAREHOUSE",
  "ORG",
  "ADMIN",
] as const;
export type AccountPlatform = (typeof ACCOUNT_PLATFORMS)[number];

export interface StagingEntry {
  userId: string;
  platforms: AccountPlatform[];
}

function isPlatform(value: unknown): value is AccountPlatform {
  return (
    typeof value === "string" && ACCOUNT_PLATFORMS.some((p) => p === value)
  );
}

/** Explicit audited assignments; never infer access from a shared password. */
export function parseStagingManifest(value: unknown): StagingEntry[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 500) {
    throw new Error("Manifest must contain 1–500 users per atomic batch");
  }
  const users = new Set<string>();
  return value.map((entry: unknown) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error("Invalid manifest entry");
    }
    const record = entry as Record<string, unknown>;
    if (
      Object.keys(record).some((key) => key !== "userId" && key !== "platforms")
    ) {
      throw new Error(
        "Manifest accepts only userId and platforms; no credentials",
      );
    }
    const { userId, platforms } = record;
    if (
      typeof userId !== "string" ||
      !userId.trim() ||
      userId !== userId.trim()
    ) {
      throw new Error("Invalid userId");
    }
    if (users.has(userId)) throw new Error("Duplicate userId in manifest");
    users.add(userId);
    if (
      !Array.isArray(platforms) ||
      platforms.length === 0 ||
      !platforms.every(isPlatform)
    ) {
      throw new Error("Invalid platforms");
    }
    if (new Set(platforms).size !== platforms.length) {
      throw new Error("Duplicate platform in manifest");
    }
    return { userId, platforms };
  });
}

export interface StagingUser {
  id: string;
  isActive: boolean;
  deletedAt: Date | null;
  passwordHash: string | null;
}

export interface ExistingPlatformAccount {
  platform: AccountPlatform;
  passwordHash: string | null;
  status: "STAGED" | "ACTIVE" | "DISABLED";
}

export interface StagingPlan {
  inserts: {
    userId: string;
    platform: AccountPlatform;
    passwordHash: string | null;
  }[];
  existing: number;
  /** Staged credentials may drift while legacy password changes remain enabled. */
  stale: number;
}

export function planStaging(
  user: StagingUser,
  platforms: readonly AccountPlatform[],
  accounts: readonly ExistingPlatformAccount[],
): StagingPlan {
  if (!user.isActive || user.deletedAt) {
    throw new Error("Manifest includes an inactive or deleted user");
  }
  const existing = new Map(
    accounts.map((account) => [account.platform, account]),
  );
  const plan: StagingPlan = { inserts: [], existing: 0, stale: 0 };
  for (const platform of new Set(platforms)) {
    const account = existing.get(platform);
    if (account) {
      plan.existing += 1;
      if (
        account.status === "STAGED" &&
        account.passwordHash !== user.passwordHash
      ) {
        plan.stale += 1;
      }
      // Never overwrite an existing credential, even if it is null or disabled.
      continue;
    }
    plan.inserts.push({
      userId: user.id,
      platform,
      passwordHash: user.passwordHash,
    });
  }
  return plan;
}
