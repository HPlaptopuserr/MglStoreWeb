import { Router, type Router as ExpressRouter } from "express";
import { prisma, PlatformRole } from "@mgl/database";
import type { Prisma } from "@mgl/database";
import bcrypt from "bcryptjs";
import { Permission } from "@mgl/types";
import { requireAuth, type AuthPayload } from "../../middleware/auth";
import {
  requireOrgPermission,
  resolvePermissionsForOrg,
} from "../../services/permission.service";

const router: ExpressRouter = Router();

const VALID_ROLES = ["OWNER", "ADMIN", "STAFF", "VIEWER"] as const;
type OrgRole = (typeof VALID_ROLES)[number];

const ROLE_LABEL: Record<OrgRole, string> = {
  OWNER: "Эзэмшигч",
  ADMIN: "Менежер",
  STAFF: "Ажилтан",
  VIEWER: "Ажиглагч",
};

/** Role hierarchy: lower number = higher rank */
const ROLE_LEVEL: Record<OrgRole, number> = {
  OWNER: 1,
  ADMIN: 2,
  STAFF: 3,
  VIEWER: 3,
};

/**
 * Returns the role of the requesting user in the given org.
 * null if not a member.
 */
async function getCallerOrgRole(userId: string, organizationId: string): Promise<OrgRole | null> {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId, organizationId, isActive: true },
    select: { role: true },
  });
  return membership?.role as OrgRole | null;
}

// ───────────────────────────────────────────────────────────────────────────
// GET /org/members?organizationId=xxx — list members of own organization
// ───────────────────────────────────────────────────────────────────────────
router.get(
  "/org/members",
  requireAuth,
  requireOrgPermission({ from: "query" }, Permission.VIEW_ORG_DASHBOARD),
  async (req, res) => {
    const organizationId = req.query.organizationId as string;
    try {
      const members = await prisma.organizationMember.findMany({
        where: { organizationId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          capabilities: true,
          isActive: true,
          isPrimary: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
              profile: { select: { fullName: true, phoneNumber: true, avatarUrl: true } },
            },
          },
        },
      });

      return res.json(
        members.map((m: (typeof members)[number]) => ({
          id: m.id,
          userId: m.user.id,
          email: m.user.email,
          fullName: m.user.profile?.fullName || "",
          phone: m.user.profile?.phoneNumber || null,
          avatarUrl: m.user.profile?.avatarUrl || null,
          role: m.role,
          roleLabel: ROLE_LABEL[m.role as OrgRole] ?? m.role,
          capabilities: m.capabilities,
          isActive: m.isActive,
          isPrimary: m.isPrimary,
          createdAt: m.createdAt,
        })),
      );
    } catch (error) {
      console.error("list org members error", error);
      return res.status(500).json({ message: "Ажилтнуудын жагсаалт авахад алдаа гарлаа" });
    }
  },
);

// ───────────────────────────────────────────────────────────────────────────
// POST /org/members — add / invite a member (OWNER or ADMIN only)
// ───────────────────────────────────────────────────────────────────────────
router.post(
  "/org/members",
  requireAuth,
  requireOrgPermission({ from: "body" }, Permission.MANAGE_ORG_MEMBERS),
  async (req, res) => {
    const user = (req as any).user as AuthPayload;
    const { organizationId, fullName, email, phone, password, role } = req.body as {
      organizationId: string;
      fullName?: string;
      email?: string;
      phone?: string;
      password?: string;
      role?: string;
    };

    if (!fullName?.trim()) {
      return res.status(400).json({ message: "Нэр шаардлагатай" });
    }
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      return res.status(400).json({ message: "Имэйл зөв форматтай байх ёстой" });
    }

    // Determine caller's org role
    const callerRole = (req as any).user.orgRole as OrgRole | null;
    if (!callerRole) {
      return res.status(403).json({ message: "Энэ байгууллагад хандах эрхгүй" });
    }

    // Determine target role — caller cannot assign equal or higher role
    let targetRole: OrgRole = "STAFF";
    if (role && VALID_ROLES.includes(role as OrgRole)) {
      targetRole = role as OrgRole;
    }

    if (ROLE_LEVEL[targetRole] <= ROLE_LEVEL[callerRole]) {
      return res.status(403).json({ message: "Өөрөөсөө дээд эрх оноох боломжгүй" });
    }

    // Check maxMembers
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, maxMembers: true },
      });
      if (!org) return res.status(404).json({ message: "Байгууллага олдсонгүй" });

      const currentCount = await prisma.organizationMember.count({
        where: { organizationId, isActive: true },
      });
      if (currentCount >= org.maxMembers) {
        return res.status(400).json({
          message: `Байгууллагын гишүүдийн дээд хязгаар (${org.maxMembers}) хүрсэн байна`,
        });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
      });

      if (existingUser) {
        const alreadyMember = await prisma.organizationMember.findUnique({
          where: { userId_organizationId: { userId: existingUser.id, organizationId } },
        });
        if (alreadyMember) {
          return res.status(409).json({ message: "Энэ хэрэглэгч аль хэдийн бүртгэлтэй байна" });
        }
      }

      const passwordHash = password?.trim()
        ? await bcrypt.hash(password.trim(), 10)
        : await bcrypt.hash("Mgl@12345", 10);

      const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const targetUser = existingUser
          ? existingUser
          : await tx.user.create({
              data: {
                email: normalizedEmail,
                role: PlatformRole.USER,
                isActive: true,
                emailVerified: true,
                onboardingSource: "ADMIN" as any,
                passwordHash,
              },
              select: { id: true },
            });

        await tx.profile.upsert({
          where: { userId: targetUser.id },
          update: { fullName: fullName.trim(), phoneNumber: phone?.trim() || null },
          create: { userId: targetUser.id, fullName: fullName.trim(), phoneNumber: phone?.trim() || null },
        });

        const member = await tx.organizationMember.create({
          data: {
            userId: targetUser.id,
            organizationId,
            role: targetRole,
            isActive: true,
          },
        });

        // If user already exists and password was provided, update it
        if (existingUser && password?.trim()) {
          await tx.user.update({
            where: { id: existingUser.id },
            data: { passwordHash },
          });
        }

        return { userId: targetUser.id, memberId: member.id };
      });

      return res.status(201).json({
        memberId: result.memberId,
        userId: result.userId,
        email: normalizedEmail,
        fullName: fullName.trim(),
        role: targetRole,
        roleLabel: ROLE_LABEL[targetRole],
      });
    } catch (error) {
      console.error("add org member error", error);
      return res.status(500).json({ message: "Ажилтан нэмэхэд алдаа гарлаа" });
    }
  },
);

// ───────────────────────────────────────────────────────────────────────────
// PATCH /org/members/:memberId/role — change a member's role
// ───────────────────────────────────────────────────────────────────────────
router.patch(
  "/org/members/:memberId/role",
  requireAuth,
  async (req, res) => {
    const user = (req as any).user as AuthPayload;
    const { memberId } = req.params;
    const { role: newRole } = req.body as { role?: string };

    if (!newRole || !VALID_ROLES.includes(newRole as OrgRole)) {
      return res.status(400).json({ message: "Зөв role оруулна уу (ADMIN, STAFF, VIEWER)" });
    }

    try {
      const targetMember = await prisma.organizationMember.findUnique({
        where: { id: memberId },
        select: { id: true, role: true, organizationId: true, userId: true, isPrimary: true },
      });
      if (!targetMember) {
        return res.status(404).json({ message: "Гишүүн олдсонгүй" });
      }

      // Resolve caller's role
      const callerRole = await getCallerOrgRole(user.userId, targetMember.organizationId);
      if (!callerRole) {
        return res.status(403).json({ message: "Энэ байгууллагад хандах эрхгүй" });
      }

      // Cannot change own role
      if (targetMember.userId === user.userId) {
        return res.status(403).json({ message: "Өөрийн эрхийг өөрчлөх боломжгүй" });
      }

      // Cannot change role of someone at same or higher level
      if (ROLE_LEVEL[targetMember.role as OrgRole] <= ROLE_LEVEL[callerRole]) {
        return res.status(403).json({ message: "Өөрөөсөө дээд эрхтэй хүний role солих боломжгүй" });
      }

      // Cannot assign role equal or higher than own
      if (ROLE_LEVEL[newRole as OrgRole] <= ROLE_LEVEL[callerRole]) {
        return res.status(403).json({ message: "Өөрөөсөө дээд эрх оноох боломжгүй" });
      }

      // Cannot change OWNER's role (OWNER is set by system admin only)
      if (targetMember.role === "OWNER") {
        return res.status(403).json({ message: "Эзэмшигчийн эрхийг өөрчлөх боломжгүй" });
      }

      const updated = await prisma.organizationMember.update({
        where: { id: memberId },
        data: { role: newRole as any },
        select: { id: true, role: true },
      });

      return res.json({
        id: updated.id,
        role: updated.role,
        roleLabel: ROLE_LABEL[updated.role as OrgRole],
      });
    } catch (error) {
      console.error("change member role error", error);
      return res.status(500).json({ message: "Эрх өөрчлөхөд алдаа гарлаа" });
    }
  },
);

// ───────────────────────────────────────────────────────────────────────────
// DELETE /org/members/:memberId — remove a member from organization
// ───────────────────────────────────────────────────────────────────────────
router.delete(
  "/org/members/:memberId",
  requireAuth,
  async (req, res) => {
    const user = (req as any).user as AuthPayload;
    const { memberId } = req.params;

    try {
      const targetMember = await prisma.organizationMember.findUnique({
        where: { id: memberId },
        select: { id: true, role: true, organizationId: true, userId: true, isPrimary: true },
      });
      if (!targetMember) {
        return res.status(404).json({ message: "Гишүүн олдсонгүй" });
      }

      // Cannot remove self
      if (targetMember.userId === user.userId) {
        return res.status(403).json({ message: "Өөрийгөө хасах боломжгүй" });
      }

      // Cannot remove OWNER
      if (targetMember.role === "OWNER") {
        return res.status(403).json({ message: "Эзэмшигчийг хасах боломжгүй" });
      }

      // Resolve caller's role
      const callerRole = await getCallerOrgRole(user.userId, targetMember.organizationId);
      if (!callerRole) {
        return res.status(403).json({ message: "Энэ байгууллагад хандах эрхгүй" });
      }

      // Can only remove people at lower level
      if (ROLE_LEVEL[targetMember.role as OrgRole] <= ROLE_LEVEL[callerRole]) {
        return res.status(403).json({ message: "Өөрөөсөө дээд эрхтэй хүнийг хасах боломжгүй" });
      }

      await prisma.organizationMember.delete({ where: { id: memberId } });

      return res.json({ success: true });
    } catch (error) {
      console.error("remove org member error", error);
      return res.status(500).json({ message: "Гишүүн хасахад алдаа гарлаа" });
    }
  },
);

// ───────────────────────────────────────────────────────────────────────────
// PATCH /org/members/:memberId/toggle — toggle active/inactive
// ───────────────────────────────────────────────────────────────────────────
router.patch(
  "/org/members/:memberId/toggle",
  requireAuth,
  async (req, res) => {
    const user = (req as any).user as AuthPayload;
    const { memberId } = req.params;

    try {
      const targetMember = await prisma.organizationMember.findUnique({
        where: { id: memberId },
        select: { id: true, role: true, organizationId: true, userId: true, isActive: true },
      });
      if (!targetMember) {
        return res.status(404).json({ message: "Гишүүн олдсонгүй" });
      }

      if (targetMember.userId === user.userId) {
        return res.status(403).json({ message: "Өөрийгөө идэвхгүй болгох боломжгүй" });
      }

      if (targetMember.role === "OWNER") {
        return res.status(403).json({ message: "Эзэмшигчийг идэвхгүй болгох боломжгүй" });
      }

      const callerRole = await getCallerOrgRole(user.userId, targetMember.organizationId);
      if (!callerRole) {
        return res.status(403).json({ message: "Энэ байгууллагад хандах эрхгүй" });
      }

      if (ROLE_LEVEL[targetMember.role as OrgRole] <= ROLE_LEVEL[callerRole]) {
        return res.status(403).json({ message: "Эрх хүрэлцэхгүй" });
      }

      const updated = await prisma.organizationMember.update({
        where: { id: memberId },
        data: { isActive: !targetMember.isActive },
        select: { id: true, isActive: true },
      });

      return res.json(updated);
    } catch (error) {
      console.error("toggle org member error", error);
      return res.status(500).json({ message: "Төлөв өөрчлөхөд алдаа гарлаа" });
    }
  },
);

export default router;
