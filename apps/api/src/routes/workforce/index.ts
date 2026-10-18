import { formatWorkforceInstant } from "../../services/workforce/format";
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
import { workforceStatusLabels } from "@mgl/types";
import * as XLSX from "xlsx";
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
    const rows = data.rows.filter(
      (row) =>
        (!req.query.userId || row.userId === req.query.userId) &&
        (!req.query.department || row.department === req.query.department) &&
        (!req.query.status || row.status === req.query.status),
    );
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.json_to_sheet(
        rows.map((r) => ({
          Огноо: r.date,
          Ажилтан: r.employeeName,
          Хэлтэс: r.department,
          Төлөв: workforceStatusLabels[r.status],
          Хуваарь: r.shiftName ?? "",
          Ирсэн: formatWorkforceInstant(r.clockIn, data.policy.timeZone),
          Явсан: formatWorkforceInstant(r.clockOut, data.policy.timeZone),
          "Ажиллах минут": r.plannedMinutes,
          "Ажилласан минут": r.workedMinutes,
          "Хоцролт минут": r.lateMinutes,
          "Эрт явалт минут": r.earlyMinutes,
          "Тасалсан минут": r.absentMinutes,
          "Илүү минут": r.overtimeMinutes,
          "Батлагдсан илүү минут": r.approvedOvertimeMinutes,
        })),
      ),
      "Цагийн тайлан",
    );
    const buffer: Buffer = XLSX.write(book, {
      type: "buffer",
      bookType: "xlsx",
    });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="attendance-${data.range.from}-${data.range.to}.xlsx"`,
    );
    res.send(buffer);
  }),
);
workforceRoutes.use(
  "/workforce",
  managementRouter,
  workTasksRouter,
  requestsRouter,
  settingsRouter,
  workforceBillingRouter,
  workforceAddonsRouter,
);
