import { Router, type Router as RouterType } from "express";
import { prisma } from "@mgl/database";
import { Permission } from "@mgl/types";
import { requireAuth, requireRole, requireAnyAdmin, requirePlatformPermission } from "../../middleware/auth";
import { requireOrgPermission } from "../../services/permission.service";
import bcrypt from "bcryptjs";

const router: RouterType = Router();

/* ─── GET /admin/dashboard/stats ─────────────────────── */
router.get("/admin/dashboard/stats", requireAuth, requireAnyAdmin, async (_req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeOrganizations,
      totalRegistrations,
      newRegistrationsToday,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      totalJobApplications,
      todayJobApplications,
      recentActivity,
      requestsByStatus,
      usersLast30Days,
      orgsLast30Days,
      jobAppsLast30Days,
      totalInvestors,
      investorProfiles,
    ] = await Promise.all([
      // Total active users
      prisma.user.count({ where: { isActive: true, deletedAt: null } }),

      // Active organizations
      prisma.organization.count({
        where: { status: "ACTIVE", deletedAt: null },
      }),

      // Total registration requests
      prisma.registrationRequest.count(),

      // New registrations today
      prisma.registrationRequest.count({
        where: { createdAt: { gte: todayStart } },
      }),

      // Pending requests
      prisma.registrationRequest.count({ where: { status: "PENDING" } }),

      // Approved requests (today)
      prisma.registrationRequest.count({
        where: { status: "APPROVED", approvedAt: { gte: todayStart } },
      }),

      // Rejected requests (today)
      prisma.registrationRequest.count({
        where: { status: "REJECTED", rejectedAt: { gte: todayStart } },
      }),

      // Total job applications
      prisma.jobApplication.count(),

      // Today's job applications
      prisma.jobApplication.count({
        where: { createdAt: { gte: todayStart } },
      }),

      // Recent audit logs (last 10)
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          user: {
            select: {
              email: true,
              profile: { select: { fullName: true } },
            },
          },
        },
      }),

      // Registration requests grouped by status
      prisma.registrationRequest.groupBy({
        by: ["status"],
        _count: { id: true },
      }),

      // Users created in last 30 days (grouped by day)
      prisma.user.findMany({
        where: { createdAt: { gte: thirtyDaysAgo }, deletedAt: null },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),

      // Orgs created in last 30 days
      prisma.organization.findMany({
        where: { createdAt: { gte: thirtyDaysAgo }, deletedAt: null },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),

      // Job applications in last 30 days
      prisma.jobApplication.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),

      // Total investors
      prisma.investorProfile.count(),

      // All investor profiles with investment amounts
      prisma.investorProfile.findMany({
        select: { investmentLevel: true },
      }),
    ]);

    // Calculate total investment amount
    const totalInvestmentAmount = investorProfiles.reduce((sum: number, p: (typeof investorProfiles)[number]) => {
      return sum + (p.investmentLevel ? Number(p.investmentLevel) : 0);
    }, 0);

    // Build daily user counts for sparkline (last 12 data points)
    const userSparkline = buildDailySparkline(
      usersLast30Days.map((u: (typeof usersLast30Days)[number]) => u.createdAt),
      30,
    );

    const orgSparkline = buildDailySparkline(
      orgsLast30Days.map((o: (typeof orgsLast30Days)[number]) => o.createdAt),
      30,
    );

    const jobAppsSparkline = buildDailySparkline(
      jobAppsLast30Days.map((j: (typeof jobAppsLast30Days)[number]) => j.createdAt),
      30,
    );

    // Build pie chart from request statuses
    const statusMap: Record<string, number> = {};
    for (const s of requestsByStatus) {
      statusMap[s.status] = s._count.id;
    }

    const pieChart = {
      total: totalRegistrations,
      label: "Нийт хүсэлт",
      items: [
        {
          label: "Шинэ хүсэлт",
          count: statusMap["PENDING"] || 0,
          color: "#6366f1",
        },
        {
          label: "Зөвшөөрсөн",
          count: statusMap["APPROVED"] || 0,
          color: "#10b981",
        },
        {
          label: "Татгалзсан",
          count: statusMap["REJECTED"] || 0,
          color: "#ef4444",
        },
        {
          label: "Цуцлагдсан",
          count: statusMap["CANCELLED"] || 0,
          color: "#f59e0b",
        },
      ],
    };

    // Format audit logs for recent activity
    const activity = recentActivity.map((log: (typeof recentActivity)[number]) => ({
      id: log.id,
      action: log.action,
      userName: log.user?.profile?.fullName || log.user?.email || "Систем",
      meta: log.meta,
      createdAt: log.createdAt,
    }));

    // Today summary
    const todaySummary = {
      newRequests: newRegistrationsToday,
      approved: approvedRequests,
      rejected: rejectedRequests,
      todayJobApplications,
    };

    return res.json({
      stats: {
        totalUsers,
        activeOrganizations,
        totalRegistrations,
        totalJobApplications,
        totalInvestors,
        totalInvestmentAmount,
      },
      sparklines: {
        users: userSparkline,
        organizations: orgSparkline,
        jobApplications: jobAppsSparkline,
      },
      pieChart,
      activity,
      todaySummary,
    });
  } catch (error) {
    console.error("[dashboard stats error]", error);
    return res.status(500).json({ message: "Сервер дээр алдаа гарлаа" });
  }
});

/* ─── Helper: build daily sparkline (last N days → 12 points) ─── */
function buildDailySparkline(dates: Date[], days: number): number[] {
  const now = new Date();
  const bucketCount = 12;
  const msPerBucket = (days * 24 * 60 * 60 * 1000) / bucketCount;
  const startTime = now.getTime() - days * 24 * 60 * 60 * 1000;

  const buckets = new Array(bucketCount).fill(0);
  for (const d of dates) {
    const idx = Math.floor((d.getTime() - startTime) / msPerBucket);
    if (idx >= 0 && idx < bucketCount) {
      buckets[idx]++;
    }
  }

  return buckets;
}

/* ─── GET /vendor/dashboard/stats?organizationId=xxx ─── */
router.get("/vendor/dashboard/stats", requireAuth, requireOrgPermission({ from: "query" }, Permission.VIEW_ORG_DASHBOARD), async (req, res) => {
  try {
    const { organizationId } = req.query;
    if (!organizationId || typeof organizationId !== "string") {
      return res.status(400).json({ message: "organizationId шаардлагатай" });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalProducts,
      activeProducts,
      totalServicePosts,
      activeServicePosts,
      servicePostViews,
      stockRequestsByStatus,
      totalServiceRequests,
      pendingServiceRequests,
      inProgressServiceRequests,
      warehouseCount,
      recentStockRequests,
      pendingPayments,
      recentServiceRequests,
    ] = await Promise.all([
      // Products
      prisma.product.count({
        where: { organizationId, deletedAt: null },
      }),
      prisma.product.count({
        where: { organizationId, deletedAt: null, isActive: true },
      }),

      // Service posts (ads)
      prisma.servicePost.count({
        where: { organizationId, deletedAt: null },
      }),
      prisma.servicePost.count({
        where: { organizationId, deletedAt: null, isActive: true },
      }),
      prisma.servicePost.aggregate({
        where: { organizationId, deletedAt: null },
        _sum: { viewCount: true },
      }),

      // Stock requests by status
      prisma.warehouseStockRequest.groupBy({
        by: ["status"],
        where: { organizationId },
        _count: { id: true },
      }),

      // Service requests
      prisma.serviceRequest.count({ where: { organizationId } }),
      prisma.serviceRequest.count({
        where: { organizationId, status: "PENDING" },
      }),
      prisma.serviceRequest.count({
        where: { organizationId, status: "IN_PROGRESS" },
      }),

      // Warehouses assigned
      prisma.warehouseOrganization.count({ where: { organizationId } }),

      // Recent 6 stock requests
      prisma.warehouseStockRequest.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          requestNumber: true,
          status: true,
          createdAt: true,
          warehouse: { select: { name: true } },
          items: { select: { id: true } },
          payment: { select: { totalAmount: true, status: true } },
          dispatch: {
            select: {
              id: true,
              dispatchNumber: true,
              status: true,
              driverName: true,
              driverPhone: true,
              vehicleNumber: true,
              dispatchedAt: true,
              deliveredAt: true,
            },
          },
        },
      }),

      // Pending payment total
      prisma.stockRequestPayment.aggregate({
        where: {
          organizationId,
          status: "PENDING",
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),

      // Recent 4 service requests
      prisma.serviceRequest.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 4,
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    // Build stock request status map
    const srMap: Record<string, number> = {};
    for (const s of stockRequestsByStatus) {
      srMap[s.status] = s._count.id;
    }

    const stockRequests = {
      pending: srMap["PENDING"] || 0,
      approved: srMap["APPROVED"] || 0,
      completed: srMap["COMPLETED"] || 0,
      rejected: srMap["REJECTED"] || 0,
      cancelled: srMap["CANCELLED"] || 0,
      total: stockRequestsByStatus.reduce((a: number, b: (typeof stockRequestsByStatus)[number]) => a + b._count.id, 0),
    };

    return res.json({
      products: {
        total: totalProducts,
        active: activeProducts,
        inactive: totalProducts - activeProducts,
      },
      servicePosts: {
        total: totalServicePosts,
        active: activeServicePosts,
        totalViews: servicePostViews._sum.viewCount || 0,
      },
      stockRequests,
      serviceRequests: {
        total: totalServiceRequests,
        pending: pendingServiceRequests,
        inProgress: inProgressServiceRequests,
        completed:
          totalServiceRequests - pendingServiceRequests - inProgressServiceRequests,
      },
      warehouses: warehouseCount,
      pendingPayments: {
        count: pendingPayments._count.id,
        totalAmount: Number(pendingPayments._sum.totalAmount || 0),
      },
      recentStockRequests: recentStockRequests.map((r: (typeof recentStockRequests)[number]) => ({
        id: r.id,
        requestNumber: r.requestNumber,
        status: r.status,
        warehouseName: r.warehouse.name,
        itemCount: r.items.length,
        totalAmount: r.payment ? Number(r.payment.totalAmount) : null,
        paymentStatus: r.payment?.status || null,
        createdAt: r.createdAt,
        dispatch: r.dispatch
          ? {
              id: r.dispatch.id,
              dispatchNumber: r.dispatch.dispatchNumber,
              status: r.dispatch.status,
              driverName: r.dispatch.driverName,
              driverPhone: r.dispatch.driverPhone,
              vehicleNumber: r.dispatch.vehicleNumber,
              dispatchedAt: r.dispatch.dispatchedAt,
              deliveredAt: r.dispatch.deliveredAt,
            }
          : null,
      })),
      recentServiceRequests: recentServiceRequests.map((r: (typeof recentServiceRequests)[number]) => ({
        id: r.id,
        title: r.title,
        type: r.type,
        status: r.status,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error("[vendor dashboard stats error]", error);
    return res.status(500).json({ message: "Серверийн алдаа гарлаа" });
  }
});

/* ─── GET /admin/users ─── list all system users ─────── */
router.get("/admin/users", requireAuth, requirePlatformPermission(Permission.MANAGE_USERS), async (req, res) => {
  try {
    const { role, search, isActive } = req.query;

    const where: Record<string, unknown> = { deletedAt: null };
    if (role && typeof role === "string") where.role = role;
    if (isActive === "true") where.isActive = true;
    if (isActive === "false") where.isActive = false;
    if (search && typeof search === "string") {
      const q = search.trim();
      where.OR = [
        { email: { contains: q, mode: "insensitive" } },
        { profile: { fullName: { contains: q, mode: "insensitive" } } },
        { profile: { phoneNumber: { contains: q, mode: "insensitive" } } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        profile: {
          select: {
            fullName: true,
            phoneNumber: true,
            avatarUrl: true,
          },
        },
        organizationMemberships: {
          where: { isActive: true },
          select: {
            role: true,
            isActive: true,
            isPrimary: true,
            organization: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    const result = users.map((u: (typeof users)[number]) => {
      const primary = u.organizationMemberships.find((m: (typeof u.organizationMemberships)[number]) => m.isPrimary) || u.organizationMemberships[0] || null;
      return {
        id: u.id,
        email: u.email,
        fullName: u.profile?.fullName || "",
        phone: u.profile?.phoneNumber || null,
        avatarUrl: u.profile?.avatarUrl || null,
        role: u.role,
        isActive: u.isActive,
        emailVerified: u.emailVerified,
        lastLoginAt: u.lastLoginAt,
        organizationId: primary?.organization.id || null,
        organizationName: primary?.organization.name || null,
        memberships: u.organizationMemberships.map((m: (typeof u.organizationMemberships)[number]) => ({
          role: m.role,
          isActive: m.isActive,
          isPrimary: m.isPrimary,
          orgId: m.organization.id,
          orgName: m.organization.name,
        })),
        createdAt: u.createdAt,
      };
    });

    return res.json(result);
  } catch (error) {
    console.error("[admin users list error]", error);
    return res.status(500).json({ message: "Хэрэглэгчдийн жагсаалт ачаалахад алдаа гарлаа" });
  }
});

/* ─── PATCH /admin/users/:id/role ─── change user system role ── */
import { ADMIN_ROLES } from "@mgl/types";
const VALID_ROLES = ["SUPER_ADMIN", "ADMIN", "HR_ADMIN", "CONTENT_ADMIN", "PARTNER_ADMIN", "WAREHOUSE_ADMIN", "FINANCE_ADMIN", "SERVICE_ADMIN", "USER"] as const;

router.patch("/admin/users/:id/role", requireAuth, requirePlatformPermission(Permission.MANAGE_ADMIN_STAFF), async (req, res) => {
  try {
    const id = req.params.id as string;
    const { role } = req.body;

    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({
        message: `Зөвшөөрөгдөх role: ${VALID_ROLES.join(", ")}`,
      });
    }

    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      return res.status(404).json({ message: "Хэрэглэгч олдсонгүй" });
    }

    // Prevent removing the last full admin (SUPER_ADMIN or ADMIN)
    if ((user.role === "ADMIN" || user.role === "SUPER_ADMIN") && role !== "ADMIN" && role !== "SUPER_ADMIN") {
      const fullAdminCount = await prisma.user.count({
        where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, isActive: true, deletedAt: null },
      });
      if (fullAdminCount <= 1) {
        return res.status(400).json({
          message: "Сүүлийн ерөнхий админы role-ийг солих боломжгүй",
        });
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, role: true },
    });

    return res.json({
      message: "Хэрэглэгчийн role амжилттай солигдлоо",
      data: updated,
    });
  } catch (error) {
    console.error("[admin change role error]", error);
    return res.status(500).json({ message: "Role солиход алдаа гарлаа" });
  }
});

/* ─── POST /admin/users ─── create admin user (SUPER_ADMIN only) ── */
const ASSIGNABLE_ROLES = ["ADMIN", "HR_ADMIN", "CONTENT_ADMIN", "PARTNER_ADMIN", "WAREHOUSE_ADMIN", "FINANCE_ADMIN", "SERVICE_ADMIN"] as const;

router.post("/admin/users", requireAuth, requirePlatformPermission(Permission.MANAGE_ADMIN_STAFF), async (req, res) => {
  try {
    const { email, fullName, password, role } = req.body;

    if (!email || !fullName || !password || !role) {
      return res.status(400).json({ message: "email, fullName, password, role бүгд шаардлагатай" });
    }

    if (!ASSIGNABLE_ROLES.includes(role)) {
      return res.status(400).json({
        message: `Зөвшөөрөгдөх role: ${ASSIGNABLE_ROLES.join(", ")}`,
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой" });
    }

    const existing = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim(), deletedAt: null },
    });

    if (existing) {
      return res.status(409).json({ message: "Энэ имэйлтэй хэрэглэгч бүртгэлтэй байна" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash: hashedPassword,
        role,
        isActive: true,
        profile: {
          create: {
            fullName: fullName.trim(),
          },
        },
      },
      select: { id: true, email: true, role: true },
    });

    return res.status(201).json({
      message: "Админ хэрэглэгч амжилттай үүсгэгдлээ",
      data: user,
    });
  } catch (error) {
    console.error("[admin create user error]", error);
    return res.status(500).json({ message: "Хэрэглэгч үүсгэхэд алдаа гарлаа" });
  }
});

export default router;
