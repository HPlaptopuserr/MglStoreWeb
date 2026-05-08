import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import { requireAuth, requirePlatformPermission } from "../../middleware/auth";
import { Permission } from "@mgl/types";

const router: ExpressRouter = Router();

// Public: list active team members
router.get("/team", async (_req, res) => {
  try {
    const members = await (prisma as any).teamMember.findMany({
      where: { isActive: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    res.json(members);
  } catch {
    res.status(500).json({ message: "Серверийн алдаа" });
  }
});

// Admin: list all (including inactive)
router.get("/admin/team", requireAuth, requirePlatformPermission(Permission.MANAGE_SITE_SETTINGS), async (_req, res) => {
  try {
    const members = await (prisma as any).teamMember.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    res.json(members);
  } catch {
    res.status(500).json({ message: "Серверийн алдаа" });
  }
});

// Admin: create
router.post("/admin/team", requireAuth, requirePlatformPermission(Permission.MANAGE_SITE_SETTINGS), async (req, res) => {
  try {
    const { name, role, department, bio, avatarUrl, email, linkedinUrl, experience, skills, order } = req.body as {
      name: string;
      role: string;
      department?: string;
      bio?: string;
      avatarUrl?: string;
      email?: string;
      linkedinUrl?: string;
      experience?: string;
      skills?: string[];
      order?: number;
    };

    if (!name?.trim() || !role?.trim()) {
      return res.status(400).json({ message: "Нэр болон албан тушаал шаардлагатай" });
    }

    const member = await (prisma as any).teamMember.create({
      data: {
        name: name.trim(),
        role: role.trim(),
        department: department?.trim() || null,
        bio: bio?.trim() || null,
        avatarUrl: avatarUrl?.trim() || null,
        email: email?.trim() || null,
        linkedinUrl: linkedinUrl?.trim() || null,
        experience: experience?.trim() || null,
        skills: Array.isArray(skills) ? skills.filter(Boolean) : [],
        order: order ?? 0,
      },
    });

    res.status(201).json(member);
  } catch {
    res.status(500).json({ message: "Серверийн алдаа" });
  }
});

// Admin: update
router.put("/admin/team/:id", requireAuth, requirePlatformPermission(Permission.MANAGE_SITE_SETTINGS), async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await (prisma as any).teamMember.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Олдсонгүй" });

    const { name, role, department, bio, avatarUrl, email, linkedinUrl, experience, skills, order, isActive } = req.body;

    const member = await (prisma as any).teamMember.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(role !== undefined && { role: role.trim() }),
        ...(department !== undefined && { department: department?.trim() || null }),
        ...(bio !== undefined && { bio: bio?.trim() || null }),
        ...(avatarUrl !== undefined && { avatarUrl: avatarUrl?.trim() || null }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(linkedinUrl !== undefined && { linkedinUrl: linkedinUrl?.trim() || null }),
        ...(experience !== undefined && { experience: experience?.trim() || null }),
        ...(skills !== undefined && { skills: Array.isArray(skills) ? skills.filter(Boolean) : [] }),
        ...(order !== undefined && { order }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json(member);
  } catch {
    res.status(500).json({ message: "Серверийн алдаа" });
  }
});

// Admin: delete
router.delete("/admin/team/:id", requireAuth, requirePlatformPermission(Permission.MANAGE_SITE_SETTINGS), async (req, res) => {
  const { id } = req.params;
  try {
    await (prisma as any).teamMember.delete({ where: { id } });
    res.json({ success: true });
  } catch {
    res.status(404).json({ message: "Олдсонгүй" });
  }
});

export default router;
