import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import {
  workforceAccess,
  WorkforceError,
} from "../../services/workforce/access";
import { object, text } from "../../services/workforce/validation";
import { endpoint, audit, assertMembers } from "./http";
export const departmentsRouter: ExpressRouter = Router();
departmentsRouter.post(
  "/departments",
  endpoint(async (req, res) => {
    const ctx = await workforceAccess(req, {
        manage: true,
        feature: "departments",
      }),
      b = object(req.body),
      name = text(b.name, "Хэлтсийн нэр", 120);
    const parentId = text(b.parentId, "Дээд хэлтэс", 100, true) || null,
      managerId = text(b.managerId, "Удирдлага", 100, true) || null;
    const result = await prisma.$transaction(async (tx) => {
      if (
        parentId &&
        !(await tx.workforceDepartment.findFirst({
          where: { id: parentId, organizationId: ctx.organizationId },
        }))
      )
        throw new WorkforceError(400, "Дээд хэлтэс олдсонгүй");
      if (managerId) await assertMembers(ctx.organizationId, [managerId], tx);
      const row = await tx.workforceDepartment.create({
        data: { organizationId: ctx.organizationId, name, parentId, managerId },
      });
      await audit(
        tx,
        ctx.organizationId,
        ctx.user.userId,
        "DEPARTMENT_CREATED",
        row.id,
        null,
        row,
      );
      return row;
    });
    res.status(201).json(result);
  }),
);

departmentsRouter.patch(
  "/departments/:id",
  endpoint(async (req, res) => {
    const ctx = await workforceAccess(req, {
        manage: true,
        feature: "departments",
      }),
      b = object(req.body),
      id = String(req.params.id),
      name = text(b.name, "Хэлтсийн нэр", 120),
      parentId = text(b.parentId, "Дээд хэлтэс", 100, true) || null,
      managerId = text(b.managerId, "Удирдлага", 100, true) || null;
    const result = await prisma.$transaction(async (tx) => {
      const rows = await tx.workforceDepartment.findMany({
          where: { organizationId: ctx.organizationId },
        }),
        before = rows.find((d) => d.id === id);
      if (!before) throw new WorkforceError(404, "Хэлтэс олдсонгүй");
      let cursor = parentId;
      const visited = new Set([id]);
      while (cursor) {
        if (visited.has(cursor))
          throw new WorkforceError(400, "Хэлтсийн шатлал давталттай байна");
        visited.add(cursor);
        const parent = rows.find((d) => d.id === cursor);
        if (!parent) throw new WorkforceError(400, "Дээд хэлтэс олдсонгүй");
        cursor = parent.parentId;
      }
      if (managerId) await assertMembers(ctx.organizationId, [managerId], tx);
      const row = await tx.workforceDepartment.update({
        where: { id },
        data: { name, parentId, managerId },
      });
      await tx.organizationMember.updateMany({
        where: { organizationId: ctx.organizationId, department: before.name },
        data: { department: name },
      });
      await audit(
        tx,
        ctx.organizationId,
        ctx.user.userId,
        "DEPARTMENT_UPDATED",
        id,
        before,
        row,
      );
      return row;
    });
    res.json(result);
  }),
);

departmentsRouter.delete(
  "/departments/:id",
  endpoint(async (req, res) => {
    const ctx = await workforceAccess(req, {
        manage: true,
        feature: "departments",
      }),
      id = String(req.params.id);
    await prisma.$transaction(async (tx) => {
      const before = await tx.workforceDepartment.findFirst({
        where: { id, organizationId: ctx.organizationId },
      });
      if (!before) throw new WorkforceError(404, "Хэлтэс олдсонгүй");
      if (
        (await tx.workforceDepartment.count({
          where: { organizationId: ctx.organizationId, parentId: id },
        })) ||
        (await tx.organizationMember.count({
          where: {
            organizationId: ctx.organizationId,
            department: before.name,
            deletedAt: null,
          },
        }))
      )
        throw new WorkforceError(
          409,
          "Дэд хэлтэс, ажилтныг эхлээд өөр хэлтэст шилжүүлнэ үү",
        );
      await tx.workforceDepartment.delete({ where: { id } });
      await audit(
        tx,
        ctx.organizationId,
        ctx.user.userId,
        "DEPARTMENT_DELETED",
        id,
        before,
        null,
      );
    });
    res.json({ ok: true });
  }),
);
