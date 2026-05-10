import { Router, type Router as ExpressRouter } from "express";
import { prisma, ApprovalStatus, AssociationMembershipType } from "@mgl/database";
import { requireAuth, requirePlatformPermission } from "../../middleware/auth";
import { Permission } from "@mgl/types";

const router: ExpressRouter = Router();

/* ── Public: submit registration ───────────────────────────── */
router.post("/association/register", async (req, res) => {
  try {
    const {
      lastName, firstName, education, profession,
      organizationName, businessActivity, foundedYear,
      address, experience, phone, membershipType, durationMonths,
    } = req.body;

    if (!lastName || !firstName || !phone || !organizationName || !address || !membershipType) {
      return res.status(400).json({ message: "Заавал бөглөх талбарууд дутуу байна" });
    }

    const validTypes = Object.values(AssociationMembershipType);
    if (!validTypes.includes(membershipType)) {
      return res.status(400).json({ message: "Гишүүнчлэлийн төрөл буруу байна" });
    }

    const registration = await prisma.associationMemberRegistration.create({
      data: {
        lastName: lastName.trim(),
        firstName: firstName.trim(),
        education: education?.trim() || null,
        profession: profession?.trim() || null,
        organizationName: organizationName.trim(),
        businessActivity: businessActivity?.trim() || null,
        foundedYear: foundedYear?.trim() || null,
        address: address.trim(),
        experience: experience?.trim() || null,
        phone: phone.trim(),
        membershipType,
        durationMonths: membershipType === "BASIC" ? null : (durationMonths ? Number(durationMonths) : null),
      },
    });

    return res.status(201).json({ success: true, id: registration.id });
  } catch (e) {
    console.error("Association register error:", e);
    return res.status(500).json({ message: "Серверийн алдаа" });
  }
});

/* ── Admin: list registrations ─────────────────────────────── */
router.get(
  "/admin/association/registrations",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_REGISTRATIONS),
  async (req, res) => {
    try {
      const { status, membershipType, search, limit = "50", offset = "0" } = req.query;

      const where: any = {};
      if (status && status !== "ALL") where.status = status as ApprovalStatus;
      if (membershipType && membershipType !== "ALL") where.membershipType = membershipType as AssociationMembershipType;
      if (search) {
        const s = String(search);
        where.OR = [
          { firstName: { contains: s, mode: "insensitive" } },
          { lastName: { contains: s, mode: "insensitive" } },
          { organizationName: { contains: s, mode: "insensitive" } },
          { phone: { contains: s } },
        ];
      }

      const [data, total] = await Promise.all([
        prisma.associationMemberRegistration.findMany({
          where,
          orderBy: [{ status: "asc" }, { createdAt: "desc" }],
          take: Number(limit),
          skip: Number(offset),
        }),
        prisma.associationMemberRegistration.count({ where }),
      ]);

      return res.json({ data, total });
    } catch (e) {
      console.error("Association list error:", e);
      return res.status(500).json({ message: "Серверийн алдаа" });
    }
  }
);

/* ── Admin: get single ─────────────────────────────────────── */
router.get(
  "/admin/association/registrations/:id",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_REGISTRATIONS),
  async (req, res) => {
    try {
      const reg = await prisma.associationMemberRegistration.findUnique({
        where: { id: req.params.id },
      });
      if (!reg) return res.status(404).json({ message: "Олдсонгүй" });
      return res.json(reg);
    } catch (e) {
      return res.status(500).json({ message: "Серверийн алдаа" });
    }
  }
);

/* ── Admin: approve / reject ───────────────────────────────── */
router.patch(
  "/admin/association/registrations/:id",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_REGISTRATIONS),
  async (req, res) => {
    try {
      const { status, adminNote } = req.body;
      const validStatuses = ["APPROVED", "REJECTED"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Төлөв буруу байна" });
      }

      const reg = await prisma.associationMemberRegistration.update({
        where: { id: req.params.id },
        data: {
          status: status as ApprovalStatus,
          adminNote: adminNote?.trim() || null,
          reviewedAt: new Date(),
        },
      });

      return res.json(reg);
    } catch (e) {
      console.error("Association review error:", e);
      return res.status(500).json({ message: "Серверийн алдаа" });
    }
  }
);

/* ── Admin: stats summary ──────────────────────────────────── */
router.get(
  "/admin/association/stats",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_REGISTRATIONS),
  async (_req, res) => {
    try {
      const [total, pending, approved, byType] = await Promise.all([
        prisma.associationMemberRegistration.count(),
        prisma.associationMemberRegistration.count({ where: { status: "PENDING" } }),
        prisma.associationMemberRegistration.count({ where: { status: "APPROVED" } }),
        prisma.associationMemberRegistration.groupBy({
          by: ["membershipType"],
          _count: { id: true },
        }),
      ]);

      return res.json({ total, pending, approved, byType });
    } catch (e) {
      return res.status(500).json({ message: "Серверийн алдаа" });
    }
  }
);

/* ── Public: get association config (prices, labels, etc.) ─ */
router.get("/association/config", async (_req, res) => {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: "association_config" },
    });
    if (!setting) return res.json(null); // fallback to hardcoded
    return res.json(JSON.parse(setting.value));
  } catch (e) {
    console.error("Association config get error:", e);
    return res.status(500).json({ message: "Серверийн алдаа" });
  }
});

/* ── Admin: update association config ───────────────────── */
router.put(
  "/admin/association/config",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_REGISTRATIONS),
  async (req, res) => {
    try {
      const config = req.body;
      if (!config || typeof config !== "object") {
        return res.status(400).json({ message: "Config буруу байна" });
      }
      await prisma.siteSetting.upsert({
        where: { key: "association_config" },
        create: { key: "association_config", value: JSON.stringify(config) },
        update: { value: JSON.stringify(config) },
      });
      return res.json({ success: true });
    } catch (e) {
      console.error("Association config update error:", e);
      return res.status(500).json({ message: "Серверийн алдаа" });
    }
  }
);

export default router;
