import { isFullAdmin } from "@mgl/types";

export function canViewStockOrderOwnership(
  platformRole: string | null | undefined,
  organizationRole: string | null | undefined,
) {
  return (
    isFullAdmin(platformRole ?? "") ||
    organizationRole === "OWNER" ||
    organizationRole === "ADMIN"
  );
}
