import { manualAttendanceRouter } from "./manual-attendance.routes";
import { filterWorkforceReportRows } from "@mgl/types";
import { exportAttendanceWorkbook } from "../../services/workforce/export/attendance-workbook";
import { workTasksRouter } from "./work-tasks.routes";
import { Router, type Router as ExpressRouter } from "express";
import { requireAuth } from "../../middleware/auth";
import { workforceSnapshot } from "../../services/workforce/snapshot";
import {
  workforceAccess,
  authenticated,
  WorkforceError,
} from "../../services/workforce/access";
import { endpoint } from "./http";
import { workforceAddonsRouter } from "./addons.routes";
import { managementRouter } from "./management.routes";
import { workforceBillingRouter } from "./billing.routes";
import { requestsRouter } from "./requests.routes";
import { settingsRouter, workforceAdminRouter } from "./settings.routes";
import { prisma } from "@mgl/database";
export { workforceAdminRouter };
export const workforceRoutes: ExpressRouter = Router();
workforceRoutes.use("/workforce", requireAuth);
workforceRoutes.get(
  "/workforce/session",
  endpoint(async (req, res) => {
    const user = authenticated(req);
    const memberships = await prisma.organizationMember.findMany({
      where: {
        userId: user.userId,
        isActive: true,
        deletedAt: null,
        organization: {
          deletedAt: null,
          status: "ACTIVE",
          businessAttendanceEnabled: true,
        },
      },
      include: { organization: { select: { id: true, name: true } } },
    });
    const managed = await prisma.workforceDepartment.findMany({
      where: {
        managerId: user.userId,
        organizationId: { in: memberships.map((m) => m.organizationId) },
      },
      select: { organizationId: true },
    });
    const organizations = memberships
      .filter(
        (m) =>
          ["OWNER", "ADMIN"].includes(m.role) ||
          m.capabilities.includes("WORKFORCE_ATTENDANCE_VIEW") ||
          managed.some((d) => d.organizationId === m.organizationId),
      )
      .map((m) => ({ ...m.organization, role: m.role }));
    if (!organizations.length)
      throw new WorkforceError(
        403,
        "Цаг удирдах эрхтэй байгууллага байхгүй байна",
      );
    res.json({ userId: user.userId, organizations });
  }),
);
workforceRoutes.get(
  "/workforce/snapshot",
  endpoint(async (req, res) => {
    res.json(await workforceSnapshot(req));
  }),
);
workforceRoutes.get(
  "/workforce/export",
  endpoint(async (req, res) => {
    const ctx = await workforceAccess(req, { feature: "reports" });
    if (!ctx.canExport)
      throw new WorkforceError(403, "Тайлан экспортлох эрх хүрэлцэхгүй");
    const data = await workforceSnapshot(req);
    const rows = filterWorkforceReportRows(data.rows, {
      userId:
        typeof req.query.userId === "string" ? req.query.userId : undefined,
      department:
        typeof req.query.department === "string"
          ? req.query.department
          : undefined,
      status:
        typeof req.query.status === "string" ? req.query.status : undefined,
      query: typeof req.query.q === "string" ? req.query.q : undefined,
    });
    const buffer = await exportAttendanceWorkbook(data, rows);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="attendance-${data.range.from}-${data.range.to}.xlsx"; filename*=UTF-8''${encodeURIComponent(`Ирц-${data.range.from}-${data.range.to}.xlsx`)}`,
    );
    res.send(buffer);
  }),
);
workforceRoutes.use(
  "/workforce",
  managementRouter,
  manualAttendanceRouter,
  workTasksRouter,
  requestsRouter,
  settingsRouter,
  workforceBillingRouter,
  workforceAddonsRouter,
);
