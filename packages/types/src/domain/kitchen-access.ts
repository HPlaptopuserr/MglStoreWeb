/** A chef assignment restricts staff to kitchen and receiving tasks even with legacy extra grants. */
export function isKitchenOnlyMember(member: {
  orgRole?: string | null;
  capabilities?: readonly string[] | null;
}): boolean {
  return (
    member.orgRole !== "OWNER" &&
    member.orgRole !== "ADMIN" &&
    Boolean(member.capabilities?.includes("KITCHEN_CHEF"))
  );
}

export function isKitchenRequest(method: string, path: string): boolean {
  return (
    (method === "GET" &&
      /^\/pos\/(receiving-registers|products|incoming-dispatches)\/?$/.test(
        path,
      )) ||
    (method === "POST" && path === "/pos/quick-restock") ||
    (method === "POST" &&
      /^\/pos\/incoming-dispatches\/[^/]+\/receive\/?$/.test(path)) ||
    (method === "GET" &&
      /^\/restaurant\/pos\/kitchen-(branches|tickets)\/?$/.test(path)) ||
    (method === "PATCH" &&
      /^\/restaurant\/pos\/kitchen-tickets\/[^/]+\/status\/?$/.test(path))
  );
}

export const KITCHEN_DASHBOARD_PATHS = [
  "/dashboard/kitchen-display",
  "/dashboard/supply",
  "/dashboard/preorder",
] as const;

export function isKitchenDashboardPath(path: string): boolean {
  return KITCHEN_DASHBOARD_PATHS.some((allowed) => path === allowed);
}
