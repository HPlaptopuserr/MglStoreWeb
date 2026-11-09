import { isKitchenOnlyMember } from "./kitchen-access";

/** Organization managers retain management access; chef assignments take precedence. */
export function isCashierOnlyMember(member: {
  role?: string | null;
  orgRole?: string | null;
  capabilities?: readonly string[] | null;
}): boolean {
  return (
    member.role !== "ADMIN" &&
    member.role !== "SUPER_ADMIN" &&
    member.orgRole !== "OWNER" &&
    member.orgRole !== "ADMIN" &&
    !isKitchenOnlyMember(member) &&
    Boolean(member.capabilities?.includes("POS_CASHIER"))
  );
}

export const CASHIER_DASHBOARD_PATHS = [
  "/dashboard/restaurant-pos",
  "/dashboard/supply",
  "/dashboard/preorder",
] as const;

export function isCashierDashboardPath(path: string): boolean {
  return CASHIER_DASHBOARD_PATHS.some((allowed) => path === allowed);
}
