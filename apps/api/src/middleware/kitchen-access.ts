import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import { isFullAdmin, isKitchenOnlyMember, isKitchenRequest } from "@mgl/types";

/** Enforce the selected organization's kitchen-only scope, including legacy API routes. */
export async function restrictKitchenMember(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return next();
  let claims: jwt.JwtPayload;
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "dev-secret-change-me",
    );
    if (typeof decoded === "string" || typeof decoded.userId !== "string")
      return next();
    claims = decoded;
  } catch {
    return next(); // Route authentication handles invalid credentials.
  }
  if (typeof claims.role === "string" && isFullAdmin(claims.role))
    return next();
  try {
    let membership = await prisma.organizationMember.findFirst({
      where: {
        userId: claims.userId,
        isActive: true,
        deletedAt: null,
        ...(typeof claims.organizationId === "string"
          ? { organizationId: claims.organizationId }
          : { isPrimary: true }),
      },
      select: { organizationId: true, role: true, capabilities: true },
    });
    if (!membership && !claims.organizationId) {
      membership = await prisma.organizationMember.findFirst({
        where: { userId: claims.userId, isActive: true, deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: { organizationId: true, role: true, capabilities: true },
      });
    }
    if (
      !membership ||
      !isKitchenOnlyMember({
        orgRole: membership.role,
        capabilities: membership.capabilities,
      })
    )
      return next();
    const sessionPath = req.path.replace(/^\/auth/, "");
    if (
      (req.method === "GET" && sessionPath === "/me") ||
      (req.method === "POST" &&
        sessionPath === "/vendor/switch-organization") ||
      (req.method === "GET" && req.path === "/site-settings")
    )
      return next();
    const path = req.path.replace(/^\/mobile/, "");
    if (!isKitchenRequest(req.method, path)) {
      return res
        .status(403)
        .json({ message: "Тогооч зөвхөн гал тогооны хэсэгт хандах эрхтэй" });
    }
    const branchId: unknown =
      req.method === "GET" ? req.query.branchId : req.body?.branchId;
    if (typeof branchId === "string" && branchId) {
      const branch = await prisma.branch.findFirst({
        where: {
          id: branchId,
          organizationId: membership.organizationId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!branch)
        return res
          .status(403)
          .json({ message: "Энэ салбарын гал тогоонд хандах эрхгүй" });
    }
    return next();
  } catch (error: unknown) {
    console.error("Kitchen access check failed", error);
    return res
      .status(500)
      .json({ message: "Гал тогооны эрх шалгаж чадсангүй" });
  }
}
