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

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function getExpiryRiskLevel(score: number, daysUntilExpiry: number) {
  if (daysUntilExpiry < 0 || score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function getExpiryRiskScore(params: {
  daysUntilExpiry: number;
  quantity: number;
  dailyVelocity: number;
}) {
  const { daysUntilExpiry, quantity, dailyVelocity } = params;
  const sellThroughDays =
    dailyVelocity > 0 ? quantity / dailyVelocity : Number.POSITIVE_INFINITY;

  let score = 0;
  if (daysUntilExpiry < 0) score += 70;
  else if (daysUntilExpiry <= 7) score += 48;
  else if (daysUntilExpiry <= 14) score += 36;
  else if (daysUntilExpiry <= 30) score += 24;
  else if (daysUntilExpiry <= 60) score += 10;

  if (quantity >= 100) score += 16;
  else if (quantity >= 50) score += 10;
  else if (quantity >= 20) score += 6;

  if (dailyVelocity <= 0) {
    score += quantity > 0 ? 34 : 0;
  } else if (sellThroughDays > Math.max(daysUntilExpiry, 1)) {
    score += 30;
  } else if (sellThroughDays > Math.max(daysUntilExpiry * 0.7, 1)) {
    score += 16;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

function buildExpiryRecommendation(params: {
  daysUntilExpiry: number;
  quantity: number;
  dailyVelocity: number;
  sellThroughDays: number | null;
}) {
  const { daysUntilExpiry, quantity, dailyVelocity, sellThroughDays } = params;
  if (daysUntilExpiry < 0) {
    return "Хугацаа дууссан байж болзошгүй. Вэбээс түр нууж, буцаалт эсвэл устгалын шийдвэр шалгаарай.";
  }
  if (daysUntilExpiry <= 7) {
    return dailyVelocity > 0 && sellThroughDays !== null && sellThroughDays <= daysUntilExpiry
      ? "FEFO урсгал ажиллаж байна. Нүүр хуудсанд илүү байршуулж борлуулалтыг барина."
      : "7 хоногийн flash хямдрал, bundle эсвэл нүүр хуудсын онцлох байрлал санал болго.";
  }
  if (daysUntilExpiry <= 14) {
    return "2 долоо хоногийн дотор дуусна. Хямдрал эсвэл багц санал гаргаж эргэлтийг нэм.";
  }
  if (dailyVelocity <= 0 && quantity > 0) {
    return "Сүүлийн 30 хоногт борлуулалтгүй. Зураг, үнэ, тайлбар эсвэл зарын сувгийг шинэчил.";
  }
  return "Борлуулалтын хурд боломжийн байна. FEFO эрэмбэ, вэб байршуулалтыг хэвээр хадгал.";
}

async function buildVendorExpiryInsights(organizationId: string) {
  const today = startOfToday();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * DAY_MS);

  const inventory = await prisma.warehouseInventory.findMany({
    where: {
      quantity: { gt: 0 },
      expiryDate: { not: null },
      product: {
        organizationId,
        deletedAt: null,
        isActive: true,
        supplyType: "IN_STOCK",
      },
    },
    orderBy: [{ expiryDate: "asc" }, { quantity: "desc" }],
    select: {
      id: true,
      quantity: true,
      expiryDate: true,
      warehouse: { select: { name: true } },
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
          images: { select: { url: true }, take: 1 },
        },
      },
    },
  });

  const productIds = Array.from(
    new Set(inventory.map((item: (typeof inventory)[number]) => item.product.id)),
  );

  const [onlineSales, posSales] = productIds.length
    ? await Promise.all([
        prisma.orderItem.groupBy({
          by: ["productId"],
          where: {
            productId: { in: productIds },
            order: {
              organizationId,
              deletedAt: null,
              status: { not: "CANCELLED" },
              createdAt: { gte: thirtyDaysAgo },
            },
          },
          _sum: { quantity: true },
        }),
        prisma.posSaleLine.groupBy({
          by: ["productId"],
          where: {
            productId: { in: productIds },
            sale: {
              organizationId,
              status: "COMPLETED",
              createdAt: { gte: thirtyDaysAgo },
            },
          },
          _sum: { qty: true },
        }),
      ])
    : [[], []];

  const salesByProductId = new Map<string, number>();
  for (const item of onlineSales) {
    salesByProductId.set(item.productId, item._sum.quantity ?? 0);
  }
  for (const item of posSales) {
    salesByProductId.set(
      item.productId,
      (salesByProductId.get(item.productId) ?? 0) + (item._sum.qty ?? 0),
    );
  }

  const products = inventory
    .map((item: (typeof inventory)[number]) => {
      const expiryDate = item.expiryDate!;
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / DAY_MS);
      const salesLast30Days = salesByProductId.get(item.product.id) ?? 0;
      const dailyVelocity = round1(salesLast30Days / 30);
      const sellThroughDays =
        dailyVelocity > 0 ? round1(item.quantity / dailyVelocity) : null;
      const riskScore = getExpiryRiskScore({
        daysUntilExpiry,
        quantity: item.quantity,
        dailyVelocity,
      });
      const riskLevel = getExpiryRiskLevel(riskScore, daysUntilExpiry);

      return {
        inventoryId: item.id,
        productId: item.product.id,
        name: item.product.name,
        sku: item.product.sku,
        imageUrl: item.product.images[0]?.url ?? null,
        warehouseName: item.warehouse.name,
        quantity: item.quantity,
        expiryDate: expiryDate.toISOString(),
        daysUntilExpiry,
        salesLast30Days,
        dailyVelocity,
        sellThroughDays,
        riskScore,
        riskLevel,
        stockValue: Number(item.product.price) * item.quantity,
        recommendation: buildExpiryRecommendation({
          daysUntilExpiry,
          quantity: item.quantity,
          dailyVelocity,
          sellThroughDays,
        }),
      };
    })
    .filter((item) => item.riskScore >= 35 || item.daysUntilExpiry <= 30)
    .sort((a, b) => {
      if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
      return a.daysUntilExpiry - b.daysUntilExpiry;
    });

  const criticalCount = products.filter((item) => item.riskLevel === "critical").length;
  const highCount = products.filter((item) => item.riskLevel === "high").length;
  const urgentCount = products.filter(
    (item) => item.daysUntilExpiry >= 0 && item.daysUntilExpiry <= 14,
  ).length;
  const stagnantCount = products.filter((item) => item.salesLast30Days === 0).length;
  const riskValue = products.reduce((sum, item) => sum + item.stockValue, 0);

  const recommendations: string[] = [];
  if (criticalCount > 0) {
    recommendations.push(`${criticalCount} бараанд шууд арга хэмжээ хэрэгтэй.`);
  }
  if (urgentCount > 0) {
    recommendations.push(`${urgentCount} бараа 14 хоногийн дотор дуусна.`);
  }
  if (stagnantCount > 0) {
    recommendations.push(`${stagnantCount} бараа сүүлийн 30 хоногт борлуулалтгүй байна.`);
  }
  if (recommendations.length === 0) {
    recommendations.push("Одоогоор дуусах хугацааны өндөр эрсдэлтэй бараа бага байна.");
  }

  return {
    generatedAt: new Date().toISOString(),
    windowDays: 30,
    totalAtRisk: products.length,
    criticalCount,
    highCount,
    urgentCount,
    stagnantCount,
    riskValue,
    highestRiskScore: products[0]?.riskScore ?? 0,
    recommendations,
    products: products.slice(0, 5),
  };
}

/* ─── GET /admin/statistics/insights ─────────────────────── */
router.get("/admin/statistics/insights", requireAuth, requireAnyAdmin, async (req, res) => {
  try {
    const requestedDays = String(req.query.days || 30);
    const allTime = requestedDays === "all";
    const parsedDays = Number(requestedDays);
    const days = [7, 30, 90].includes(parsedDays) ? parsedDays : 30;
    const since = allTime ? new Date(0) : new Date(Date.now() - days * DAY_MS);
    const previousSince = allTime ? new Date(0) : new Date(Date.now() - days * 2 * DAY_MS);
    const windowLabel = allTime ? "all" : days;

    const [
      activeUsers,
      previousActiveUsers,
      loginSessions,
      previousLoginSessions,
      onlineRevenue,
      previousOnlineRevenue,
      posRevenue,
      previousPosRevenue,
      onlineUnits,
      posUnits,
      onlineProducts,
      posProducts,
      onlineBranches,
      posBranches,
      orderStatus,
      paymentStatus,
      recentSales,
    ] = await Promise.all([
      prisma.user.count({ where: { lastLoginAt: { gte: since }, deletedAt: null } }),
      prisma.user.count({ where: { lastLoginAt: { gte: previousSince, lt: since }, deletedAt: null } }),
      prisma.userSession.count({ where: { createdAt: { gte: since } } }),
      prisma.userSession.count({ where: { createdAt: { gte: previousSince, lt: since } } }),
      prisma.order.aggregate({
        where: { createdAt: { gte: since }, deletedAt: null, status: { not: "CANCELLED" }, paymentStatus: "PAID" },
        _sum: { total: true },
        _count: { id: true },
      }),
      prisma.order.aggregate({
        where: { createdAt: { gte: previousSince, lt: since }, deletedAt: null, status: { not: "CANCELLED" }, paymentStatus: "PAID" },
        _sum: { total: true },
        _count: { id: true },
      }),
      prisma.posSale.aggregate({
        where: { createdAt: { gte: since }, status: "COMPLETED" },
        _sum: { grandTotal: true },
        _count: { id: true },
      }),
      prisma.posSale.aggregate({
        where: { createdAt: { gte: previousSince, lt: since }, status: "COMPLETED" },
        _sum: { grandTotal: true },
        _count: { id: true },
      }),
      prisma.orderItem.aggregate({
        where: { order: { createdAt: { gte: since }, deletedAt: null, status: { not: "CANCELLED" } } },
        _sum: { quantity: true },
      }),
      prisma.posSaleLine.aggregate({
        where: { sale: { createdAt: { gte: since }, status: "COMPLETED" } },
        _sum: { qty: true },
      }),
      prisma.orderItem.groupBy({
        by: ["productId"],
        where: { order: { createdAt: { gte: since }, deletedAt: null, status: { not: "CANCELLED" } } },
        _sum: { quantity: true, subtotal: true },
        _count: { id: true },
      }),
      prisma.posSaleLine.groupBy({
        by: ["productId"],
        where: { sale: { createdAt: { gte: since }, status: "COMPLETED" } },
        _sum: { qty: true, lineTotal: true },
        _count: { id: true },
      }),
      prisma.order.groupBy({
        by: ["branchId"],
        where: { branchId: { not: null }, createdAt: { gte: since }, deletedAt: null, status: { not: "CANCELLED" } },
        _sum: { total: true },
        _count: { id: true },
      }),
      prisma.posSale.groupBy({
        by: ["branchId"],
        where: { createdAt: { gte: since }, status: "COMPLETED" },
        _sum: { grandTotal: true },
        _count: { id: true },
      }),
      prisma.order.groupBy({
        by: ["status"],
        where: { createdAt: { gte: since }, deletedAt: null },
        _count: { id: true },
      }),
      prisma.order.groupBy({
        by: ["paymentStatus"],
        where: { createdAt: { gte: since }, deletedAt: null },
        _count: { id: true },
      }),
      prisma.posSale.findMany({
        where: { createdAt: { gte: since }, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          receiptNo: true,
          grandTotal: true,
          createdAt: true,
          branch: { select: { name: true } },
          organization: { select: { name: true } },
        },
      }),
    ]);

    const [
      newUsers,
      previousNewUsers,
      newOrganizations,
      previousNewOrganizations,
      activeOrganizations,
      verifiedOrganizations,
      supplierOrganizations,
      qpayEnabledOrganizations,
      subdomainEnabledOrganizations,
      activeBranches,
      newProducts,
      activeProducts,
      activeServicePosts,
      servicePostViews,
      serviceRequests,
      previousServiceRequests,
      stockRequests,
      cardTerminalRequests,
      registrationRequests,
      approvedRegistrationRequests,
      pendingRegistrationRequests,
      allOnlineOrders,
      cancelledOnlineOrders,
      paymentMethods,
      organizationTypes,
      businessCategories,
    ] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: since }, deletedAt: null } }),
      prisma.user.count({ where: { createdAt: { gte: previousSince, lt: since }, deletedAt: null } }),
      prisma.organization.count({ where: { createdAt: { gte: since }, deletedAt: null } }),
      prisma.organization.count({ where: { createdAt: { gte: previousSince, lt: since }, deletedAt: null } }),
      prisma.organization.count({ where: { status: "ACTIVE", deletedAt: null } }),
      prisma.organization.count({ where: { isVerified: true, deletedAt: null } }),
      prisma.organization.count({ where: { type: "SUPPLIER", deletedAt: null } }),
      prisma.organization.count({ where: { qpayEnabled: true, deletedAt: null } }),
      prisma.organization.count({ where: { subdomainEnabled: true, deletedAt: null } }),
      prisma.branch.count({ where: { deletedAt: null } }),
      prisma.product.count({ where: { createdAt: { gte: since }, deletedAt: null } }),
      prisma.product.count({ where: { isActive: true, deletedAt: null } }),
      prisma.servicePost.count({ where: { isActive: true, deletedAt: null } }),
      prisma.servicePost.aggregate({
        where: { isActive: true, deletedAt: null },
        _sum: { viewCount: true },
      }),
      prisma.serviceRequest.count({ where: { createdAt: { gte: since } } }),
      prisma.serviceRequest.count({ where: { createdAt: { gte: previousSince, lt: since } } }),
      prisma.warehouseStockRequest.count({ where: { requestedAt: { gte: since } } }),
      prisma.cardTerminalRequest.count({ where: { createdAt: { gte: since } } }),
      prisma.registrationRequest.count({ where: { createdAt: { gte: since } } }),
      prisma.registrationRequest.count({ where: { createdAt: { gte: since }, status: "APPROVED" } }),
      prisma.registrationRequest.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { createdAt: { gte: since }, deletedAt: null } }),
      prisma.order.count({ where: { createdAt: { gte: since }, deletedAt: null, status: "CANCELLED" } }),
      prisma.paymentAttempt.groupBy({
        by: ["method"],
        where: { createdAt: { gte: since } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.organization.groupBy({
        by: ["type"],
        where: { deletedAt: null },
        _count: { id: true },
      }),
      prisma.organization.groupBy({
        by: ["businessCategory"],
        where: { deletedAt: null, businessCategory: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 8,
      }),
    ]);

    const productIds = Array.from(new Set([...onlineProducts, ...posProducts].map((item) => item.productId)));
    const branchIds = Array.from(
      new Set([...onlineBranches, ...posBranches].map((item) => item.branchId).filter((id): id is string => Boolean(id))),
    );

    const [products, branches] = await Promise.all([
      productIds.length
        ? prisma.product.findMany({
            where: { id: { in: productIds } },
            select: {
              id: true,
              name: true,
              sku: true,
              stock: true,
              price: true,
              organization: { select: { name: true } },
              images: { select: { url: true }, take: 1 },
            },
          })
        : [],
      branchIds.length
        ? prisma.branch.findMany({
            where: { id: { in: branchIds } },
            select: { id: true, name: true, address: true, organization: { select: { name: true } } },
          })
        : [],
    ]);

    const productMeta = new Map(products.map((p) => [p.id, p]));
    const branchMeta = new Map(branches.map((b) => [b.id, b]));
    const productMap = new Map<string, { productId: string; units: number; revenue: number; transactions: number }>();
    for (const item of onlineProducts) {
      productMap.set(item.productId, {
        productId: item.productId,
        units: item._sum.quantity ?? 0,
        revenue: Number(item._sum.subtotal ?? 0),
        transactions: item._count.id,
      });
    }
    for (const item of posProducts) {
      const prev = productMap.get(item.productId) ?? { productId: item.productId, units: 0, revenue: 0, transactions: 0 };
      prev.units += item._sum.qty ?? 0;
      prev.revenue += Number(item._sum.lineTotal ?? 0);
      prev.transactions += item._count.id;
      productMap.set(item.productId, prev);
    }

    const branchMap = new Map<string, { branchId: string; orders: number; revenue: number }>();
    for (const item of onlineBranches) {
      if (!item.branchId) continue;
      branchMap.set(item.branchId, { branchId: item.branchId, orders: item._count.id, revenue: Number(item._sum.total ?? 0) });
    }
    for (const item of posBranches) {
      const prev = branchMap.get(item.branchId) ?? { branchId: item.branchId, orders: 0, revenue: 0 };
      prev.orders += item._count.id;
      prev.revenue += Number(item._sum.grandTotal ?? 0);
      branchMap.set(item.branchId, prev);
    }

    const totalRevenue = Number(onlineRevenue._sum.total ?? 0) + Number(posRevenue._sum.grandTotal ?? 0);
    const previousRevenue = Number(previousOnlineRevenue._sum.total ?? 0) + Number(previousPosRevenue._sum.grandTotal ?? 0);
    const totalOrders = onlineRevenue._count.id + posRevenue._count.id;
    const previousOrders = previousOnlineRevenue._count.id + previousPosRevenue._count.id;
    const trend = (current: number, previous: number) =>
      previous > 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? 100 : 0;
    const windowTrend = (current: number, previous: number) => (allTime ? 0 : trend(current, previous));
    const rate = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);
    const onlineRevenueValue = Number(onlineRevenue._sum.total ?? 0);
    const posRevenueValue = Number(posRevenue._sum.grandTotal ?? 0);
    const paidOnlineOrders = onlineRevenue._count.id;
    const paidOrderRate = rate(paidOnlineOrders, allOnlineOrders);
    const cancellationRate = rate(cancelledOnlineOrders, allOnlineOrders);
    const registrationApprovalRate = rate(approvedRegistrationRequests, registrationRequests);
    const verifiedOrgRate = rate(verifiedOrganizations, activeOrganizations);
    const qpayAdoptionRate = rate(qpayEnabledOrganizations, activeOrganizations);
    const subdomainAdoptionRate = rate(subdomainEnabledOrganizations, activeOrganizations);
    const serviceConversionRate = rate(serviceRequests, servicePostViews._sum.viewCount ?? 0);

    const topProducts = Array.from(productMap.values())
      .map((item) => {
        const meta = productMeta.get(item.productId);
        return {
          ...item,
          name: meta?.name ?? "Unknown product",
          sku: meta?.sku ?? null,
          stock: meta?.stock ?? 0,
          price: meta?.price ? Number(meta.price) : 0,
          organizationName: meta?.organization.name ?? "",
          imageUrl: meta?.images[0]?.url ?? null,
          velocityScore: Math.round(item.units * 0.55 + item.transactions * 0.25 + item.revenue / 100000),
        };
      })
      .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
      .slice(0, 10);

    const topBranches = Array.from(branchMap.values())
      .map((item) => {
        const meta = branchMeta.get(item.branchId);
        return {
          ...item,
          name: meta?.name ?? "Unknown branch",
          address: meta?.address ?? "",
          organizationName: meta?.organization.name ?? "",
          avgTicket: item.orders > 0 ? Math.round(item.revenue / item.orders) : 0,
        };
      })
      .sort((a, b) => b.revenue - a.revenue || b.orders - a.orders)
      .slice(0, 10);

    const marketingMetrics = [
      {
        id: "active-users",
        label: "Идэвхтэй хэрэглэгч",
        value: activeUsers,
        unit: "user",
        trend: windowTrend(activeUsers, previousActiveUsers),
        category: "Audience",
        description: allTime ? "Нийт хугацаанд системд нэвтэрсэн хэрэглэгч." : `${days} хоногт системд нэвтэрсэн хэрэглэгч.`,
      },
      {
        id: "new-users",
        label: "Шинэ хэрэглэгч",
        value: newUsers,
        unit: "user",
        trend: windowTrend(newUsers, previousNewUsers),
        category: "Audience",
        description: "Шинээр бүртгэгдсэн хэрэглэгчийн өсөлт.",
      },
      {
        id: "login-sessions",
        label: "Login session",
        value: loginSessions,
        unit: "session",
        trend: windowTrend(loginSessions, previousLoginSessions),
        category: "Audience",
        description: "Давтан хэрэглээ болон engagement-ийн proxy.",
      },
      {
        id: "new-organizations",
        label: "Шинэ байгууллага",
        value: newOrganizations,
        unit: "org",
        trend: windowTrend(newOrganizations, previousNewOrganizations),
        category: "Acquisition",
        description: "Vendor/partner acquisition-ийн үндсэн хэмжүүр.",
      },
      {
        id: "active-organizations",
        label: "Идэвхтэй байгууллага",
        value: activeOrganizations,
        unit: "org",
        trend: 0,
        category: "Acquisition",
        description: "Одоогоор идэвхтэй байгаа байгууллагын нийт тоо.",
      },
      {
        id: "verified-organization-rate",
        label: "Баталгаажсан байгууллага",
        value: verifiedOrgRate,
        unit: "%",
        trend: 0,
        category: "Trust",
        description: "Идэвхтэй байгууллагын баталгаажуулалтын хувь.",
      },
      {
        id: "registration-approval-rate",
        label: "Бүртгэл зөвшөөрөл",
        value: registrationApprovalRate,
        unit: "%",
        trend: 0,
        category: "Conversion",
        description: "Ирсэн бүртгэлийн хүсэлтээс зөвшөөрөгдсөн хувь.",
      },
      {
        id: "pending-registrations",
        label: "Хүлээгдэж буй бүртгэл",
        value: pendingRegistrationRequests,
        unit: "request",
        trend: 0,
        category: "Conversion",
        description: "Campaign lead follow-up хийх шаардлагатай backlog.",
      },
      {
        id: "total-revenue",
        label: "Нийт орлого",
        value: totalRevenue,
        unit: "MNT",
        trend: windowTrend(totalRevenue, previousRevenue),
        category: "Revenue",
        description: "Online болон POS борлуулалтын нийлбэр.",
      },
      {
        id: "online-revenue",
        label: "Online орлого",
        value: onlineRevenueValue,
        unit: "MNT",
        trend: windowTrend(onlineRevenueValue, Number(previousOnlineRevenue._sum.total ?? 0)),
        category: "Revenue",
        description: "Web checkout-оор төлөгдсөн захиалгын орлого.",
      },
      {
        id: "pos-revenue",
        label: "POS орлого",
        value: posRevenueValue,
        unit: "MNT",
        trend: windowTrend(posRevenueValue, Number(previousPosRevenue._sum.grandTotal ?? 0)),
        category: "Revenue",
        description: "POS сувгийн дууссан борлуулалтын орлого.",
      },
      {
        id: "average-ticket",
        label: "Дундаж сагс",
        value: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
        unit: "MNT",
        trend: 0,
        category: "Revenue",
        description: "Campaign basket uplift хэмжих суурь үзүүлэлт.",
      },
      {
        id: "paid-order-rate",
        label: "Төлөгдсөн захиалга",
        value: paidOrderRate,
        unit: "%",
        trend: 0,
        category: "Conversion",
        description: "Online захиалга төлбөрт шилжсэн хувь.",
      },
      {
        id: "cancellation-rate",
        label: "Цуцлалтын хувь",
        value: cancellationRate,
        unit: "%",
        trend: 0,
        category: "Conversion",
        description: "Checkout friction болон fulfillment risk-ийн дохио.",
      },
      {
        id: "units-sold",
        label: "Зарагдсан нэгж",
        value: (onlineUnits._sum.quantity ?? 0) + (posUnits._sum.qty ?? 0),
        unit: "unit",
        trend: 0,
        category: "Product",
        description: "Product demand болон campaign lift хэмжих нэгж.",
      },
      {
        id: "new-products",
        label: "Шинэ бараа",
        value: newProducts,
        unit: "sku",
        trend: 0,
        category: "Product",
        description: "Marketplace assortment growth.",
      },
      {
        id: "active-products",
        label: "Идэвхтэй бараа",
        value: activeProducts,
        unit: "sku",
        trend: 0,
        category: "Product",
        description: "Одоогоор зарагдах боломжтой барааны сан.",
      },
      {
        id: "service-views",
        label: "Service post view",
        value: servicePostViews._sum.viewCount ?? 0,
        unit: "view",
        trend: 0,
        category: "Demand",
        description: "Үйлчилгээний контентын нийт үзэлт.",
      },
      {
        id: "service-requests",
        label: "Service request",
        value: serviceRequests,
        unit: "request",
        trend: windowTrend(serviceRequests, previousServiceRequests),
        category: "Demand",
        description: "Үйлчилгээ сонирхсон хэрэглэгчийн intent.",
      },
      {
        id: "service-conversion-rate",
        label: "Service conversion",
        value: serviceConversionRate,
        unit: "%",
        trend: 0,
        category: "Demand",
        description: "Service view-ээс request болсон ойролцоо хувь.",
      },
      {
        id: "qpay-adoption",
        label: "QPay adoption",
        value: qpayAdoptionRate,
        unit: "%",
        trend: 0,
        category: "Enablement",
        description: "Идэвхтэй байгууллагаас QPay холбосон хувь.",
      },
      {
        id: "subdomain-adoption",
        label: "Subdomain adoption",
        value: subdomainAdoptionRate,
        unit: "%",
        trend: 0,
        category: "Enablement",
        description: "Брэндийн web presence идэвхжүүлсэн байгууллагын хувь.",
      },
      {
        id: "branches",
        label: "Салбар",
        value: activeBranches,
        unit: "branch",
        trend: 0,
        category: "Coverage",
        description: "Fulfillment болон offline reach-ийн суурь.",
      },
      {
        id: "supplier-organizations",
        label: "Supplier байгууллага",
        value: supplierOrganizations,
        unit: "org",
        trend: 0,
        category: "Coverage",
        description: "Marketplace supply талын coverage.",
      },
      {
        id: "stock-requests",
        label: "Агуулах хүсэлт",
        value: stockRequests,
        unit: "request",
        trend: 0,
        category: "Operations",
        description: "Demand planning болон replenishment дохио.",
      },
      {
        id: "card-terminal-requests",
        label: "Card terminal хүсэлт",
        value: cardTerminalRequests,
        unit: "request",
        trend: 0,
        category: "Enablement",
        description: "Offline payment enablement-ийн сонирхол.",
      },
    ];

    return res.json({
      generatedAt: new Date().toISOString(),
      windowDays: windowLabel,
      hero: {
        activeUsers,
        activeUsersTrend: windowTrend(activeUsers, previousActiveUsers),
        loginSessions,
        loginSessionsTrend: windowTrend(loginSessions, previousLoginSessions),
        totalRevenue,
        revenueTrend: windowTrend(totalRevenue, previousRevenue),
        totalOrders,
        ordersTrend: windowTrend(totalOrders, previousOrders),
        unitsSold: (onlineUnits._sum.quantity ?? 0) + (posUnits._sum.qty ?? 0),
        avgTicket: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
      },
      topProducts,
      topBranches,
      marketingMetrics,
      marketingSegments: {
        paymentMethods: paymentMethods.map((item) => ({
          method: item.method,
          count: item._count.id,
          amount: Number(item._sum.amount ?? 0),
        })),
        organizationTypes: organizationTypes.map((item) => ({
          type: item.type,
          count: item._count.id,
        })),
        businessCategories: businessCategories.map((item) => ({
          category: item.businessCategory ?? "Uncategorized",
          count: item._count.id,
        })),
      },
      orderStatus: orderStatus.map((item) => ({ status: item.status, count: item._count.id })),
      paymentStatus: paymentStatus.map((item) => ({ status: item.paymentStatus, count: item._count.id })),
      recentSales: recentSales.map((sale) => ({
        id: sale.id,
        receiptNo: sale.receiptNo,
        total: Number(sale.grandTotal),
        createdAt: sale.createdAt,
        branchName: sale.branch.name,
        organizationName: sale.organization.name,
      })),
    });
  } catch (error) {
    console.error("[admin statistics insights error]", error);
    return res.status(500).json({ message: "Статистик дата ачаалахад алдаа гарлаа" });
  }
});

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
      expiryInsights,
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

      buildVendorExpiryInsights(organizationId),
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
      expiryInsights,
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
const VALID_ROLES = ["SUPER_ADMIN", "ADMIN", "HR_ADMIN", "CONTENT_ADMIN", "PARTNER_ADMIN", "WAREHOUSE_ADMIN", "FINANCE_ADMIN", "SERVICE_ADMIN", "LAWYER", "USER"] as const;

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
const ASSIGNABLE_ROLES = ["ADMIN", "HR_ADMIN", "CONTENT_ADMIN", "PARTNER_ADMIN", "WAREHOUSE_ADMIN", "FINANCE_ADMIN", "SERVICE_ADMIN", "LAWYER"] as const;

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
