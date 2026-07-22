import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import { requireAuth, type AuthPayload } from "../../middleware/auth";

const router: ExpressRouter = Router();
const MANAGER_ROLES = new Set(["OWNER", "ADMIN", "CEO", "MANAGER"]);

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const startOfTomorrow = (today: Date) => {
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
};

const startOfMonth = () => {
  const month = new Date();
  month.setDate(1);
  month.setHours(0, 0, 0, 0);
  return month;
};

async function resolveMembership(userId: string, organizationId?: string | null) {
  const baseWhere = { userId, isActive: true, deletedAt: null };
  const tokenMembership = organizationId
    ? await prisma.organizationMember.findFirst({
        where: { ...baseWhere, organizationId },
        include: { organization: true },
      })
    : null;

  return (
    tokenMembership ??
    prisma.organizationMember.findFirst({
      where: baseWhere,
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      include: { organization: true },
    })
  );
}

router.get("/business/dashboard/summary", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as AuthPayload;
    const membership = await resolveMembership(user.userId, user.organizationId);

    if (!membership) {
      return res.status(400).json({ message: "Байгууллага холбогдоогүй байна" });
    }

    const organization = membership.organization;
    const organizationId = membership.organizationId;
    const isManager = MANAGER_ROLES.has(String(membership.role));
    const today = startOfToday();
    const tomorrow = startOfTomorrow(today);
    const month = startOfMonth();

    const attendanceTodayWhere = {
      organizationId,
      clockIn: { gte: today, lt: tomorrow },
    };

    const [
      activeMembers,
      inactiveMembers,
      presentToday,
      workingNow,
      myAttendanceToday,
      assignedOpenTasks,
      createdTasks,
      pendingReviewTasks,
      completedThisMonth,
      overdueTasks,
      todayOrders,
      pendingOrders,
      todayOrderTotal,
      productCount,
      lowStockItems,
      stockRequests,
      pendingStockRequests,
    ] = await Promise.all([
      prisma.organizationMember.count({
        where: { organizationId, isActive: true, deletedAt: null },
      }),
      prisma.organizationMember.count({
        where: {
          organizationId,
          OR: [{ isActive: false }, { deletedAt: { not: null } }],
        },
      }),
      organization.businessAttendanceEnabled
        ? prisma.attendanceRecord.count({ where: attendanceTodayWhere })
        : Promise.resolve(0),
      organization.businessAttendanceEnabled
        ? prisma.attendanceRecord.count({
            where: { ...attendanceTodayWhere, clockOut: null },
          })
        : Promise.resolve(0),
      organization.businessAttendanceEnabled
        ? prisma.attendanceRecord.findFirst({
            where: { ...attendanceTodayWhere, userId: user.userId },
            orderBy: { clockIn: "desc" },
            include: { zone: { select: { name: true } } },
          })
        : Promise.resolve(null),
      organization.businessTasksEnabled
        ? prisma.organizationTaskAssignee.count({
            where: {
              ...(isManager ? {} : { userId: user.userId }),
              task: { organizationId, deletedAt: null },
              status: { in: ["PENDING", "IN_PROGRESS"] },
            },
          })
        : Promise.resolve(0),
      organization.businessTasksEnabled && isManager
        ? prisma.organizationTask.count({
            where: { organizationId, deletedAt: null, createdById: user.userId },
          })
        : Promise.resolve(0),
      organization.businessTasksEnabled
        ? prisma.organizationTaskAssignee.count({
            where: {
              ...(isManager ? {} : { userId: user.userId }),
              task: { organizationId, deletedAt: null },
              status: "PENDING_REVIEW",
            },
          })
        : Promise.resolve(0),
      organization.businessTasksEnabled
        ? prisma.organizationTaskAssignee.count({
            where: {
              ...(isManager ? {} : { userId: user.userId }),
              task: { organizationId, deletedAt: null },
              status: "DONE",
              completedAt: { gte: month },
            },
          })
        : Promise.resolve(0),
      organization.businessTasksEnabled
        ? prisma.organizationTask.count({
            where: {
              organizationId,
              deletedAt: null,
              dueAt: { lt: new Date() },
              assignees: {
                some: {
                  ...(isManager ? {} : { userId: user.userId }),
                  status: { notIn: ["DONE", "CANCELLED"] },
                },
              },
            },
          })
        : Promise.resolve(0),
      organization.businessOrdersEnabled
        ? prisma.order.count({
            where: {
              organizationId,
              deletedAt: null,
              createdAt: { gte: today, lt: tomorrow },
            },
          })
        : Promise.resolve(0),
      organization.businessOrdersEnabled
        ? prisma.order.count({
            where: {
              organizationId,
              deletedAt: null,
              status: { in: ["PENDING", "CONFIRMED"] },
            },
          })
        : Promise.resolve(0),
      organization.businessOrdersEnabled
        ? prisma.order.aggregate({
            where: {
              organizationId,
              deletedAt: null,
              createdAt: { gte: today, lt: tomorrow },
            },
            _sum: { total: true },
          })
        : Promise.resolve({ _sum: { total: null } }),
      organization.businessInventoryEnabled
        ? prisma.product.count({
            where: { organizationId, isActive: true, deletedAt: null },
          })
        : Promise.resolve(0),
      organization.businessInventoryEnabled
        ? prisma.warehouseInventory.findMany({
            where: {
              warehouse: {
                organizations: { some: { organizationId } },
                deletedAt: null,
                isActive: true,
              },
            },
            select: { quantity: true, minQuantity: true },
          })
        : Promise.resolve([]),
      organization.businessOrdersEnabled
        ? prisma.warehouseStockRequest.count({ where: { organizationId } })
        : Promise.resolve(0),
      organization.businessOrdersEnabled
        ? prisma.warehouseStockRequest.count({
            where: {
              organizationId,
              status: { in: ["PENDING", "APPROVED", "PROCESSING"] },
            },
          })
        : Promise.resolve(0),
    ]);

    return res.json({
      organization: {
        id: organization.id,
        name: organization.name,
        features: {
          orders: organization.businessOrdersEnabled,
          inventory: organization.businessInventoryEnabled,
          attendance: organization.businessAttendanceEnabled,
          tasks: organization.businessTasksEnabled,
        },
      },
      staff: {
        active: activeMembers,
        inactive: inactiveMembers,
        total: activeMembers + inactiveMembers,
      },
      attendance: organization.businessAttendanceEnabled
        ? {
            presentToday,
            workingNow,
            myToday: myAttendanceToday
              ? {
                  id: myAttendanceToday.id,
                  clockIn: myAttendanceToday.clockIn,
                  clockOut: myAttendanceToday.clockOut,
                  totalMinutes: myAttendanceToday.totalMinutes,
                  zoneName: myAttendanceToday.zone?.name ?? null,
                }
              : null,
          }
        : null,
      tasks: organization.businessTasksEnabled
        ? {
            assignedOpen: assignedOpenTasks,
            created: createdTasks,
            pendingReview: pendingReviewTasks,
            completedThisMonth,
            overdue: overdueTasks,
          }
        : null,
      orders: organization.businessOrdersEnabled
        ? {
            today: todayOrders,
            pending: pendingOrders,
            todayTotal: Number(todayOrderTotal._sum.total ?? 0),
            stockRequests,
            pendingStockRequests,
          }
        : null,
      inventory: organization.businessInventoryEnabled
        ? {
            products: productCount,
            lowStock: lowStockItems.filter((item) => item.quantity <= item.minQuantity).length,
          }
        : null,
    });
  } catch (error) {
    console.error("[business dashboard summary error]", error);
    return res.status(500).json({ message: "Хяналтын мэдээлэл авахад алдаа гарлаа" });
  }
});

export default router;
