import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import { workforceAccess } from "../../services/workforce/access";
import { WorkforceError } from "../../services/workforce/access";
import { object, text, strings } from "../../services/workforce/validation";
import { endpoint, audit, assertMembers } from "./http";
export const noticesRouter: ExpressRouter = Router();
noticesRouter.post(
  "/notices",
  endpoint(async (req, res) => {
    const ctx = await workforceAccess(req, {
        manage: true,
        feature: "notifications",
      }),
      b = object(req.body),
      userIds = strings(b.userIds, "Хүлээн авагч", 1000);
    if (!userIds.length)
      throw new WorkforceError(400, "Хүлээн авагч сонгоно уу");
    const row = await prisma.$transaction(async (tx) => {
      await assertMembers(ctx.organizationId, userIds, tx);
      const created = await tx.workforceNotice.create({
        data: {
          organizationId: ctx.organizationId,
          title: text(b.title, "Гарчиг", 200),
          content: text(b.content, "Агуулга", 5000),
          userIds,
          createdBy: ctx.user.userId,
        },
      });
      await audit(
        tx,
        ctx.organizationId,
        ctx.user.userId,
        "NOTICE_SENT",
        created.id,
        null,
        { title: created.title, userIds },
      );
      return created;
    });
    res.status(201).json(row);
  }),
);
