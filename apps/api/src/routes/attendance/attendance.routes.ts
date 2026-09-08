import { Router, type Response, type Router as ExpressRouter } from "express";
import { prisma, type Prisma } from "@mgl/database";
import { requireAuth, type AuthPayload } from "../../middleware/auth";
import {
  canManageAttendance,
  canViewWorkforceAttendance,
} from "./attendance-access.policy";
import { sendAttendanceError } from "./attendance-error";

const router: ExpressRouter = Router();
type AttendanceMethod = "FINGERPRINT" | "FACE" | "PIN" | "AUTO";
type TeamAttendanceStatus = "PRESENT" | "CLOCKED_OUT" | "ABSENT";
type AttendanceContext = {
  userId: string;
  organizationId: string;
  orgRole: string | null;
  capabilities: string[];
};
type AttendanceTeamMember = {
  id: string;
  userId: string;
  role: string;
  department?: string | null;
  user: {
    id: string;
    email: string | null;
    profile: {
      fullName: string | null;
      phoneNumber: string | null;
      avatarUrl: string | null;
    } | null;
  };
};

const ATTENDANCE_UTC_OFFSET_MINUTES = Number(
  process.env.ATTENDANCE_UTC_OFFSET_MINUTES ?? 480,
);

async function resolveAttendanceContext(
  user: AuthPayload,
): Promise<AttendanceContext | null> {
  const baseWhere = {
    userId: user.userId,
    isActive: true,
    deletedAt: null,
  };

  const tokenMembership = user.organizationId
    ? await prisma.organizationMember.findFirst({
        where: { ...baseWhere, organizationId: user.organizationId },
        select: { organizationId: true, role: true, capabilities: true },
      })
    : null;

  const membership =
    tokenMembership ??
    (await prisma.organizationMember.findFirst({
      where: baseWhere,
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      select: { organizationId: true, role: true, capabilities: true },
    }));

  if (!membership) return null;

  return {
    userId: user.userId,
    organizationId: membership.organizationId,
    orgRole: membership.role,
    capabilities: membership.capabilities,
  };
}

function rejectAttendanceManagement(res: Response) {
  return res.status(403).json({ message: "Ирц удирдах эрх хүрэлцэхгүй" });
}

function parseAttendanceMethod(method: unknown): AttendanceMethod {
  if (method === "AUTO") return "AUTO";
  if (method === "FACE") return "FACE";
  if (method === "PIN") return "PIN";
  return "FINGERPRINT";
}

function parseClientDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Attendance timestamps are stored as UTC-shaped wall time because mobile
 * clients intentionally submit local ISO values without an offset. Build the
 * current wall clock explicitly so a UTC production server does not treat
 * 00:00-07:59 in Mongolia as the previous attendance day.
 */
function attendanceWallNow(now = new Date()): Date {
  return new Date(now.getTime() + ATTENDANCE_UTC_OFFSET_MINUTES * 60_000);
}

function startOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function nextDay(date: Date): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

async function listAttendanceTeamMembers(
  organizationId: string,
): Promise<AttendanceTeamMember[]> {
  try {
    return await prisma.organizationMember.findMany({
      where: {
        organizationId,
        isActive: true,
        deletedAt: null,
      },
      orderBy: [{ department: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        userId: true,
        role: true,
        department: true,
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: { fullName: true, phoneNumber: true, avatarUrl: true },
            },
          },
        },
      },
    });
  } catch (error) {
    console.warn("team attendance member department fallback", error);
    return prisma.organizationMember.findMany({
      where: {
        organizationId,
        isActive: true,
        deletedAt: null,
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        userId: true,
        role: true,
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: { fullName: true, phoneNumber: true, avatarUrl: true },
            },
          },
        },
      },
    });
  }
}

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
    const context = await resolveAttendanceContext(user);
    if (!context) {
      return res
        .status(400)
        .json({ message: "Байгууллага холбогдоогүй байна" });
    }
    const zones = await prisma.attendanceZone.findMany({
      where: { organizationId: context.organizationId },
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
    const context = await resolveAttendanceContext(user);
    if (!context) {
      return res
        .status(400)
        .json({ message: "Байгууллага холбогдоогүй байна" });
    }
    if (!canManageAttendance(context)) {
      return rejectAttendanceManagement(res);
    }

    const { name, lat, lng, radiusMeters, branchId } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ message: "Бүсийн нэр шаардлагатай" });
    }
    if (typeof lat !== "number" || typeof lng !== "number") {
      return res
        .status(400)
        .json({ message: "Байршлын координат шаардлагатай" });
    }

    const zone = await prisma.attendanceZone.create({
      data: {
        organizationId: context.organizationId,
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
    const context = await resolveAttendanceContext(user);
    if (!context) {
      return res
        .status(400)
        .json({ message: "Байгууллага холбогдоогүй байна" });
    }
    if (!canManageAttendance(context)) {
      return rejectAttendanceManagement(res);
    }

    const zone = await prisma.attendanceZone.findFirst({
      where: { id: req.params.id, organizationId: context.organizationId },
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
    const context = await resolveAttendanceContext(user);
    if (!context) {
      return res
        .status(400)
        .json({ message: "Байгууллага холбогдоогүй байна" });
    }
    if (!canManageAttendance(context)) {
      return rejectAttendanceManagement(res);
    }

    const zone = await prisma.attendanceZone.findFirst({
      where: { id: req.params.id, organizationId: context.organizationId },
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
    const context = await resolveAttendanceContext(user);
    if (!context) {
      return res
        .status(400)
        .json({ message: "Байгууллага холбогдоогүй байна" });
    }

    const { zoneId, lat, lng, method, clockInAt } = req.body;

    if (!zoneId || typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ message: "zoneId, lat, lng шаардлагатай" });
    }

    // Validate zone exists and is active
    const zone = await prisma.attendanceZone.findFirst({
      where: {
        id: zoneId,
        organizationId: context.organizationId,
        isActive: true,
      },
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

    const clockIn = parseClientDate(clockInAt) ?? attendanceWallNow();

    // Check if already clocked in for the submitted day (no clock-out yet)
    const today = startOfDay(clockIn);
    const tomorrow = nextDay(today);

    const existing = await prisma.attendanceRecord.findFirst({
      where: {
        userId: context.userId,
        organizationId: context.organizationId,
        clockIn: { gte: today, lt: tomorrow },
        clockOut: null,
      },
    });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Аль хэдийн ирсэнээ бүртгүүлсэн байна" });
    }

    const record = await prisma.attendanceRecord.create({
      data: {
        userId: context.userId,
        organizationId: context.organizationId,
        zoneId,
        clockIn,
        clockInLat: lat,
        clockInLng: lng,
        clockInMethod: parseAttendanceMethod(method),
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
    const context = await resolveAttendanceContext(user);
    if (!context) {
      return res
        .status(400)
        .json({ message: "Байгууллага холбогдоогүй байна" });
    }

    const { lat, lng, method, clockOutAt } = req.body;

    if (typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ message: "lat, lng шаардлагатай" });
    }

    // Find the latest open record. Restricting this to the server's UTC day
    // loses early-morning and overnight shifts.
    const record = await prisma.attendanceRecord.findFirst({
      where: {
        userId: context.userId,
        organizationId: context.organizationId,
        clockOut: null,
      },
      include: { zone: true },
      orderBy: { clockIn: "desc" },
    });

    if (!record) {
      return res.status(400).json({ message: "Ирсэн бүртгэл олдсонгүй" });
    }

    const attendanceMethod = parseAttendanceMethod(method);

    // Clock-out is an explicit biometric action and must happen inside the
    // configured attendance zone.
    const distance = haversineMeters(
      lat,
      lng,
      record.zone.lat,
      record.zone.lng,
    );
    if (distance > record.zone.radiusMeters) {
      return res.status(400).json({
        message: `Бүсээс гадуур байна (${Math.round(distance)}м зайтай)`,
        distance: Math.round(distance),
        required: record.zone.radiusMeters,
      });
    }

    const clockOut = parseClientDate(clockOutAt) ?? attendanceWallNow();
    if (clockOut.getTime() < record.clockIn.getTime()) {
      return res
        .status(400)
        .json({ message: "Явсан цаг ирсэн цагаас өмнө байж болохгүй" });
    }
    const totalMinutes = Math.round(
      (clockOut.getTime() - record.clockIn.getTime()) / 60000,
    );

    const updated = await prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        clockOut,
        clockOutLat: lat,
        clockOutLng: lng,
        clockOutMethod: attendanceMethod,
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
    const context = await resolveAttendanceContext(user);
    if (!context) {
      return res
        .status(400)
        .json({ message: "Байгууллага холбогдоогүй байна" });
    }

    const today = startOfDay(attendanceWallNow());
    const tomorrow = nextDay(today);

    const record = await prisma.attendanceRecord.findFirst({
      where: {
        userId: context.userId,
        organizationId: context.organizationId,
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
    const context = await resolveAttendanceContext(user);
    if (!context) {
      return res
        .status(400)
        .json({ message: "Байгууллага холбогдоогүй байна" });
    }

    const { userId, from, to, limit } = req.query;

    // Managers can view any user; staff can only view their own
    const targetUserId =
      userId && canViewWorkforceAttendance(context)
        ? String(userId)
        : context.userId;

    const where: Prisma.AttendanceRecordWhereInput = {
      userId: targetUserId,
      organizationId: context.organizationId,
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
        user: {
          select: {
            id: true,
            email: true,
            profile: { select: { fullName: true } },
          },
        },
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

// ── GET /attendance/team/today ──────────────────────────────────────────────
router.get("/attendance/team/today", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as AuthPayload;
    const context = await resolveAttendanceContext(user);
    if (!context) {
      return res
        .status(400)
        .json({ message: "Байгууллага холбогдоогүй байна" });
    }
    if (!canViewWorkforceAttendance(context)) {
      return res
        .status(403)
        .json({ message: "Ирцийн самбар харах эрх хүрэлцэхгүй" });
    }

    const requestedDate = parseClientDate(req.query.date);
    const today = startOfDay(requestedDate ?? attendanceWallNow());
    const tomorrow = nextDay(today);

    const [members, records] = await Promise.all([
      listAttendanceTeamMembers(context.organizationId),
      prisma.attendanceRecord.findMany({
        where: {
          organizationId: context.organizationId,
          clockIn: { gte: today, lt: tomorrow },
        },
        include: { zone: { select: { id: true, name: true } } },
        orderBy: { clockIn: "desc" },
      }),
    ]);

    const latestRecordByUser = new Map<string, (typeof records)[number]>();
    for (const record of records) {
      if (!latestRecordByUser.has(record.userId)) {
        latestRecordByUser.set(record.userId, record);
      }
    }

    const rows = members.map((member) => {
      const record = latestRecordByUser.get(member.userId);
      const status: TeamAttendanceStatus = record
        ? record.clockOut
          ? "CLOCKED_OUT"
          : "PRESENT"
        : "ABSENT";

      return {
        memberId: member.id,
        userId: member.userId,
        email: member.user.email || "",
        fullName:
          member.user.profile?.fullName || member.user.email || "Ажилтан",
        phone: member.user.profile?.phoneNumber || null,
        avatarUrl: member.user.profile?.avatarUrl || null,
        role: member.role,
        department: member.department || "Хэлтэсгүй",
        status,
        record: record
          ? {
              id: record.id,
              clockIn: record.clockIn,
              clockOut: record.clockOut,
              totalMinutes: record.totalMinutes,
              zoneName: record.zone?.name ?? null,
              method: record.clockInMethod,
            }
          : null,
      };
    });

    const departments = Array.from(
      new Set(rows.map((row) => row.department)),
    ).sort((a, b) => a.localeCompare(b));
    const presentCount = rows.filter((row) => row.status === "PRESENT").length;
    const clockedOutCount = rows.filter(
      (row) => row.status === "CLOCKED_OUT",
    ).length;
    const absentCount = rows.filter((row) => row.status === "ABSENT").length;

    return res.json({
      date: today,
      summary: {
        total: rows.length,
        present: presentCount,
        clockedOut: clockedOutCount,
        absent: absentCount,
      },
      departments,
      members: rows,
    });
  } catch (error) {
    console.error("team attendance today error", error);
    return res
      .status(500)
      .json({ message: "Нийт ирцийн мэдээлэл авахад алдаа гарлаа" });
  }
});

// ── GET /attendance/team/report ─────────────────────────────────────────────
router.get("/attendance/team/report", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as AuthPayload;
    const context = await resolveAttendanceContext(user);
    if (!context) {
      return sendAttendanceError(res, {
        status: 400,
        code: "ATTENDANCE_ORGANIZATION_REQUIRED",
        message: "Ирцийн тайлан гаргах байгууллага тодорхойгүй байна.",
        action: "Байгууллагаа дахин сонгоод тайланг нээнэ үү.",
      });
    }
    if (!canViewWorkforceAttendance(context)) {
      return sendAttendanceError(res, {
        status: 403,
        code: "ATTENDANCE_REPORT_FORBIDDEN",
        message: "Танд нийт ажилтны цагийн тайлан харах эрх олгогдоогүй байна.",
        action:
          "Байгууллагын эзэмшигч эсвэл админаас WORKFORCE_ATTENDANCE_VIEW эрх авна уу.",
      });
    }

    const page = Math.max(
      1,
      Number.parseInt(String(req.query.page ?? "1"), 10) || 1,
    );
    const pageSize = Math.min(
      100,
      Math.max(
        10,
        Number.parseInt(String(req.query.pageSize ?? "25"), 10) || 25,
      ),
    );
    const from = parseClientDate(req.query.from);
    const to = parseClientDate(req.query.to);
    if (!from || !to || from > to) {
      return sendAttendanceError(res, {
        status: 400,
        code: "ATTENDANCE_DATE_RANGE_INVALID",
        message: "Тайлангийн эхлэх болон дуусах огноо буруу байна.",
        action:
          "Хоёр огноог бүрэн сонгож, эхлэх огноо дуусах огнооноос өмнө байгаа эсэхийг шалгана уу.",
        fields: {
          from: !from ? "Эхлэх огноо хүчингүй байна." : "",
          to: !to ? "Дуусах огноо хүчингүй байна." : "",
        },
      });
    }

    const department = String(req.query.department ?? "").trim();
    const search = String(req.query.search ?? "").trim();
    const memberWhere: Prisma.OrganizationMemberWhereInput = {
      organizationId: context.organizationId,
      isActive: true,
      deletedAt: null,
      ...(department ? { department } : {}),
      ...(search
        ? {
            OR: [
              { department: { contains: search, mode: "insensitive" } },
              {
                user: {
                  email: { contains: search, mode: "insensitive" },
                },
              },
              {
                user: {
                  profile: {
                    fullName: { contains: search, mode: "insensitive" },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const members = await prisma.organizationMember.findMany({
      where: memberWhere,
      select: {
        userId: true,
        department: true,
        role: true,
        user: {
          select: {
            email: true,
            profile: { select: { fullName: true } },
          },
        },
      },
    });
    const memberByUserId = new Map(
      members.map((member) => [member.userId, member]),
    );
    const userIds = members.map((member) => member.userId);
    const status = String(req.query.status ?? "ALL").toUpperCase();
    const recordWhere: Prisma.AttendanceRecordWhereInput = {
      organizationId: context.organizationId,
      userId: { in: userIds },
      clockIn: { gte: from, lte: to },
      ...(status === "OPEN"
        ? { clockOut: null }
        : status === "CLOSED"
          ? { clockOut: { not: null } }
          : {}),
    };

    const [
      total,
      records,
      aggregate,
      employeeGroups,
      openSessions,
      departments,
    ] = await Promise.all([
      prisma.attendanceRecord.count({ where: recordWhere }),
      prisma.attendanceRecord.findMany({
        where: recordWhere,
        include: { zone: { select: { id: true, name: true } } },
        orderBy: { clockIn: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.attendanceRecord.aggregate({
        where: recordWhere,
        _sum: { totalMinutes: true },
      }),
      prisma.attendanceRecord.groupBy({
        by: ["userId"],
        where: recordWhere,
      }),
      prisma.attendanceRecord.count({
        where: { ...recordWhere, clockOut: null },
      }),
      prisma.organizationMember.findMany({
        where: {
          organizationId: context.organizationId,
          isActive: true,
          deletedAt: null,
          department: { not: null },
        },
        distinct: ["department"],
        select: { department: true },
        orderBy: { department: "asc" },
      }),
    ]);

    return res.json({
      range: { from, to },
      summary: {
        records: total,
        employees: employeeGroups.length,
        totalMinutes: aggregate._sum.totalMinutes ?? 0,
        openSessions,
      },
      filters: {
        departments: departments
          .map((item) => item.department)
          .filter((item): item is string => Boolean(item)),
      },
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      rows: records.map((record) => {
        const member = memberByUserId.get(record.userId);
        return {
          id: record.id,
          userId: record.userId,
          employeeName:
            member?.user.profile?.fullName || member?.user.email || "Ажилтан",
          email: member?.user.email ?? "",
          department: member?.department || "Хэлтэсгүй",
          role: member?.role ?? "STAFF",
          clockIn: record.clockIn,
          clockOut: record.clockOut,
          totalMinutes: record.totalMinutes,
          status: record.clockOut ? "CLOSED" : "OPEN",
          zone: record.zone,
          method: record.clockInMethod,
        };
      }),
    });
  } catch (error) {
    console.error("team attendance report error", error);
    return sendAttendanceError(res, {
      status: 500,
      code: "ATTENDANCE_REPORT_FAILED",
      message: "Сервер ирцийн тайланг боловсруулж чадсангүй.",
      action:
        "Түр хүлээгээд дахин оролдоно уу. Алдаа давтагдвал алдааны кодыг системийн админд дамжуулна уу.",
      retryable: true,
    });
  }
});

export default router;
