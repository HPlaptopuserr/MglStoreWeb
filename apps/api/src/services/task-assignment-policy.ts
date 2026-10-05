/** Assignment follows the organization hierarchy, never the platform role. */
export function canAssignTaskToRole(callerRole: string, targetRole: string): boolean {
  const caller = callerRole.trim().toUpperCase();
  const target = targetRole.trim().toUpperCase();
  if (caller === "OWNER" || caller === "CEO") {
    return ["ADMIN", "MANAGER", "HR", "STAFF"].includes(target);
  }
  return ["ADMIN", "MANAGER"].includes(caller) && target === "STAFF";
}
