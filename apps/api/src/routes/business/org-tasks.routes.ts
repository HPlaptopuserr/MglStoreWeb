import { Router, type Router as ExpressRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  OrganizationTaskPriority,
  OrganizationTaskStatus,
  prisma,
} from "@mgl/database";
import { Permission } from "@mgl/types";
import { requireAuth, type AuthPayload } from "../../middleware/auth";
import { requireOrgPermission } from "../../services/permission.service";

const router: ExpressRouter = Router();

const MANAGER_ROLES = new Set(["OWNER", "ADMIN", "CEO", "MANAGER", "HR"]);
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

router.use("/org/tasks/evidence/uploads", (req, res) => {
  const filePath = path.join(taskEvidenceUploadsDir, path.basename(req.path));
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "Зураг олдсонгүй" });
  }
  res.sendFile(filePath);
});

type TaskListScope = "assigned" | "created" | "all";

type TaskWithRelations = Awaited<
  ReturnType<typeof findOrganizationTasks>
>[number];

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
    where: { userId, organizationId, isActive: true, deletedAt: null },
    select: { role: true },
  });
}

const taskPayloadInclude = {
  createdBy: {
    select: {
      id: true,
      email: true,
      profile: { select: { fullName: true, avatarUrl: true } },
    },
  },
  assignees: {
    orderBy: { createdAt: "asc" as const },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          profile: {
            select: { fullName: true, phoneNumber: true, avatarUrl: true },
          },
        },
      },
      evidenceImages: {
        orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
      },
      approvalLogs: {
        orderBy: { createdAt: "desc" as const },
        include: {
          approvedBy: {
            select: {
              id: true,
              email: true,
              profile: { select: { fullName: true, avatarUrl: true } },
            },
          },
        },
      },
    },
  },
  subTasks: {
    orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
  },
  comments: {
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" as const },
    include: {
      author: {
        select: {
          id: true,
          email: true,
          profile: { select: { fullName: true, avatarUrl: true } },
        },
      },
    },
  },
};

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
      ...(args.scope === "assigned"
        ? { assignees: { some: { userId: args.userId } } }
        : {}),
      ...(args.scope === "created" ? { createdById: args.userId } : {}),
      ...(args.status ? { assignees: { some: { status: args.status } } } : {}),
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    include: taskPayloadInclude,
  });
}

function toTaskPayload(task: TaskWithRelations) {
  return {
    id: task.id,
    organizationId: task.organizationId,
    title: task.title,
    description: task.description,
    priority: task.priority,
    dueAt: task.dueAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    createdBy: {
      id: task.createdBy.id,
      email: task.createdBy.email,
      fullName: task.createdBy.profile?.fullName || task.createdBy.email,
      avatarUrl: task.createdBy.profile?.avatarUrl || null,
    },
    assignees: task.assignees.map((assignee) => ({
      id: assignee.id,
      userId: assignee.userId,
      status: assignee.status,
      completedAt: assignee.completedAt,
      submittedAt: assignee.submittedAt,
      approvedAt: assignee.approvedAt,
      approvedById: assignee.approvedById,
      performanceStars: assignee.performanceStars,
      productivityPercent: assignee.productivityPercent,
      evaluationNote: assignee.evaluationNote,
      assignedAt: assignee.createdAt,
      updatedAt: assignee.updatedAt,
      fullName: assignee.user.profile?.fullName || assignee.user.email,
      email: assignee.user.email,
      phone: assignee.user.profile?.phoneNumber || null,
      avatarUrl: assignee.user.profile?.avatarUrl || null,
      evidenceImages: assignee.evidenceImages.map((image) => ({
        id: image.id,
        url: image.url,
        originalName: image.originalName,
        sortOrder: image.sortOrder,
        createdAt: image.createdAt,
      })),
      approvalLogs: assignee.approvalLogs.map((log) => ({
        id: log.id,
        approvedById: log.approvedById,
        approvedByName:
          log.approvedBy.profile?.fullName || log.approvedBy.email,
        approvedByEmail: log.approvedBy.email,
        action: log.action,
        note: log.note,
        createdAt: log.createdAt,
      })),
    })),
    subTasks: task.subTasks.map((subTask) => ({
      id: subTask.id,
      title: subTask.title,
      isCompleted: subTask.isCompleted,
      completedAt: subTask.completedAt,
      sortOrder: subTask.sortOrder,
      createdAt: subTask.createdAt,
      updatedAt: subTask.updatedAt,
    })),
    comments: task.comments.map((comment) => ({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: {
        id: comment.author.id,
        email: comment.author.email,
        fullName: comment.author.profile?.fullName || comment.author.email,
        avatarUrl: comment.author.profile?.avatarUrl || null,
      },
    })),
  };
}

async function findTaskPayloadById(taskId: string) {
  return prisma.organizationTask.findUnique({
    where: { id: taskId },
    include: taskPayloadInclude,
  });
}

router.get(
  "/org/tasks",
  requireAuth,
  requireOrgPermission({ from: "query" }, Permission.VIEW_ORG_DASHBOARD),
  async (req, res) => {
    try {
      const user = getAuthUser(req);
      const organizationId = String(req.query.organizationId || "");
      const membership = await getCallerMembership(user.userId, organizationId);
      const isManager = MANAGER_ROLES.has(membership?.role || "");
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
  },
);

router.post(
  "/org/tasks",
  requireAuth,
  requireOrgPermission({ from: "body" }, Permission.VIEW_ORG_DASHBOARD),
  async (req, res) => {
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
      };
      const organizationId = String(body.organizationId || "").trim();
      const title = String(body.title || "").trim();
      const membership = await getCallerMembership(user.userId, organizationId);
      const isManager = MANAGER_ROLES.has(membership?.role || "");
      const assigneeIds = normalizeAssigneeIds(body.assigneeIds);
      const subTaskTitles = normalizeSubTaskTitles(body.subTasks);

      if (!title) {
        return res
          .status(400)
          .json({ message: "Даалгаврын гарчиг шаардлагатай" });
      }
      if (!isManager) {
        return res
          .status(403)
          .json({ message: "Даалгавар оноох эрх хүрэлцэхгүй байна" });
      }
      if (assigneeIds.length === 0) {
        return res
          .status(400)
          .json({ message: "Даалгавар оноох ажилтан сонгоно уу" });
      }
      if (assigneeIds.includes(user.userId)) {
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
        select: { userId: true },
      });
      const validAssigneeIds = assignees.map((item) => item.userId);
      if (validAssigneeIds.length !== assigneeIds.length) {
        return res
          .status(400)
          .json({ message: "Сонгосон ажилтан байгууллагад хамаарахгүй байна" });
      }

      const dueAt = body.dueAt ? new Date(body.dueAt) : null;
      if (!dueAt) {
        return res.status(400).json({ message: "Дуусах хугацаа шаардлагатай" });
      }
      if (dueAt && Number.isNaN(dueAt.getTime())) {
        return res.status(400).json({ message: "Дуусах огноо буруу байна" });
      }

      const task = await prisma.organizationTask.create({
        data: {
          organizationId,
          title,
          description: body.description?.trim() || null,
          priority: parseTaskPriority(body.priority),
          dueAt,
          createdById: user.userId,
          assignees: {
            create: validAssigneeIds.map((userId) => ({ userId })),
          },
          ...(subTaskTitles.length > 0
            ? {
                subTasks: {
                  create: subTaskTitles.map((subTaskTitle, index) => ({
                    title: subTaskTitle,
                    sortOrder: index,
                  })),
                },
              }
            : {}),
        },
        include: taskPayloadInclude,
      });

      return res.status(201).json(toTaskPayload(task));
    } catch (error) {
      console.error("create org task error", error);
      return res
        .status(500)
        .json({ message: "Даалгавар үүсгэхэд алдаа гарлаа" });
    }
  },
);

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
      select: { id: true, status: true },
    });
    if (!assignment) {
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

    await prisma.organizationTaskAssignee.update({
      where: { id: assignment.id },
      data: {
        status,
        completedAt: null,
        submittedAt: null,
        approvedAt: null,
        approvedById: null,
      },
    });

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

      await prisma.organizationTaskSubTask.update({
        where: { id: subTaskId },
        data: {
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
        },
      });

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
  taskEvidenceUpload.array("images", 4),
  async (req, res) => {
    try {
      const user = getAuthUser(req);
      const { taskId } = req.params;
      const files = (req.files as Express.Multer.File[]) || [];

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
          task: { select: { id: true, deletedAt: true } },
        },
      });
      if (!assignment || assignment.task.deletedAt) {
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

      await prisma.$transaction(async (tx) => {
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
        await tx.organizationTaskAssignee.update({
          where: { id: assignment.id },
          data: {
            status: OrganizationTaskStatus.PENDING_REVIEW,
            submittedAt: new Date(),
            completedAt: null,
            approvedAt: null,
            approvedById: null,
          },
        });
        await tx.organizationTaskApprovalLog.create({
          data: {
            assigneeId: assignment.id,
            approvedById: user.userId,
            action: "SUBMITTED",
            note: "Зургаар баталгаажуулалт илгээсэн",
          },
        });
      });

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
    }
  },
);

router.patch("/org/tasks/:taskId/approve", requireAuth, async (req, res) => {
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
    const isManager = MANAGER_ROLES.has(membership?.role || "");
    const isCreator = assignment.task.createdById === user.userId;
    if (!isManager && !isCreator) {
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

    await prisma.$transaction([
      prisma.organizationTaskAssignee.update({
        where: { id: assignment.id },
        data: {
          status: OrganizationTaskStatus.DONE,
          completedAt: new Date(),
          approvedAt: new Date(),
          approvedById: user.userId,
          performanceStars,
          productivityPercent,
          evaluationNote: body.note?.trim() || null,
        },
      }),
      prisma.organizationTaskApprovalLog.create({
        data: {
          assigneeId: assignment.id,
          approvedById: user.userId,
          action: "APPROVED",
          note: body.note?.trim() || null,
        },
      }),
    ]);

    const task = await findTaskPayloadById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Даалгавар олдсонгүй" });
    }

    return res.json(toTaskPayload(task));
  } catch (error) {
    console.error("approve org task completion error", error);
    return res.status(500).json({ message: "Даалгавар батлахад алдаа гарлаа" });
  }
});

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
    const isManager = MANAGER_ROLES.has(membership?.role || "");
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
    const user = getAuthUser(req);
    const { taskId } = req.params;
    const task = await prisma.organizationTask.findFirst({
      where: { id: taskId, deletedAt: null },
      select: {
        id: true,
        organizationId: true,
        createdById: true,
        assignees: { select: { id: true, status: true } },
      },
    });
    if (!task) {
      return res.status(404).json({ message: "Даалгавар олдсонгүй" });
    }

    const membership = await getCallerMembership(
      user.userId,
      task.organizationId,
    );
    const isManager = MANAGER_ROLES.has(membership?.role || "");
    const isCreator = task.createdById === user.userId;
    if (!isManager && !isCreator) {
      return res
        .status(403)
        .json({ message: "Даалгавар цуцлах эрх хүрэлцэхгүй байна" });
    }

    const cancellableAssignees = task.assignees.filter(
      (assignee) => assignee.status !== OrganizationTaskStatus.DONE,
    );
    if (cancellableAssignees.length === 0) {
      return res
        .status(400)
        .json({ message: "Бүх ажил батлагдсан тул цуцлах боломжгүй" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.organizationTaskAssignee.updateMany({
        where: {
          taskId,
          status: { not: OrganizationTaskStatus.DONE },
        },
        data: {
          status: OrganizationTaskStatus.CANCELLED,
          completedAt: null,
          submittedAt: null,
          approvedAt: null,
          approvedById: null,
        },
      });
      await tx.organizationTaskApprovalLog.createMany({
        data: cancellableAssignees.map((assignee) => ({
          assigneeId: assignee.id,
          approvedById: user.userId,
          action: "CANCELLED",
          note: "Даалгавар цуцалсан",
        })),
      });
    });

    const updatedTask = await findTaskPayloadById(taskId);
    if (!updatedTask) {
      return res.status(404).json({ message: "Даалгавар олдсонгүй" });
    }

    return res.json(toTaskPayload(updatedTask));
  } catch (error) {
    console.error("cancel org task error", error);
    return res.status(500).json({ message: "Даалгавар цуцлахад алдаа гарлаа" });
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
    if (!MANAGER_ROLES.has(membership?.role || "")) {
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
