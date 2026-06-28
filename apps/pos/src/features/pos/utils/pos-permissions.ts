export type PosPermission =
  | "pos:shift:open"
  | "pos:shift:close"
  | "pos:sale:create"
  | "pos:receipt:read"
  | "pos:report:read";

const ROLE_TO_PERMISSIONS: Record<string, PosPermission[]> = {
  ADMIN: [
    "pos:shift:open",
    "pos:shift:close",
    "pos:sale:create",
    "pos:receipt:read",
    "pos:report:read",
  ],
  CASHIER: ["pos:shift:open", "pos:shift:close", "pos:sale:create", "pos:receipt:read"],
  AUDITOR: ["pos:receipt:read", "pos:report:read"],
};

export function hasPosPermission(role: string, permission: PosPermission): boolean {
  return ROLE_TO_PERMISSIONS[role]?.includes(permission) ?? false;
}
