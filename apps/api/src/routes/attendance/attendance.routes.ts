import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import { requireAuth, type AuthPayload } from "../../middleware/auth";

const router: ExpressRouter = Router();

// ── Haversine distance (meters) ──────────────────────────────────────────────
function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ══════════════════════════════════════════════════════════════════════════════
//  ZONES — CRUD (owner / admin only)
// ══════════════════════════════════════════════════════════════════════════════

// ── GET /attendance/zones ────────────────────────────────────────────────────
router.get("/attendance/zones", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as AuthPayload;
    if (!user.organizationId) {
      return res.status(400).json({ message: "Байгууллага холбогдоогүй байна" });
    }
    const zones = await prisma.attendanceZone.findMany({
      where: { organizationId: user.organizationId },
      include: { branch: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(zones);
  } catch (error) {
    console.error("get zones error", error);
    res.status(500).json({ message: "Бүс авахад алдаа гарлаа" });
  }
});

// ── POST /attendance/zones ───────────────────────────────────────────────────
router.post("/attendance/zones", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as AuthPayload;
    if (!user.organizationId) {
      return res.status(400).json({ message: "Байгууллага холбогдоогүй байна" });
    }

    const { name, lat, lng, radiusMeters, branchId } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ message: "Бүсийн нэр шаардлагатай" });
    }
    if (typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ message: "Байршлын координат шаардлагатай" });
    }

    const zone = await prisma.attendanceZone.create({
      data: {
        organizationId: user.organizationId,
        branchId: branchId || null,
        name: name.trim(),
        lat,
        lng,
        radiusMeters: radiusMeters || 500,
      },
    });

    res.status(201).json(zone);
  } catch (error) {
    console.error("create zone error", error);
    res.status(500).json({ message: "Бүс үүсгэхэд алдаа гарлаа" });
  }
});

// ── PATCH /attendance/zones/:id ──────────────────────────────────────────────
router.patch("/attendance/zones/:id", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as AuthPayload;
    const zone = await prisma.attendanceZone.findFirst({
      where: { id: req.params.id, organizationId: user.organizationId ?? "" },
    });
    if (!zone) return res.status(404).json({ message: "Бүс олдсонгүй" });

    const { name, lat, lng, radiusMeters, isActive } = req.body;
    const updated = await prisma.attendanceZone.update({
      where: { id: zone.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(typeof lat === "number" && { lat }),
        ...(typeof lng === "number" && { lng }),
        ...(typeof radiusMeters === "number" && { radiusMeters }),
        ...(typeof isActive === "boolean" && { isActive }),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error("update zone error", error);
    res.status(500).json({ message: "Бүс засахад алдаа гарлаа" });
  }
});

// ── DELETE /attendance/zones/:id ─────────────────────────────────────────────
router.delete("/attendance/zones/:id", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as AuthPayload;
    const zone = await prisma.attendanceZone.findFirst({
      where: { id: req.params.id, organizationId: user.organizationId ?? "" },
    });
    if (!zone) return res.status(404).json({ message: "Бүс олдсонгүй" });

    await prisma.attendanceZone.delete({ where: { id: zone.id } });
    res.json({ message: "Бүс устгагдлаа" });
  } catch (error) {
    console.error("delete zone error", error);
    res.status(500).json({ message: "Бүс устгахад алдаа гарлаа" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  CLOCK IN / CLOCK OUT
// ══════════════════════════════════════════════════════════════════════════════

// ── POST /attendance/clock-in ────────────────────────────────────────────────
router.post("/attendance/clock-in", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as AuthPayload;
    if (!user.organizationId) {
      return res.status(400).json({ message: "Байгууллага холбогдоогүй байна" });
    }

    const { zoneId, lat, lng, method } = req.body;

    if (!zoneId || typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ message: "zoneId, lat, lng шаардлагатай" });
    }

    // Validate zone exists and is active
    const zone = await prisma.attendanceZone.findFirst({
      where: { id: zoneId, organizationId: user.organizationId, isActive: true },
    });
    if (!zone) return res.status(404).json({ message: "Бүс олдсонгүй" });

    // Check distance
    const distance = haversineMeters(lat, lng, zone.lat, zone.lng);
    if (distance > zone.radiusMeters) {
      return res.status(400).json({
        message: `Бүсээс гадуур байна (${Math.round(distance)}м зайтай, ${zone.radiusMeters}м дотор байх ёстой)`,
        distance: Math.round(distance),
        required: zone.radiusMeters,
      });
    }

    // Check if already clocked in today (no clock-out yet)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existing = await prisma.attendanceRecord.findFirst({
      where: {
        userId: user.userId,
        organizationId: user.organizationId,
        clockIn: { gte: today, lt: tomorrow },
        clockOut: null,
      },
    });
    if (existing) {
      return res.status(400).json({ message: "Аль хэдийн ирсэнээ бүртгүүлсэн байна" });
    }

    const record = await prisma.attendanceRecord.create({
      data: {
        userId: user.userId,
        organizationId: user.organizationId,
        zoneId,
        clockIn: new Date(),
        clockInLat: lat,
        clockInLng: lng,
        clockInMethod: method || "FINGERPRINT",
      },
      include: { zone: { select: { name: true } } },
    });

    res.status(201).json(record);
  } catch (error) {
    console.error("clock-in error", error);
    res.status(500).json({ message: "Цаг бүртгэхэд алдаа гарлаа" });
  }
});

// ── POST /attendance/clock-out ───────────────────────────────────────────────
router.post("/attendance/clock-out", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as AuthPayload;
    if (!user.organizationId) {
      return res.status(400).json({ message: "Байгууллага холбогдоогүй байна" });
    }

    const { lat, lng, method } = req.body;

    if (typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ message: "lat, lng шаардлагатай" });
    }

    // Find today's open record
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const record = await prisma.attendanceRecord.findFirst({
      where: {
        userId: user.userId,
        organizationId: user.organizationId,
        clockIn: { gte: today, lt: tomorrow },
        clockOut: null,
      },
      include: { zone: true },
    });

    if (!record) {
      return res.status(400).json({ message: "Ирсэн бүртгэл олдсонгүй" });
    }

    // Check distance from the zone
    const distance = haversineMeters(lat, lng, record.zone.lat, record.zone.lng);
    if (distance > record.zone.radiusMeters) {
      return res.status(400).json({
        message: `Бүсээс гадуур байна (${Math.round(distance)}м зайтай)`,
        distance: Math.round(distance),
        required: record.zone.radiusMeters,
      });
    }

    const clockOut = new Date();
    const totalMinutes = Math.round(
      (clockOut.getTime() - record.clockIn.getTime()) / 60000,
    );

    const updated = await prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        clockOut,
        clockOutLat: lat,
        clockOutLng: lng,
        clockOutMethod: method || "FINGERPRINT",
        totalMinutes,
      },
      include: { zone: { select: { name: true } } },
    });

    res.json(updated);
  } catch (error) {
    console.error("clock-out error", error);
    res.status(500).json({ message: "Цаг дуусгахад алдаа гарлаа" });
  }
});

// ── GET /attendance/today ────────────────────────────────────────────────────
router.get("/attendance/today", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as AuthPayload;
    if (!user.organizationId) {
      return res.status(400).json({ message: "Байгууллага холбогдоогүй байна" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const record = await prisma.attendanceRecord.findFirst({
      where: {
        userId: user.userId,
        organizationId: user.organizationId,
        clockIn: { gte: today, lt: tomorrow },
      },
      include: { zone: { select: { id: true, name: true } } },
      orderBy: { clockIn: "desc" },
    });

    res.json(record);
  } catch (error) {
    console.error("get today error", error);
    res.status(500).json({ message: "Өнөөдрийн бүртгэл авахад алдаа" });
  }
});

// ── GET /attendance/history ──────────────────────────────────────────────────
router.get("/attendance/history", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as AuthPayload;
    if (!user.organizationId) {
      return res.status(400).json({ message: "Байгууллага холбогдоогүй байна" });
    }

    const { userId, from, to, limit } = req.query;

    // Managers can view any user; staff can only view their own
    const targetUserId =
      userId && (user.orgRole === "OWNER" || user.orgRole === "ADMIN")
        ? String(userId)
        : user.userId;

    const where: any = {
      userId: targetUserId,
      organizationId: user.organizationId,
    };

    if (from || to) {
      where.clockIn = {};
      if (from) where.clockIn.gte = new Date(String(from));
      if (to) where.clockIn.lte = new Date(String(to));
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: {
        zone: { select: { name: true } },
        user: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
      },
      orderBy: { clockIn: "desc" },
      take: limit ? parseInt(String(limit), 10) : 30,
    });

    res.json(records);
  } catch (error) {
    console.error("get history error", error);
    res.status(500).json({ message: "Түүх авахад алдаа" });
  }
});

export default router;
