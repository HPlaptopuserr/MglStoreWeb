import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import { Permission, isAdminRole, isFullAdmin, hasPlatformPermission } from "@mgl/types";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("FATAL: JWT_SECRET environment variable is not set");
  }
  console.warn("[WARN] JWT_SECRET not set — using insecure dev fallback");
}
const jwtSecret = JWT_SECRET || "dev-secret-change-me";

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
  /** Primary org from token (backward compat) */
  organizationId?: string | null;
  /** Organization-level role resolved from membership */
  orgRole?: string | null;
}

/**
 * Verify Bearer token and attach user to request
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ message: "Token шаардлагатай" });
  }

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Bearer token шаардлагатай" });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as AuthPayload;
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Token буруу эсвэл хугацаа дууссан" });
  }
}

/**
 * Check that the authenticated user has one of the allowed system roles.
 * Must be used after requireAuth.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) {
      return res.status(401).json({ message: "Нэвтрээгүй байна" });
    }
    if (!roles.includes(user.role)) {
      return res.status(403).json({ message: "Эрх хүрэлцэхгүй байна" });
    }
    next();
  };
}

/**
 * Check that the user is any admin role (SUPER_ADMIN, ADMIN, HR_ADMIN, etc.)
 * Must be used after requireAuth.
 */
export function requireAnyAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as AuthPayload | undefined;
  if (!user) {
    return res.status(401).json({ message: "Нэвтрээгүй байна" });
  }
  if (!isAdminRole(user.role)) {
    return res.status(403).json({ message: "Admin эрх шаардлагатай" });
  }
  next();
}

/**
 * Check that the user has a specific platform-level permission based on their role.
 * SUPER_ADMIN and ADMIN have all permissions. Sub-admins have domain-specific ones.
 * Must be used after requireAuth.
 */
export function requirePlatformPermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) {
      return res.status(401).json({ message: "Нэвтрээгүй байна" });
    }
    // Full admins bypass
    if (isFullAdmin(user.role)) {
      return next();
    }
    // Check if the role has ALL required permissions
    for (const perm of permissions) {
      if (!hasPlatformPermission(user.role, perm)) {
        return res.status(403).json({ message: "Эрх хүрэлцэхгүй байна" });
      }
    }
    next();
  };
}

/**
 * Check that the user has ANY of the listed platform-level permissions (OR logic).
 * Must be used after requireAuth.
 */
export function requireAnyPlatformPermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) {
      return res.status(401).json({ message: "Нэвтрээгүй байна" });
    }
    if (isFullAdmin(user.role)) {
      return next();
    }
    const hasAny = permissions.some((perm) => hasPlatformPermission(user.role, perm));
    if (!hasAny) {
      return res.status(403).json({ message: "Эрх хүрэлцэхгүй байна" });
    }
    next();
  };
}

/**
 * Resolve the caller's primary organization from OrganizationMember.
 * Attaches organizationId to auth payload. Use after requireAuth.
 */
export async function resolveOrganization(userId: string): Promise<{ organizationId: string; orgRole: string } | null> {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId, isActive: true, isPrimary: true },
    select: { organizationId: true, role: true },
  });
  if (membership) return { organizationId: membership.organizationId, orgRole: membership.role };

  // Fallback: first active membership
  const fallback = await prisma.organizationMember.findFirst({
    where: { userId, isActive: true },
    orderBy: { createdAt: "asc" },
    select: { organizationId: true, role: true },
  });
  return fallback ? { organizationId: fallback.organizationId, orgRole: fallback.role } : null;
}
