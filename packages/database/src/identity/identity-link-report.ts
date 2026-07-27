export interface IdentityCandidateUser {
  id: string;
  email: string;
  emailVerified: boolean;
  identitySubject: string | null;
  isActive: boolean;
  deletedAt: Date | null;
}

export interface IdentityLinkDryRunReport {
  schemaVersion: 1;
  product: "MGL_STORE";
  totalUsers: number;
  alreadyLinked: number;
  excludedInactiveOrDeleted: number;
  blockedWithoutVerifiedEmail: number;
  blockedInvalidEmail: number;
  manualReviewUsers: number;
  normalizedEmailCollisionGroups: number;
  eligibleUsers: number;
}

export function normalizeIdentityEmail(value: string): string | null {
  const normalized = value.normalize("NFKC").trim().toLowerCase();
  if (
    normalized.length === 0 ||
    normalized.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

export function createIdentityLinkDryRunReport(
  users: IdentityCandidateUser[]
): IdentityLinkDryRunReport {
  let alreadyLinked = 0;
  let excludedInactiveOrDeleted = 0;
  let blockedWithoutVerifiedEmail = 0;
  let blockedInvalidEmail = 0;
  const usersByNormalizedEmail = new Map<string, IdentityCandidateUser[]>();

  users.forEach((user) => {
    if (user.identitySubject) {
      alreadyLinked += 1;
      return;
    }
    if (!user.isActive || user.deletedAt) {
      excludedInactiveOrDeleted += 1;
      return;
    }
    if (!user.emailVerified) {
      blockedWithoutVerifiedEmail += 1;
      return;
    }
    const normalizedEmail = normalizeIdentityEmail(user.email);
    if (!normalizedEmail) {
      blockedInvalidEmail += 1;
      return;
    }
    usersByNormalizedEmail.set(normalizedEmail, [
      ...(usersByNormalizedEmail.get(normalizedEmail) ?? []),
      user
    ]);
  });

  let normalizedEmailCollisionGroups = 0;
  let manualReviewUsers = 0;
  let eligibleUsers = 0;
  usersByNormalizedEmail.forEach((group) => {
    if (group.length > 1) {
      normalizedEmailCollisionGroups += 1;
      manualReviewUsers += group.length;
    } else {
      eligibleUsers += 1;
    }
  });

  return {
    schemaVersion: 1,
    product: "MGL_STORE",
    totalUsers: users.length,
    alreadyLinked,
    excludedInactiveOrDeleted,
    blockedWithoutVerifiedEmail,
    blockedInvalidEmail,
    manualReviewUsers,
    normalizedEmailCollisionGroups,
    eligibleUsers
  };
}
