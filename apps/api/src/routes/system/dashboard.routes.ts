import { Router, type Router as RouterType } from "express";
import { prisma } from "@mgl/database";

const router: RouterType = Router();

/* ─── GET /admin/dashboard/stats ─────────────────────── */
router.get("/admin/dashboard/stats", async (_req, res) => {
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
    const totalInvestmentAmount = investorProfiles.reduce((sum, p) => {
      return sum + (p.investmentLevel ? Number(p.investmentLevel) : 0);
    }, 0);

    // Build daily user counts for sparkline (last 12 data points)
    const userSparkline = buildDailySparkline(
      usersLast30Days.map((u) => u.createdAt),
      30,
    );

    const orgSparkline = buildDailySparkline(
      orgsLast30Days.map((o) => o.createdAt),
      30,
    );

    const jobAppsSparkline = buildDailySparkline(
      jobAppsLast30Days.map((j) => j.createdAt),
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
    const activity = recentActivity.map((log) => ({
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
router.get("/vendor/dashboard/stats", async (req, res) => {
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
      total: stockRequestsByStatus.reduce((a, b) => a + b._count.id, 0),
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
      recentStockRequests: recentStockRequests.map((r) => ({
        id: r.id,
        requestNumber: r.requestNumber,
        status: r.status,
        warehouseName: r.warehouse.name,
        itemCount: r.items.length,
        totalAmount: r.payment ? Number(r.payment.totalAmount) : null,
        paymentStatus: r.payment?.status || null,
        createdAt: r.createdAt,
      })),
      recentServiceRequests: recentServiceRequests.map((r) => ({
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

export default router;
