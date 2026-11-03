import { OrganizationTaskStatus } from "@mgl/database";
import { GroupError } from "../../services/organization-groups/policy";
import { Router, type Request, type Router as ExpressRouter } from "express";
import { subject } from "../../services/organization-groups/access";
import {
  createGroupTask,
  groupTaskDetail,
  groupTaskList,
  groupTaskManagers,
  reviewGroupTask,
} from "../../services/organization-groups/task-service";
import { endpoint, param } from "./http";
import {
  assignGroupTask,
  groupTaskRecipients,
} from "../../services/organization-groups/task-assignment";
export const groupTasksRouter: ExpressRouter = Router();
groupTasksRouter.get(
  "/:groupId/task-recipients",
  endpoint(async (req, res) => {
    res.json(
      await groupTaskRecipients({
        userId: subject(req),
        groupId: param(req, "groupId"),
      }),
    );
  }),
);
groupTasksRouter.post(
  "/:groupId/tasks/assign",
  endpoint(async (req, res) => {
    const result = await assignGroupTask(
      { userId: subject(req), groupId: param(req, "groupId") },
      req.body,
    );
    res.status(result.repeated ? 200 : 201).json(result);
  }),
);
const base = "/:groupId/companies/:organizationId/tasks";
const context = (req: Request) => ({
  userId: subject(req),
  groupId: param(req, "groupId"),
  organizationId: param(req, "organizationId"),
});
groupTasksRouter.get(
  `${base}/managers`,
  endpoint(async (req, res) => {
    res.json(await groupTaskManagers(context(req)));
  }),
);
groupTasksRouter.get(
  base,
  endpoint(async (req, res) => {
    const cursor =
      typeof req.query.cursor === "string" && req.query.cursor.length <= 160
        ? req.query.cursor
        : undefined;
    const status = req.query.status;
    if (
      status !== undefined &&
      (typeof status !== "string" ||
        !Object.values<string>(OrganizationTaskStatus).includes(status))
    )
      throw new GroupError(400, "Ажлын төлөв буруу байна.");
    res.json(
      await groupTaskList(
        context(req),
        cursor,
        status as OrganizationTaskStatus | undefined,
      ),
    );
  }),
);
groupTasksRouter.post(
  base,
  endpoint(async (req, res) => {
    const result = await createGroupTask(context(req), req.body);
    res.status(result.repeated ? 200 : 201).json(result);
  }),
);
groupTasksRouter.get(
  `${base}/:taskId`,
  endpoint(async (req, res) => {
    res.json(await groupTaskDetail(context(req), param(req, "taskId")));
  }),
);
groupTasksRouter.patch(
  `${base}/:taskId/approve`,
  endpoint(async (req, res) => {
    res.json(
      await reviewGroupTask(context(req), param(req, "taskId"), req.body),
    );
  }),
);
