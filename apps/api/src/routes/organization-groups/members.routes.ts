import {
  groupMonitorCandidates,
  inviteGroupMonitors,
} from "../../services/organization-groups/monitor-invitations";
import { Router, type Router as ExpressRouter } from "express";
import {
  access,
  audit,
  companyScope,
  mutate,
  subject,
} from "../../services/organization-groups/access";
import {
  GroupError,
  object,
  parsePermissions,
  parseRole,
} from "../../services/organization-groups/policy";
import { endpoint, param } from "./http";
export const groupMembersRouter: ExpressRouter = Router();

groupMembersRouter.get(
  "/:groupId/monitor-candidates",
  endpoint(async (req, res) => {
    res.json(await groupMonitorCandidates(subject(req), param(req, "groupId")));
  }),
);
groupMembersRouter.post(
  "/:groupId/monitor-invitations",
  endpoint(async (req, res) => {
    res
      .status(201)
      .json(
        await inviteGroupMonitors(
          subject(req),
          param(req, "groupId"),
          req.body,
        ),
      );
  }),
);

groupMembersRouter.patch(
  "/:groupId/members/:memberId",
  endpoint(async (req, res) => {
    const groupId = param(req, "groupId"),
      memberId = param(req, "memberId"),
      userId = subject(req),
      body = object(req.body);
    await mutate(groupId, async (db) => {
      await access(db, userId, groupId, "owner");
      const target = await db.groupMember.findFirst({
        where: { id: memberId, groupId, revokedAt: null },
      });
      if (!target || target.role === "OWNER")
        throw new GroupError(400, "Энэ гишүүний эрхийг өөрчлөх боломжгүй.");
      const role = parseRole(body.role),
        granted = parsePermissions(body.permissions);
      if (typeof body.allCompanies !== "boolean")
        throw new GroupError(400, "Компанийн хүрээ буруу байна.");
      const ids = await companyScope(
        db,
        groupId,
        body.companyIds,
        body.allCompanies,
      );
      await db.groupMember.update({
        where: { id: memberId },
        data: { role, permissions: granted, allCompanies: body.allCompanies },
      });
      await db.groupMemberCompanyAccess.deleteMany({ where: { memberId } });
      if (!body.allCompanies)
        await db.groupMemberCompanyAccess.createMany({
          data: ids.map((companyId) => ({
            memberId,
            groupId,
            companyId,
            permissions: granted,
          })),
        });
      await audit(db, groupId, userId, "MEMBER_UPDATED", memberId, {
        before: {
          role: target.role,
          permissions: target.permissions,
          allCompanies: target.allCompanies,
        },
        after: {
          role,
          permissions: granted,
          allCompanies: body.allCompanies,
          companyIds: ids,
        },
      });
    });
    res.json({ ok: true });
  }),
);
groupMembersRouter.delete(
  "/:groupId/members/:memberId",
  endpoint(async (req, res) => {
    const groupId = param(req, "groupId"),
      memberId = param(req, "memberId"),
      userId = subject(req);
    await mutate(groupId, async (db) => {
      const actor = await access(db, userId, groupId);
      const target = await db.groupMember.findFirst({
        where: { id: memberId, groupId, revokedAt: null },
      });
      if (!target || target.role === "OWNER")
        throw new GroupError(
          400,
          "Owner группээс гарахын өмнө эрхээ шилжүүлэх шаардлагатай.",
        );
      if (actor.role !== "OWNER" && target.userId !== userId)
        throw new GroupError(403, "Гишүүний эрх цуцлах эрхгүй байна.");
      await db.groupMember.update({
        where: { id: memberId },
        data: { revokedAt: new Date() },
      });
      await db.groupMemberCompanyAccess.deleteMany({ where: { memberId } });
      await audit(db, groupId, userId, "MEMBER_REVOKED", memberId, {
        userId: target.userId,
      });
    });
    res.json({ ok: true });
  }),
);
