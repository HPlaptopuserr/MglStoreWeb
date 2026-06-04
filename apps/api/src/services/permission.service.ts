import { Request, Response, NextFunction } from "express";
import { prisma, Capability } from "@mgl/database";
import { Permission, isFullAdmin } from "@mgl/types";
import type { AuthPayload } from "../middleware/auth";

// ─── Role → Permission mapping ─────────────────────────────────────────

/** Platform ADMIN / SUPER_ADMIN gets everything */
const PLATFORM_ADMIN_PERMISSIONS: Permission[] = Object.values(Permission) as Permission[];

/** Org role → base permissions (before capabilities) */
const ORG_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  OWNER: [
    Permission.MANAGE_ORG_SETTINGS,
    Permission.MANAGE_ORG_MEMBERS,
    Permission.MANAGE_PRODUCTS,
    Permission.APPROVE_PRODUCTS,
    Permission.MANAGE_ORDERS,
    Permission.VIEW_ORDERS,
    Permission.MANAGE_POS,
    Permission.OPERATE_POS,
    Permission.MANAGE_STOCK,
    Permission.REQUEST_STOCK,
    Permission.MANAGE_DELIVERIES,
    Permission.VIEW_ORG_DASHBOARD,
    Permission.MANAGE_SERVICES,
  ],
  ADMIN: [
    Permission.MANAGE_ORG_MEMBERS,
    Permission.MANAGE_PRODUCTS,
    Permission.APPROVE_PRODUCTS,
    Permission.MANAGE_ORDERS,
    Permission.VIEW_ORDERS,
    Permission.MANAGE_POS,
    Permission.OPERATE_POS,
    Permission.MANAGE_STOCK,
    Permission.REQUEST_STOCK,
    Permission.MANAGE_DELIVERIES,
    Permission.VIEW_ORG_DASHBOARD,
    Permission.MANAGE_SERVICES,
  ],
  STAFF: [
    Permission.VIEW_ORDERS,
    Permission.REQUEST_STOCK,
    Permission.VIEW_ORG_DASHBOARD,
  ],
  VIEWER: [
    Permission.VIEW_ORDERS,
    Permission.VIEW_ORG_DASHBOARD,
  ],
};

/** Capability → additional permissions granted */
const CAPABILITY_PERMISSIONS: Record<string, Permission[]> = {
  [Capability.POS_CASHIER]: [Permission.OPERATE_POS],
  [Capability.DELIVERY_DRIVER]: [Permission.MAKE_DELIVERIES],
  [Capability.STOCK_MANAGER]: [Permission.MANAGE_STOCK, Permission.REQUEST_STOCK],
  [Capability.ORDER_PROCESSOR]: [Permission.MANAGE_ORDERS, Permission.VIEW_ORDERS],
};

// ─── Helpers ────────────────────────────────────────────────────────────

function buildPermissionSet(role: string, capabilities: string[]): Set<Permission> {
  const perms = new Set<Permission>();
  for (const p of ORG_ROLE_PERMISSIONS[role] || []) perms.add(p);
  for (const cap of capabilities) {
    for (const p of CAPABILITY_PERMISSIONS[cap] || []) perms.add(p);
  }
  return perms;
}

// ─── Resolver ───────────────────────────────────────────────────────────

export interface ResolvedPermissions {
  organizationId: string | null;
  orgRole: string | null;
  capabilities: string[];
  permissions: Set<Permission>;
}

/**
 * Resolve permissions for a user in a SPECIFIC organization.
 * Platform ADMIN → all permissions.  Others → membership in targetOrgId required.
 */
export async function resolvePermissionsForOrg(
  userId: string,
  platformRole: string,
  targetOrgId: string,
): Promise<ResolvedPermissions> {
  if (isFullAdmin(platformRole)) {
    return {
      organizationId: targetOrgId,
      orgRole: null,
      capabilities: [],
      permissions: new Set(PLATFORM_ADMIN_PERMISSIONS),
    };
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId, organizationId: targetOrgId, isActive: true },
    select: { organizationId: true, role: true, capabilities: true },
  });

  if (!membership) {
    return {
      organizationId: targetOrgId,
      orgRole: null,
      capabilities: [],
      permissions: new Set(),
    };
  }

  return {
    organizationId: membership.organizationId,
    orgRole: membership.role,
    capabilities: membership.capabilities,
    permissions: buildPermissionSet(membership.role, membership.capabilities),
  };
}

/**
 * Resolve permissions from the user's primary membership (legacy).
 * Prefer resolvePermissionsForOrg when the target org is known.
 */
export async function resolvePermissions(userId: string, platformRole: string): Promise<ResolvedPermissions> {
  if (isFullAdmin(platformRole)) {
    return {
      organizationId: null,
      orgRole: null,
      capabilities: [],
      permissions: new Set(PLATFORM_ADMIN_PERMISSIONS),
    };
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId, isActive: true, isPrimary: true },
    select: { organizationId: true, role: true, capabilities: true },
  });

  const m = membership
    || await prisma.organizationMember.findFirst({
        where: { userId, isActive: true },
        orderBy: { createdAt: "asc" },
        select: { organizationId: true, role: true, capabilities: true },
      });

  if (!m) {
    return { organizationId: null, orgRole: null, capabilities: [], permissions: new Set() };
  }

  return {
    organizationId: m.organizationId,
    orgRole: m.role,
    capabilities: m.capabilities,
    permissions: buildPermissionSet(m.role, m.capabilities),
  };
}

/**
 * Check if a user has an active membership in a specific organization.
 */
export async function hasOrgMembership(userId: string, organizationId: string): Promise<boolean> {
  const count = await prisma.organizationMember.count({
    where: { userId, organizationId, isActive: true },
  });
  return count > 0;
}

// ─── Org source type ────────────────────────────────────────────────────

export type OrgSource =
  | { from: "body"; field?: string }
  | { from: "params"; field?: string }
  | { from: "query"; field?: string };

// ─── Middleware ──────────────────────────────────────────────────────────

/**
 * Middleware: extract target organizationId from request, verify user has
 * active membership in that org, then check required permissions.
 * Platform ADMIN bypasses membership check (has all permissions).
 *
 * Must be used after requireAuth.
 *
 * Usage:
 *   router.post("/products", requireAuth, requireOrgPermission({ from: "body" }, Permission.MANAGE_PRODUCTS), handler);
 *   router.get("/stats", requireAuth, requireOrgPermission({ from: "query" }, Permission.VIEW_ORG_DASHBOARD), handler);
 */
export function requireOrgPermission(source: OrgSource, ...required: Permission[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) {
      return res.status(401).json({ message: "Нэвтрээгүй байна" });
    }

    const field = source.field || "organizationId";
    let targetOrgId: string | undefined;
    if (source.from === "body") targetOrgId = req.body?.[field];
    else if (source.from === "params") targetOrgId = req.params?.[field] as string;
    else if (source.from === "query") targetOrgId = req.query?.[field] as string;

    if (!targetOrgId || typeof targetOrgId !== "string") {
      return res.status(400).json({ message: `${field} шаардлагатай` });
    }

    try {
      const resolved = await resolvePermissionsForOrg(user.userId, user.role, targetOrgId);

      if (!isFullAdmin(user.role) && !resolved.orgRole) {
        return res.status(403).json({ message: "Энэ байгууллагад хандах эрхгүй байна" });
      }

      const missing = required.filter((p) => !resolved.permissions.has(p));
      if (missing.length > 0) {
        return res.status(403).json({ message: "Эрх хүрэлцэхгүй байна", required: missing });
      }

      (req as any).permissions = resolved;
      (req as any).user.organizationId = targetOrgId;
      (req as any).user.orgRole = resolved.orgRole;

      next();
    } catch (error) {
      console.error("[org permission check error]", error);
      return res.status(500).json({ message: "Эрх шалгахад алдаа гарлаа" });
    }
  };
}

/**
 * Inline helper for PATCH/DELETE routes where the target org is determined
 * from an existing record (not from request body/params).
 * Returns resolved permissions on success, null on failure (response already sent).
 *
 * Usage inside a handler:
 *   const product = await prisma.product.findUnique(...);
 *   const perm = await assertOrgPermission(req, res, product.organizationId, Permission.MANAGE_PRODUCTS);
 *   if (!perm) return;
 */
export async function assertOrgPermission(
  req: Request,
  res: Response,
  targetOrgId: string,
  ...required: Permission[]
): Promise<ResolvedPermissions | null> {
  const user = (req as any).user as AuthPayload | undefined;
  if (!user) {
    res.status(401).json({ message: "Нэвтрээгүй байна" });
    return null;
  }

  try {
    const resolved = await resolvePermissionsForOrg(user.userId, user.role, targetOrgId);

    if (!isFullAdmin(user.role) && !resolved.orgRole) {
      res.status(403).json({ message: "Энэ байгууллагад хандах эрхгүй байна" });
      return null;
    }

    const missing = required.filter((p) => !resolved.permissions.has(p));
    if (missing.length > 0) {
      res.status(403).json({ message: "Эрх хүрэлцэхгүй байна", required: missing });
      return null;
    }

    (req as any).permissions = resolved;
    (req as any).user.organizationId = targetOrgId;
    (req as any).user.orgRole = resolved.orgRole;

    return resolved;
  } catch (error) {
    console.error("[org permission assert error]", error);
    res.status(500).json({ message: "Эрх шалгахад алдаа гарлаа" });
    return null;
  }
}

/**
 * Middleware: require platform-level permissions (no org context).
 * Resolves from primary membership. Use requireOrgPermission instead when target org is known.
 */
export function requirePermission(...required: Permission[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) {
      return res.status(401).json({ message: "Нэвтрээгүй байна" });
    }

    try {
      const resolved = await resolvePermissions(user.userId, user.role);

      (req as any).permissions = resolved;
      if (resolved.organizationId) {
        (req as any).user.organizationId = resolved.organizationId;
        (req as any).user.orgRole = resolved.orgRole;
      }

      const missing = required.filter((p) => !resolved.permissions.has(p));
      if (missing.length > 0) {
        return res.status(403).json({ message: "Эрх хүрэлцэхгүй байна", required: missing });
      }

      next();
    } catch (error) {
      console.error("[permission check error]", error);
      return res.status(500).json({ message: "Эрх шалгахад алдаа гарлаа" });
    }
  };
}

/**
 * Check if a resolved set contains a specific permission.
 */
export function hasPermission(resolved: ResolvedPermissions, permission: Permission): boolean {
  return resolved.permissions.has(permission);
}
