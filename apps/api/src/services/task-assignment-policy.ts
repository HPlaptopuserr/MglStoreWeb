/** Uses persisted OrgRole only. Group roles never confer company privileges. */
export function canManageOrganizationTasks(role: string): boolean {
  return ["OWNER", "ADMIN"].includes(role.trim().toUpperCase());
}
export function canAssignTaskToRole(
  callerRole: string,
  targetRole: string,
): boolean {
  const caller = callerRole.trim().toUpperCase();
  const target = targetRole.trim().toUpperCase();
  return caller === "OWNER"
    ? ["ADMIN", "STAFF"].includes(target)
    : caller === "ADMIN" && target === "STAFF";
}
