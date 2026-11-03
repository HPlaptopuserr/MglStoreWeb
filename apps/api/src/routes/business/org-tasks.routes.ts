import { editTaskPlan, cancelTaskPlan } from "../../services/tasks/edit-plan";
import {
  createDailyPlan,
  TaskPlanError,
} from "../../services/tasks/daily-plan";
import { canReadTaskEvidence } from "../../services/tasks/evidence-access";
import {
  createTask,
  approveTaskAssignment,
} from "../../services/tasks/commands";
import {
  taskPayloadInclude,
  toTaskPayload,
} from "../../services/tasks/payload";
import { canManageOrganizationTasks } from "../../services/task-assignment-policy";
import { canAssignTaskToRole } from "../../services/task-assignment-policy";
import { Router, type Router as ExpressRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  OrganizationTaskPriority,
  OrganizationTaskStatus,
  prisma,
} from "@mgl/database";
import { requireAuth, type AuthPayload } from "../../middleware/auth";

const router: ExpressRouter = Router();

const taskEvidenceUploadsDir = path.resolve(
  __dirname,
  "../../../uploads/task-evidence",
);
if (!fs.existsSync(taskEvidenceUploadsDir)) {
  fs.mkdirSync(taskEvidenceUploadsDir, { recursive: true });
}

const taskEvidenceUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, taskEvidenceUploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || ".jpg";
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 4 },
  fileFilter: (_req, file, cb) => {
    cb(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype));
  },
});

router.get(
  "/org/tasks/evidence/uploads/:filename",
  requireAuth,
  async (req, res) => {
    const filename = path.basename(req.params.filename);
    if (!(await canReadTaskEvidence(getAuthUser(req).userId, filename)))
      return res.status(403).json({ message: "Зураг харах эрхгүй байна" });
    const filePath = path.join(taskEvidenceUploadsDir, filename);
    if (!fs.existsSync(filePath))
      return res.status(404).json({ message: "Зураг олдсонгүй" });
    res.setHeader("Cache-Control", "no-store");
    return res.sendFile(filePath);
  },
);

type TaskListScope = "assigned" | "created" | "all";

function getAuthUser(req: unknown): AuthPayload {
  return (req as { user: AuthPayload }).user;
}

function parseTaskPriority(value: unknown): OrganizationTaskPriority {
  const normalized = String(value || "NORMAL").toUpperCase();
  if (normalized in OrganizationTaskPriority) {
    return normalized as OrganizationTaskPriority;
  }
  return OrganizationTaskPriority.NORMAL;
}

function parseTaskStatus(value: unknown): OrganizationTaskStatus | null {
  if (value === undefined || value === null || value === "") return null;
  const normalized = String(value).toUpperCase();
  if (normalized in OrganizationTaskStatus) {
    return normalized as OrganizationTaskStatus;
  }
  return null;
}

function parseScope(value: unknown, isManager: boolean): TaskListScope {
  const normalized = String(value || "assigned").toLowerCase();
  if (isManager && (normalized === "created" || normalized === "all")) {
    return normalized;
  }
  return "assigned";
}

function normalizeAssigneeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => String(item || "").trim())
        .filter((item) => item.length > 0),
    ),
  );
}

function normalizeSubTaskTitles(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter((item) => item.length > 0)
    .slice(0, 20);
}

async function getCallerMembership(userId: string, organizationId: string) {
  return prisma.organizationMember.findFirst({
    where: {
      userId,
      organizationId,
      isActive: true,
      deletedAt: null,
      user: { isActive: true, deletedAt: null },
      organization: {
        status: "ACTIVE",
        deletedAt: null,
        businessTasksEnabled: true,
      },
    },
    select: { role: true },
  });
}

async function findOrganizationTasks(args: {
  organizationId: string;
  userId: string;
  scope: TaskListScope;
  status?: OrganizationTaskStatus | null;
}) {
  return prisma.organizationTask.findMany({
    where: {
      organizationId: args.organizationId,
      deletedAt: null,
      ...(args.scope === "assigned" || args.status
        ? {
            assignees: {
              some: {
                ...(args.scope === "assigned" ? { userId: args.userId } : {}),
                ...(args.status ? { status: args.status } : {}),
              },
            },
          }
        : {}),
      ...(args.scope === "created" ? { createdById: args.userId } : {}),
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    include: taskPayloadInclude,
  });
}

async function findTaskPayloadById(taskId: string) {
  return prisma.organizationTask.findUnique({
    where: { id: taskId },
    include: taskPayloadInclude,
  });
}

router.get("/org/tasks", requireAuth, async (req, res) => {
  try {
    const user = getAuthUser(req);
    const organizationId = String(req.query.organizationId || "");
    const membership = await getCallerMembership(user.userId, organizationId);
    if (!membership) {
      return res
        .status(403)
        .json({ message: "Энэ байгууллагад хандах эрхгүй байна" });
    }
    const isManager = canManageOrganizationTasks(membership.role);
    const scope = parseScope(req.query.scope, isManager);
    const status = parseTaskStatus(req.query.status);

    const tasks = await findOrganizationTasks({
      organizationId,
      userId: user.userId,
      scope,
      status,
    });

    return res.json(tasks.map(toTaskPayload));
  } catch (error) {
    console.error("list org tasks error", error);
    return res
      .status(500)
      .json({ message: "Даалгаврын жагсаалт авахад алдаа гарлаа" });
  }
});

export async function createOrganizationTask(
  req: import("express").Request,
  res: import("express").Response,
) {
  try {
    const user = getAuthUser(req);
    const body = req.body as {
      organizationId?: string;
      title?: string;
      description?: string;
      priority?: string;
      dueAt?: string | null;
      assigneeIds?: unknown;
      subTasks?: unknown;
      recurrence?: unknown;
      plannedStartAt?: unknown;
      planPeriod?: unknown;
    };
    const organizationId = String(body.organizationId || "").trim();
    const title = String(body.title || "").trim();
    const membership = await getCallerMembership(user.userId, organizationId);
    const isManager = canManageOrganizationTasks(membership?.role || "");
    const assigneeIds = normalizeAssigneeIds(body.assigneeIds);
    const subTaskTitles = normalizeSubTaskTitles(body.subTasks);
    if (!membership) {
      return res
        .status(403)
        .json({ message: "Энэ байгууллагад хандах эрхгүй байна" });
    }
    const isSelfPlan =
      assigneeIds.length === 1 && assigneeIds[0] === user.userId;

    if (!title) {
      return res
        .status(400)
        .json({ message: "Даалгаврын гарчиг шаардлагатай" });
    }
    if (!isManager && !isSelfPlan) {
      return res
        .status(403)
        .json({ message: "Даалгавар оноох эрх хүрэлцэхгүй байна" });
    }
    if (assigneeIds.length === 0) {
      return res
        .status(400)
        .json({ message: "Даалгавар оноох ажилтан сонгоно уу" });
    }
    if (!isSelfPlan && assigneeIds.includes(user.userId)) {
      return res
        .status(400)
        .json({ message: "Өөртөө даалгавар оноох боломжгүй" });
    }

    const assignees = await prisma.organizationMember.findMany({
      where: {
        organizationId,
        userId: { in: assigneeIds },
        isActive: true,
        deletedAt: null,
      },
      select: { userId: true, role: true },
    });
    const validAssigneeIds = assignees.map((item) => item.userId);
    if (validAssigneeIds.length !== assigneeIds.length) {
      return res
        .status(400)
        .json({ message: "Сонгосон ажилтан байгууллагад хамаарахгүй байна" });
    }

    if (
      !isSelfPlan &&
      assignees.some(
        (member) => !canAssignTaskToRole(membership?.role || "", member.role),
      )
    ) {
      return res.status(403).json({
        message:
          "Удирдлага ажилтанд, Owner удирдлага болон ажилтанд даалгавар онооно.",
      });
    }

    const dueAt = body.dueAt ? new Date(body.dueAt) : null;
    if (!dueAt) {
      return res.status(400).json({ message: "Дуусах хугацаа шаардлагатай" });
    }
    if (dueAt && Number.isNaN(dueAt.getTime())) {
      return res.status(400).json({ message: "Дуусах огноо буруу байна" });
    }

    if (
      body.planPeriod != null &&
      (typeof body.planPeriod !== "string" ||
        !["WEEK", "MONTH", "QUARTER", "YEAR"].includes(body.planPeriod))
    )
      return res
        .status(400)
        .json({ message: "Төлөвлөгөөний хугацааны сонголт буруу байна" });
    const plannedStartAt =
      typeof body.plannedStartAt === "string"
        ? new Date(body.plannedStartAt)
        : null;
    if (
      (body.plannedStartAt != null &&
        (!plannedStartAt || !Number.isFinite(+plannedStartAt))) ||
      (plannedStartAt && plannedStartAt > dueAt) ||
      (body.planPeriod != null && !plannedStartAt)
    )
      return res
        .status(400)
        .json({ message: "Төлөвлөгөөний эхлэх хугацааг шалгана уу" });
    const periodFields = {
      plannedStartAt,
      planPeriod: typeof body.planPeriod === "string" ? body.planPeriod : null,
    };
    if (body.recurrence !== undefined) {
      const plan = await createDailyPlan(
        organizationId,
        user.userId,
        {
          ...periodFields,
          title,
          description: body.description,
          priority: parseTaskPriority(body.priority),
          dueAt,
          assigneeIds: validAssigneeIds,
          subTasks: subTaskTitles,
        },
        body.recurrence,
      );
      return res.status(plan.repeated ? 200 : 201).json({
        tasks: plan.tasks.map(toTaskPayload),
        repeated: plan.repeated,
      });
    }
    const task = await createTask(prisma, organizationId, user.userId, {
      ...periodFields,
      title,
      description: body.description,
      priority: parseTaskPriority(body.priority),
      dueAt,
      assigneeIds: validAssigneeIds,
      subTasks: subTaskTitles,
    });

    return res.status(201).json(toTaskPayload(task));
  } catch (error) {
    if (error instanceof TaskPlanError)
      return res.status(error.status).json({ message: error.message });
    console.error("create org task error", error);
    return res.status(500).json({ message: "Даалгавар үүсгэхэд алдаа гарлаа" });
  }
}
router.post("/org/tasks", requireAuth, createOrganizationTask);

router.patch("/org/tasks/:taskId/plan", requireAuth, async (req, res) => {
  try {
    const task = await editTaskPlan(
      String(req.params.taskId),
      getAuthUser(req).userId,
      req.body,
    );
    return res.json(toTaskPayload(task));
  } catch (error: unknown) {
    if (error instanceof TaskPlanError)
      return res.status(error.status).json({ message: error.message });
    console.error("edit task plan error", error);
    return res.status(500).json({ message: "Төлөвлөгөө засаж чадсангүй" });
  }
});

router.patch("/org/tasks/:taskId/status", requireAuth, async (req, res) => {
  try {
    const user = getAuthUser(req);
    const { taskId } = req.params;
    const status = parseTaskStatus((req.body as { status?: string }).status);
    if (!status) {
      return res.status(400).json({ message: "Даалгаврын төлөв буруу байна" });
    }
    if (status === OrganizationTaskStatus.DONE) {
      return res.status(400).json({
        message: "Даалгаврыг зурагтай илгээж manager баталсны дараа дуусгана",
      });
    }
    if (
      status === OrganizationTaskStatus.CANCELLED ||
      status === OrganizationTaskStatus.PENDING_REVIEW
    ) {
      return res
        .status(400)
        .json({ message: "Энэ төлөвийг гараар солих боломжгүй" });
    }

    const assignment = await prisma.organizationTaskAssignee.findFirst({
      where: { taskId, userId: user.userId },
      select: {
        id: true,
        status: true,
        task: { select: { organizationId: true, deletedAt: true } },
      },
    });
    if (
      !assignment ||
      assignment.task.deletedAt ||
      !(await getCallerMembership(user.userId, assignment.task.organizationId))
    ) {
      return res
        .status(403)
        .json({ message: "Энэ даалгавар танд оноогдоогүй байна" });
    }
    if (
      assignment.status === OrganizationTaskStatus.DONE ||
      assignment.status === OrganizationTaskStatus.CANCELLED ||
      assignment.status === OrganizationTaskStatus.PENDING_REVIEW
    ) {
      return res
        .status(400)
        .json({ message: "Энэ даалгаврын төлөвийг өөрчлөх боломжгүй" });
    }

    const changed = await prisma.organizationTaskAssignee.updateMany({
      where: { id: assignment.id, status: { in: ["PENDING", "IN_PROGRESS"] } },
      data: {
        status,
        completedAt: null,
        submittedAt: null,
        approvedAt: null,
        approvedById: null,
      },
    });
    if (changed.count !== 1)
      return res
        .status(409)
        .json({ message: "Ажлын төлөв өөрчлөгдсөн. Шинэчилнэ үү." });

    const task = await prisma.organizationTask.findUnique({
      where: { id: taskId },
      include: taskPayloadInclude,
    });

    if (!task) {
      return res.status(404).json({ message: "Даалгавар олдсонгүй" });
    }

    return res.json(toTaskPayload(task));
  } catch (error) {
    console.error("update org task status error", error);
    return res
      .status(500)
      .json({ message: "Даалгаврын төлөв солиход алдаа гарлаа" });
  }
});

router.patch(
  "/org/tasks/:taskId/subtasks/:subTaskId",
  requireAuth,
  async (req, res) => {
    try {
      const user = getAuthUser(req);
      const { taskId, subTaskId } = req.params;
      const isCompleted = Boolean(
        (req.body as { isCompleted?: boolean }).isCompleted,
      );

      const task = await prisma.organizationTask.findFirst({
        where: { id: taskId, deletedAt: null },
        select: {
          id: true,
          organizationId: true,
          createdById: true,
          assignees: { select: { userId: true, status: true } },
        },
      });
      if (!task) {
        return res.status(404).json({ message: "Даалгавар олдсонгүй" });
      }

      if (!(await getCallerMembership(user.userId, task.organizationId)))
        return res
          .status(403)
          .json({ message: "Энэ байгууллагад хандах эрхгүй байна" });

      const currentAssignee = task.assignees.find(
        (assignee) => assignee.userId === user.userId,
      );
      if (!currentAssignee) {
        return res
          .status(403)
          .json({ message: "Sub-task зөвхөн оноогдсон ажилтан шинэчилнэ" });
      }
      if (
        currentAssignee.status === OrganizationTaskStatus.PENDING_REVIEW ||
        currentAssignee.status === OrganizationTaskStatus.DONE ||
        currentAssignee.status === OrganizationTaskStatus.CANCELLED
      ) {
        return res.status(400).json({
          message: "Шалгалтад орсон эсвэл батлагдсан ажлын sub-task өөрчлөхгүй",
        });
      }

      const subTask = await prisma.organizationTaskSubTask.findFirst({
        where: { id: subTaskId, taskId },
        select: { id: true },
      });
      if (!subTask) {
        return res.status(404).json({ message: "Sub-task олдсонгүй" });
      }

      const updated = await prisma.$transaction(async (tx) => {
        const claimed = await tx.organizationTaskAssignee.updateMany({
          where: {
            taskId,
            userId: user.userId,
            status: { in: ["PENDING", "IN_PROGRESS"] },
          },
          data: { updatedAt: new Date() },
        });
        if (!claimed.count) return false;
        await tx.organizationTaskSubTask.update({
          where: { id: subTaskId },
          data: { isCompleted, completedAt: isCompleted ? new Date() : null },
        });
        return true;
      });
      if (!updated)
        return res
          .status(409)
          .json({ message: "Ажлын төлөв өөрчлөгдсөн. Шинэчилнэ үү." });

      const updatedTask = await prisma.organizationTask.findUnique({
        where: { id: taskId },
        include: taskPayloadInclude,
      });

      if (!updatedTask) {
        return res.status(404).json({ message: "Даалгавар олдсонгүй" });
      }

      return res.json(toTaskPayload(updatedTask));
    } catch (error) {
      console.error("update org sub task error", error);
      return res
        .status(500)
        .json({ message: "Sub-task шинэчлэхэд алдаа гарлаа" });
    }
  },
);

router.post(
  "/org/tasks/:taskId/submit-completion",
  requireAuth,
  async (req, res, next) => {
    try {
      const user = getAuthUser(req);
      const assignment = await prisma.organizationTaskAssignee.findFirst({
        where: { taskId: req.params.taskId, userId: user.userId },
        include: {
          task: { select: { organizationId: true, deletedAt: true } },
        },
      });
      if (
        !assignment ||
        assignment.task.deletedAt ||
        !(await getCallerMembership(
          user.userId,
          assignment.task.organizationId,
        ))
      )
        return res
          .status(403)
          .json({ message: "Энэ даалгаварт гүйцэтгэл илгээх эрхгүй байна" });
      if (["DONE", "CANCELLED"].includes(assignment.status))
        return res.status(400).json({
          message: "Батлагдсан эсвэл цуцлагдсан ажилд зураг илгээхгүй",
        });
      next();
    } catch (error: unknown) {
      console.error("authorize task evidence error", error);
      return res
        .status(500)
        .json({ message: "Гүйцэтгэл илгээх эрх шалгаж чадсангүй" });
    }
  },
  taskEvidenceUpload.array("images", 4),
  async (req, res) => {
    const files = (req.files as Express.Multer.File[]) || [];
    let keepUploads = false;
    try {
      const user = getAuthUser(req);
      const { taskId } = req.params;

      if (files.length === 0) {
        return res
          .status(400)
          .json({ message: "Дуусгахын тулд 1-4 зураг хавсаргана уу" });
      }
      if (files.length > 4) {
        return res
          .status(400)
          .json({ message: "Дээд тал нь 4 зураг оруулах боломжтой" });
      }

      const assignment = await prisma.organizationTaskAssignee.findFirst({
        where: { taskId, userId: user.userId },
        include: {
          task: { select: { id: true, organizationId: true, deletedAt: true } },
        },
      });
      if (
        !assignment ||
        assignment.task.deletedAt ||
        !(await getCallerMembership(
          user.userId,
          assignment.task.organizationId,
        ))
      ) {
        return res
          .status(403)
          .json({ message: "Энэ даалгавар танд оноогдоогүй байна" });
      }
      if (
        assignment.status === OrganizationTaskStatus.DONE ||
        assignment.status === OrganizationTaskStatus.CANCELLED
      ) {
        return res.status(400).json({
          message: "Батлагдсан эсвэл цуцлагдсан ажлыг дахин илгээхгүй",
        });
      }

      const submitted = await prisma.$transaction(async (tx) => {
        const changed = await tx.organizationTaskAssignee.updateMany({
          where: {
            id: assignment.id,
            status: { in: ["PENDING", "IN_PROGRESS", "PENDING_REVIEW"] },
          },
          data: {
            status: "PENDING_REVIEW",
            submittedAt: new Date(),
            completedAt: null,
            approvedAt: null,
            approvedById: null,
          },
        });
        if (changed.count !== 1) return false;
        await tx.organizationTaskEvidenceImage.deleteMany({
          where: { assigneeId: assignment.id },
        });
        await tx.organizationTaskEvidenceImage.createMany({
          data: files.map((file, index) => ({
            assigneeId: assignment.id,
            url: `/api/org/tasks/evidence/uploads/${file.filename}`,
            originalName: file.originalname,
            sortOrder: index,
          })),
        });
        await tx.organizationTaskApprovalLog.create({
          data: {
            assigneeId: assignment.id,
            approvedById: user.userId,
            action: "SUBMITTED",
            note: "Зургаар баталгаажуулалт илгээсэн",
          },
        });
        return true;
      });
      if (!submitted)
        return res
          .status(409)
          .json({ message: "Ажлын төлөв өөрчлөгдсөн. Шинэчилнэ үү." });

      keepUploads = true;
      const task = await findTaskPayloadById(taskId);
      if (!task) {
        return res.status(404).json({ message: "Даалгавар олдсонгүй" });
      }

      return res.json(toTaskPayload(task));
    } catch (error) {
      console.error("submit org task completion error", error);
      return res
        .status(500)
        .json({ message: "Даалгавар дуусгах хүсэлт илгээхэд алдаа гарлаа" });
    } finally {
      if (!keepUploads)
        await Promise.all(
          files.map((file) =>
            fs.promises.unlink(file.path).catch(() => undefined),
          ),
        );
    }
  },
);

export async function approveOrganizationTask(
  req: import("express").Request,
  res: import("express").Response,
) {
  try {
    const user = getAuthUser(req);
    const { taskId } = req.params;
    const body = req.body as {
      assigneeId?: string;
      note?: string;
      performanceStars?: number;
      productivityPercent?: number;
    };
    const assigneeId = String(body.assigneeId || "").trim();
    const performanceStars = Number(body.performanceStars);
    const productivityPercent = Number(body.productivityPercent);

    if (!assigneeId) {
      return res.status(400).json({ message: "Батлах ажилтан шаардлагатай" });
    }
    if (
      !Number.isInteger(performanceStars) ||
      performanceStars < 1 ||
      performanceStars > 10
    ) {
      return res
        .status(400)
        .json({ message: "Гүйцэтгэлийг 1-10 одоор үнэлнэ үү" });
    }
    if (
      !Number.isInteger(productivityPercent) ||
      productivityPercent < 0 ||
      productivityPercent > 100
    ) {
      return res
        .status(400)
        .json({ message: "Бүтээмжийн хувь 0-100 хооронд байна" });
    }

    const assignment = await prisma.organizationTaskAssignee.findFirst({
      where: { id: assigneeId, taskId },
      include: {
        task: {
          select: {
            organizationId: true,
            createdById: true,
            deletedAt: true,
          },
        },
        evidenceImages: { select: { id: true } },
      },
    });
    if (!assignment || assignment.task.deletedAt) {
      return res.status(404).json({ message: "Даалгавар олдсонгүй" });
    }

    const membership = await getCallerMembership(
      user.userId,
      assignment.task.organizationId,
    );
    const isManager = canManageOrganizationTasks(membership?.role || "");
    const isCreator = assignment.task.createdById === user.userId;
    if (
      !membership ||
      (!isManager && !isCreator) ||
      assignment.userId === user.userId
    ) {
      return res
        .status(403)
        .json({ message: "Даалгавар батлах эрх хүрэлцэхгүй байна" });
    }
    if (assignment.status !== OrganizationTaskStatus.PENDING_REVIEW) {
      return res
        .status(400)
        .json({ message: "Батлах хүлээгдэж буй төлөв биш байна" });
    }
    if (assignment.evidenceImages.length === 0) {
      return res
        .status(400)
        .json({ message: "Баталгаажуулах зураг байхгүй байна" });
    }

    const approved = await prisma.$transaction((tx) =>
      approveTaskAssignment(tx, assignment.id, user.userId, {
        performanceStars,
        productivityPercent,
        note: body.note?.trim() || null,
      }),
    );
    if (!approved)
      return res
        .status(409)
        .json({ message: "Тайлан аль хэдийн шийдвэрлэгдсэн. Шинэчилнэ үү" });

    const task = await findTaskPayloadById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Даалгавар олдсонгүй" });
    }

    return res.json(toTaskPayload(task));
  } catch (error) {
    console.error("approve org task completion error", error);
    return res.status(500).json({ message: "Даалгавар батлахад алдаа гарлаа" });
  }
}
router.patch(
  "/org/tasks/:taskId/approve",
  requireAuth,
  approveOrganizationTask,
);

router.post("/org/tasks/:taskId/comments", requireAuth, async (req, res) => {
  try {
    const user = getAuthUser(req);
    const { taskId } = req.params;
    const body = String((req.body as { body?: string }).body || "").trim();

    if (!body) {
      return res.status(400).json({ message: "Сэтгэгдэл хоосон байна" });
    }
    if (body.length > 1000) {
      return res
        .status(400)
        .json({ message: "Сэтгэгдэл 1000 тэмдэгтээс ихгүй байна" });
    }

    const task = await prisma.organizationTask.findFirst({
      where: { id: taskId, deletedAt: null },
      select: {
        id: true,
        organizationId: true,
        createdById: true,
        assignees: { select: { userId: true } },
      },
    });
    if (!task) {
      return res.status(404).json({ message: "Даалгавар олдсонгүй" });
    }

    const membership = await getCallerMembership(
      user.userId,
      task.organizationId,
    );
    if (!membership)
      return res
        .status(403)
        .json({ message: "Байгууллагад хандах эрхгүй байна" });
    const isManager = canManageOrganizationTasks(membership.role);
    const isCreator = task.createdById === user.userId;
    const isAssignee = task.assignees.some(
      (assignee) => assignee.userId === user.userId,
    );

    if (!isManager && !isCreator && !isAssignee) {
      return res
        .status(403)
        .json({ message: "Сэтгэгдэл бичих эрх хүрэлцэхгүй байна" });
    }

    await prisma.organizationTaskComment.create({
      data: { taskId, authorId: user.userId, body },
    });

    const updatedTask = await findTaskPayloadById(taskId);
    if (!updatedTask) {
      return res.status(404).json({ message: "Даалгавар олдсонгүй" });
    }

    return res.status(201).json(toTaskPayload(updatedTask));
  } catch (error) {
    console.error("create org task comment error", error);
    return res
      .status(500)
      .json({ message: "Сэтгэгдэл хадгалахад алдаа гарлаа" });
  }
});

router.patch("/org/tasks/:taskId/cancel", requireAuth, async (req, res) => {
  try {
    const task = await cancelTaskPlan(
      String(req.params.taskId),
      getAuthUser(req).userId,
    );
    return res.json(toTaskPayload(task));
  } catch (error: unknown) {
    if (error instanceof TaskPlanError)
      return res.status(error.status).json({ message: error.message });
    console.error("cancel task plan error", error);
    return res.status(500).json({ message: "Ажил цуцалж чадсангүй" });
  }
});

router.delete("/org/tasks/:taskId", requireAuth, async (req, res) => {
  try {
    const user = getAuthUser(req);
    const { taskId } = req.params;
    const task = await prisma.organizationTask.findUnique({
      where: { id: taskId },
      select: { organizationId: true },
    });
    if (!task) {
      return res.status(404).json({ message: "Даалгавар олдсонгүй" });
    }

    const membership = await getCallerMembership(
      user.userId,
      task.organizationId,
    );
    if (!canManageOrganizationTasks(membership?.role || "")) {
      return res.status(403).json({ message: "Даалгавар устгах эрхгүй байна" });
    }

    await prisma.organizationTask.update({
      where: { id: taskId },
      data: { deletedAt: new Date() },
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error("delete org task error", error);
    return res.status(500).json({ message: "Даалгавар устгахад алдаа гарлаа" });
  }
});

export default router;
