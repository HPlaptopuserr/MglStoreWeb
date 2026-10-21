/** A chef assignment restricts staff to the kitchen even with legacy extra grants. */
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
      /^\/restaurant\/pos\/kitchen-(branches|tickets)\/?$/.test(path)) ||
    (method === "PATCH" &&
      /^\/restaurant\/pos\/kitchen-tickets\/[^/]+\/status\/?$/.test(path))
  );
}
