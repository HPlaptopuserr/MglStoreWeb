import type { OrgUser } from "./api";

/** Skip the additional section challenge only for the current organization's owner. */
export function canSkipSectionPin(
  user: Pick<OrgUser, "id" | "organizationId" | "orgRole">,
  organizationId: string,
  userId: string,
): boolean {
  return Boolean(
    organizationId &&
    user.id === userId &&
    user.organizationId === organizationId &&
    user.orgRole?.toUpperCase() === "OWNER",
  );
}
