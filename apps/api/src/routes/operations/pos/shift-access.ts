import type { AuthUser } from "./_shared";

export type ShiftAccessActor = Pick<
  AuthUser,
  "id" | "role" | "organizationId" | "orgRole"
>;
export type ShiftAccessTarget = { cashierId: string; organizationId: string };

/** Cashiers close their own shifts; owners can reconcile shifts in their selected store. */
export function canClosePosShift(
  actor: ShiftAccessActor,
  shift: ShiftAccessTarget,
) {
  if (actor.role === "ADMIN" || actor.role === "SUPER_ADMIN") return true;
  return (
    actor.organizationId === shift.organizationId &&
    (actor.id === shift.cashierId || actor.orgRole === "OWNER")
  );
}

export function requiresShiftCloseReason(
  actor: ShiftAccessActor,
  shift: ShiftAccessTarget,
) {
  return actor.id !== shift.cashierId;
}
