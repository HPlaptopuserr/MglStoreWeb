import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
  organizationId?: string | null;
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
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Token буруу эсвэл хугацаа дууссан" });
  }
}

/**
 * Check that the authenticated user has one of the allowed roles.
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
