import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import { requireAuth, type AuthPayload } from "../../middleware/auth";

const router: ExpressRouter = Router();

// ───────────────────────────────────────────────────────────────────────────
// GET /org/search?q=xxx — search organizations (authenticated users)
// ───────────────────────────────────────────────────────────────────────────
router.get("/org/search", requireAuth, async (req, res) => {
  const q = ((req.query.q as string) || "").trim();
  if (q.length < 2) {
    return res.status(400).json({ message: "Хайлтын үг 2-оос дээш тэмдэгт байх ёстой" });
  }

  const user = (req as any).user as AuthPayload;

  try {
    const orgs = await prisma.organization.findMany({
      where: {
        deletedAt: null,
        status: "ACTIVE",
        name: { contains: q, mode: "insensitive" },
      },
      take: 20,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        type: true,
        businessCategory: true,
        shortDescription: true,
        _count: { select: { members: { where: { isActive: true } } } },
      },
    });

    // Check if user already has pending requests for these orgs
    const orgIds = orgs.map((o: (typeof orgs)[number]) => o.id);
    const existingRequests = await prisma.orgJoinRequest.findMany({
      where: { userId: user.userId, organizationId: { in: orgIds }, status: "PENDING" },
      select: { organizationId: true },
    });
    const pendingOrgIds = new Set(existingRequests.map((r: (typeof existingRequests)[number]) => r.organizationId));

    // Check existing memberships
    const existingMemberships = await prisma.organizationMember.findMany({
      where: { userId: user.userId, organizationId: { in: orgIds } },
      select: { organizationId: true },
    });
    const memberOrgIds = new Set(existingMemberships.map((m: (typeof existingMemberships)[number]) => m.organizationId));

    return res.json(
      orgs.map((o: (typeof orgs)[number]) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        logoUrl: o.logoUrl,
        type: o.type,
        businessCategory: o.businessCategory,
        shortDescription: o.shortDescription,
        memberCount: o._count.members,
        hasPendingRequest: pendingOrgIds.has(o.id),
        isMember: memberOrgIds.has(o.id),
      })),
    );
  } catch (error) {
    console.error("org search error", error);
    return res.status(500).json({ message: "Байгууллага хайхад алдаа гарлаа" });
  }
});

// ───────────────────────────────────────────────────────────────────────────
// POST /org/join-request — request to join an organization
// ───────────────────────────────────────────────────────────────────────────
router.post("/org/join-request", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthPayload;
  const { organizationId, message } = req.body as {
    organizationId?: string;
    message?: string;
  };

  if (!organizationId) {
    return res.status(400).json({ message: "Байгууллагын ID шаардлагатай" });
  }

  try {
    // Check org exists
    const org = await prisma.organization.findFirst({
      where: { id: organizationId, deletedAt: null, status: "ACTIVE" },
      select: { id: true, name: true },
    });
    if (!org) {
      return res.status(404).json({ message: "Байгууллага олдсонгүй" });
    }

    // Check if already a member
    const existingMembership = await prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId: user.userId, organizationId } },
    });
    if (existingMembership) {
      return res.status(409).json({ message: "Та энэ байгууллагад аль хэдийн бүртгэлтэй байна" });
    }

    // Check if already has pending request
    const existingRequest = await prisma.orgJoinRequest.findUnique({
      where: { userId_organizationId: { userId: user.userId, organizationId } },
    });
    if (existingRequest) {
      if (existingRequest.status === "PENDING") {
        return res.status(409).json({ message: "Хүсэлт аль хэдийн илгээсэн байна" });
      }
      // If previously rejected, allow re-request by updating
      if (existingRequest.status === "REJECTED") {
        const updated = await prisma.orgJoinRequest.update({
          where: { id: existingRequest.id },
          data: { status: "PENDING", message: message?.trim() || null, rejectedReason: null },
        });
        return res.status(201).json({
          id: updated.id,
          organizationId,
          organizationName: org.name,
          status: "PENDING",
        });
      }
    }

    const joinRequest = await prisma.orgJoinRequest.create({
      data: {
        userId: user.userId,
        organizationId,
        message: message?.trim() || null,
      },
    });

    return res.status(201).json({
      id: joinRequest.id,
      organizationId,
      organizationName: org.name,
      status: "PENDING",
    });
  } catch (error) {
    console.error("join request error", error);
    return res.status(500).json({ message: "Хүсэлт илгээхэд алдаа гарлаа" });
  }
});

// ───────────────────────────────────────────────────────────────────────────
// GET /org/join-request/my — get current user's join requests
// ───────────────────────────────────────────────────────────────────────────
router.get("/org/join-request/my", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthPayload;

  try {
    const requests = await prisma.orgJoinRequest.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        message: true,
        rejectedReason: true,
        createdAt: true,
        organization: {
          select: { id: true, name: true, logoUrl: true, type: true },
        },
      },
    });

    return res.json(
      requests.map((r: (typeof requests)[number]) => ({
        id: r.id,
        status: r.status,
        message: r.message,
        rejectedReason: r.rejectedReason,
        createdAt: r.createdAt,
        organizationId: r.organization.id,
        organizationName: r.organization.name,
        organizationLogo: r.organization.logoUrl,
        organizationType: r.organization.type,
      })),
    );
  } catch (error) {
    console.error("my join requests error", error);
    return res.status(500).json({ message: "Хүсэлтүүд ачаалахад алдаа гарлаа" });
  }
});

// ───────────────────────────────────────────────────────────────────────────
// GET /org/join-request/pending?organizationId=xxx — list pending requests for an org (OWNER/ADMIN)
// ───────────────────────────────────────────────────────────────────────────
router.get("/org/join-request/pending", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthPayload;
  const organizationId = req.query.organizationId as string;

  if (!organizationId) {
    return res.status(400).json({ message: "organizationId шаардлагатай" });
  }

  // Verify caller is OWNER or ADMIN of the org
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.userId, organizationId, isActive: true, role: { in: ["OWNER", "ADMIN"] } },
  });
  if (!membership) {
    return res.status(403).json({ message: "Эрх хүрэхгүй байна" });
  }

  try {
    const requests = await prisma.orgJoinRequest.findMany({
      where: { organizationId, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        message: true,
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
      requests.map((r: (typeof requests)[number]) => ({
        id: r.id,
        userId: r.user.id,
        email: r.user.email,
        fullName: r.user.profile?.fullName || "",
        phone: r.user.profile?.phoneNumber || null,
        avatarUrl: r.user.profile?.avatarUrl || null,
        message: r.message,
        createdAt: r.createdAt,
      })),
    );
  } catch (error) {
    console.error("pending join requests error", error);
    return res.status(500).json({ message: "Хүсэлтүүд ачаалахад алдаа гарлаа" });
  }
});

// ───────────────────────────────────────────────────────────────────────────
// PATCH /org/join-request/:requestId — approve or reject (OWNER/ADMIN)
// ───────────────────────────────────────────────────────────────────────────
router.patch("/org/join-request/:requestId", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthPayload;
  const { requestId } = req.params;
  const { action, role, rejectedReason } = req.body as {
    action: "approve" | "reject";
    role?: string;
    rejectedReason?: string;
  };

  if (!action || !["approve", "reject"].includes(action)) {
    return res.status(400).json({ message: "action нь approve эсвэл reject байх ёстой" });
  }

  try {
    const joinRequest = await prisma.orgJoinRequest.findUnique({
      where: { id: requestId },
      select: { id: true, userId: true, organizationId: true, status: true },
    });

    if (!joinRequest) {
      return res.status(404).json({ message: "Хүсэлт олдсонгүй" });
    }
    if (joinRequest.status !== "PENDING") {
      return res.status(400).json({ message: "Хүсэлт аль хэдийн шийдвэрлэгдсэн" });
    }

    // Verify caller is OWNER or ADMIN
    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId: user.userId,
        organizationId: joinRequest.organizationId,
        isActive: true,
        role: { in: ["OWNER", "ADMIN"] },
      },
    });
    if (!membership) {
      return res.status(403).json({ message: "Эрх хүрэхгүй байна" });
    }

    if (action === "reject") {
      await prisma.orgJoinRequest.update({
        where: { id: requestId },
        data: { status: "REJECTED", rejectedReason: rejectedReason?.trim() || null },
      });
      return res.json({ status: "REJECTED" });
    }

    // Approve — check maxMembers
    const org = await prisma.organization.findUnique({
      where: { id: joinRequest.organizationId },
      select: { maxMembers: true },
    });
    const currentCount = await prisma.organizationMember.count({
      where: { organizationId: joinRequest.organizationId, isActive: true },
    });
    if (org && currentCount >= org.maxMembers) {
      return res.status(400).json({
        message: `Гишүүдийн дээд хязгаар (${org.maxMembers}) хүрсэн байна`,
      });
    }

    const targetRole = role === "ADMIN" ? "ADMIN" : "STAFF";

    await prisma.$transaction(async (tx) => {
      await tx.orgJoinRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED" },
      });

      await tx.organizationMember.create({
        data: {
          userId: joinRequest.userId,
          organizationId: joinRequest.organizationId,
          role: targetRole as any,
          isActive: true,
        },
      });
    });

    return res.json({ status: "APPROVED", role: targetRole });
  } catch (error) {
    console.error("handle join request error", error);
    return res.status(500).json({ message: "Хүсэлт шийдвэрлэхэд алдаа гарлаа" });
  }
});

// ───────────────────────────────────────────────────────────────────────────
// GET /org/user-search?q=xxx — search users by email/phone (for member invite)
// Only available to OWNER/ADMIN of an org
// ───────────────────────────────────────────────────────────────────────────
router.get("/org/user-search", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthPayload;
  const q = ((req.query.q as string) || "").trim();
  const organizationId = req.query.organizationId as string;

  if (!organizationId) {
    return res.status(400).json({ message: "organizationId шаардлагатай" });
  }
  if (q.length < 3) {
    return res.status(400).json({ message: "Хайлтын үг 3-аас дээш тэмдэгт байх ёстой" });
  }

  // Verify caller is OWNER or ADMIN
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.userId, organizationId, isActive: true, role: { in: ["OWNER", "ADMIN"] } },
  });
  if (!membership) {
    return res.status(403).json({ message: "Эрх хүрэхгүй байна" });
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { profile: { phoneNumber: { contains: q } } },
          { profile: { fullName: { contains: q, mode: "insensitive" } } },
        ],
      },
      take: 15,
      select: {
        id: true,
        email: true,
        profile: { select: { fullName: true, phoneNumber: true, avatarUrl: true } },
        organizationMemberships: {
          where: { organizationId },
          select: { id: true },
        },
      },
    });

    return res.json(
      users.map((u: (typeof users)[number]) => ({
        id: u.id,
        email: u.email,
        fullName: u.profile?.fullName || "",
        phone: u.profile?.phoneNumber || null,
        avatarUrl: u.profile?.avatarUrl || null,
        isAlreadyMember: u.organizationMemberships.length > 0,
      })),
    );
  } catch (error) {
    console.error("user search error", error);
    return res.status(500).json({ message: "Хэрэглэгч хайхад алдаа гарлаа" });
  }
});

export default router;
