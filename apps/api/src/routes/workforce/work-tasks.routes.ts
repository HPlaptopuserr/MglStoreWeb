import { formatWorkforceInstant } from "../../services/workforce/format";
import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import * as XLSX from "xlsx";
import {
  workforceAccess,
  WorkforceError,
} from "../../services/workforce/access";
import {
  daysBetween,
  wallToInstant,
} from "../../services/workforce/calculation";
import { endpoint } from "./http";
import {
  object,
  text,
  date,
  strings,
} from "../../services/workforce/validation";
import {
  createOrganizationTask,
  approveOrganizationTask,
} from "../business/org-tasks.routes";
export const workTasksRouter: ExpressRouter = Router();
workTasksRouter.get(
  ["/work-tasks", "/work-tasks/export"],
  endpoint(async (req, res) => {
    const ctx = await workforceAccess(req, { feature: "reports" });
    const from = String(req.query.from ?? ""),
      to = String(req.query.to ?? "");
    daysBetween(from, to);
    const timeZone =
      ctx.member.organization.workforcePolicy?.timeZone ?? "Asia/Ulaanbaatar";
    const start = wallToInstant(new Date(`${from}T00:00:00Z`), timeZone);
    const endWall = new Date(`${to}T00:00:00Z`);
    endWall.setUTCDate(endWall.getUTCDate() + 1);
    const end = wallToInstant(endWall, timeZone);
    const assignments = await prisma.organizationTaskAssignee.findMany({
      where: {
        ...(ctx.scopeUserIds ? { userId: { in: ctx.scopeUserIds } } : {}),
        task: { organizationId: ctx.organizationId, deletedAt: null },
        OR: [
          { task: { dueAt: { gte: start, lt: end } } },
          { submittedAt: { gte: start, lt: end } },
          { task: { createdAt: { gte: start, lt: end } } },
        ],
      },
      include: {
        user: {
          select: { email: true, profile: { select: { fullName: true } } },
        },
        evidenceImages: { orderBy: { sortOrder: "asc" } },
        task: {
          include: {
            subTasks: { orderBy: { sortOrder: "asc" } },
            createdBy: {
              select: { email: true, profile: { select: { fullName: true } } },
            },
            comments: {
              where: { deletedAt: null },
              orderBy: { createdAt: "desc" },
              take: 20,
              include: {
                author: {
                  select: {
                    email: true,
                    profile: { select: { fullName: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 2001,
    });
    if (assignments.length > 2000)
      throw new WorkforceError(
        400,
        "Мөр хэт олон байна. Огнооны хүрээг багасгана уу",
      );
    const allItems = assignments.map((a) => ({
      id: a.id,
      taskId: a.taskId,
      userId: a.userId,
      name: a.user.profile?.fullName ?? a.user.email,
      title: a.task.title,
      description: a.task.description,
      priority: a.task.priority,
      status: a.status,
      dueAt: a.task.dueAt,
      createdAt: a.task.createdAt,
      submittedAt: a.submittedAt,
      approvedAt: a.approvedAt,
      performanceStars: a.performanceStars,
      productivityPercent: a.productivityPercent,
      evaluationNote: a.evaluationNote,
      createdBy: a.task.createdBy.profile?.fullName ?? a.task.createdBy.email,
      subTasks: a.task.subTasks.map((s) => ({
        id: s.id,
        title: s.title,
        completed: s.isCompleted,
      })),
      evidence: a.evidenceImages.map((e) => ({
        id: e.id,
        url: e.url,
        name: e.originalName,
      })),
      comments: a.task.comments.map((c) => ({
        id: c.id,
        body: c.body,
        createdAt: c.createdAt,
        author: c.author.profile?.fullName ?? c.author.email,
      })),
    }));
    const filterUser = String(req.query.user ?? ""),
      filterStatus = String(req.query.status ?? ""),
      filterFiles = String(req.query.files ?? ""),
      search = String(req.query.search ?? "").toLocaleLowerCase();
    const items = allItems.filter(
      (i) =>
        (req.query.mode !== "reports" || Boolean(i.submittedAt)) &&
        (!filterUser || i.userId === filterUser) &&
        (!filterStatus || i.status === filterStatus) &&
        (!filterFiles ||
          (filterFiles === "yes"
            ? i.evidence.length > 0
            : !i.evidence.length)) &&
        `${i.title} ${i.name}`.toLocaleLowerCase().includes(search),
    );
    if (req.path.endsWith("/export")) {
      if (!ctx.canExport)
        throw new WorkforceError(403, "Тайлан экспортлох эрх хүрэлцэхгүй");
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        book,
        XLSX.utils.json_to_sheet(
          items.map((i) => ({
            Ажилтан: i.name,
            Төлөвлөгөө: i.title,
            Тайлбар: i.description,
            Төлөв: i.status,
            Дуусах: formatWorkforceInstant(i.dueAt, timeZone, true),
            Илгээсэн: formatWorkforceInstant(i.submittedAt, timeZone, true),
            Үнэлгээ: i.performanceStars,
            "Гүйцэтгэл %": i.productivityPercent,
            "Үнэлгээний тайлбар": i.evaluationNote,
            "Нотлох зураг": i.evidence.length,
          })),
        ),
        "Ажлын тайлан",
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="work-reports-${from}-${to}.xlsx"`,
      );
      res.send(XLSX.write(book, { type: "buffer", bookType: "xlsx" }));
      return;
    }
    res.json({ items, canManage: ctx.canManage, canExport: ctx.canExport });
  }),
);
workTasksRouter.post(
  "/work-tasks",
  endpoint(async (req, res) => {
    const ctx = await workforceAccess(req, {
      manage: true,
      feature: "reports",
    });
    const body = object(req.body);
    const raw = text(body.dueAt, "Дуусах хугацаа", 40);
    const due = date(raw, "Дуусах хугацаа");
    const dueAt = raw.endsWith("Z")
      ? due
      : wallToInstant(
          due,
          ctx.member.organization.workforcePolicy?.timeZone ??
            "Asia/Ulaanbaatar",
        );
    req.body = {
      title: text(body.title, "Төлөвлөгөөний нэр", 200),
      description: text(body.description, "Ажлын тайлбар", 5000, true),
      assigneeIds: strings(body.assigneeIds, "Ажилтан", 200),
      subTasks: strings(body.subTasks ?? [], "Дэд ажил", 20).map((value) =>
        text(value, "Дэд ажлын нэр", 300),
      ),
      priority: text(body.priority, "Чухал байдал", 20, true) || "NORMAL",
      dueAt: dueAt.toISOString(),
      organizationId: ctx.organizationId,
    };
    return createOrganizationTask(req, res);
  }),
);
workTasksRouter.patch(
  "/work-tasks/:taskId/approve",
  endpoint(async (req, res) => {
    const ctx = await workforceAccess(req, {
      manage: true,
      feature: "reports",
    });
    const task = await prisma.organizationTask.findFirst({
      where: {
        id: String(req.params.taskId),
        organizationId: ctx.organizationId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!task) throw new WorkforceError(404, "Төлөвлөгөө олдсонгүй");
    return approveOrganizationTask(req, res);
  }),
);
workTasksRouter.get(
  "/work-tasks/evidence/:id",
  endpoint(async (req, res) => {
    const ctx = await workforceAccess(req, { feature: "reports" });
    const evidence = await prisma.organizationTaskEvidenceImage.findFirst({
      where: {
        id: String(req.params.id),
        assignee: {
          ...(ctx.scopeUserIds ? { userId: { in: ctx.scopeUserIds } } : {}),
          task: { organizationId: ctx.organizationId, deletedAt: null },
        },
      },
      select: { url: true },
    });
    if (
      !evidence ||
      !/^\/api\/org\/tasks\/evidence\/uploads\/[a-zA-Z0-9_.-]+$/.test(
        evidence.url,
      )
    )
      throw new WorkforceError(404, "Зураг олдсонгүй");
    const path = await import("node:path");
    res.sendFile(
      path.resolve(
        __dirname,
        "../../../uploads/task-evidence",
        path.basename(evidence.url),
      ),
    );
  }),
);
