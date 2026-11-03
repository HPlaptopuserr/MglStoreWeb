import { Router, type Router as ExpressRouter } from "express";
import {
  access,
  audit,
  mutate,
  subject,
} from "../../services/organization-groups/access";
import {
  GroupError,
  object,
  permissions,
  text,
} from "../../services/organization-groups/policy";
import { endpoint, param } from "./http";
export const groupOwnershipRouter: ExpressRouter = Router();

groupOwnershipRouter.post(
  "/:groupId/ownership/request",
  endpoint(async (req, res) => {
    const groupId = param(req, "groupId"),
      userId = subject(req),
      targetId = text(object(req.body).userId);
    await mutate(groupId, async (db) => {
      await access(db, userId, groupId, "owner");
      if (targetId === userId)
        throw new GroupError(400, "Өөр идэвхтэй гишүүн сонгоно уу.");
      await access(db, targetId, groupId);
      await db.organizationGroup.update({
        where: { id: groupId },
        data: {
          pendingOwnerId: targetId,
          ownershipExpiresAt: new Date(Date.now() + 7 * 86400_000),
        },
      });
      await audit(db, groupId, userId, "OWNERSHIP_REQUESTED", targetId, {
        from: userId,
        to: targetId,
      });
    });
    res.json({ ok: true });
  }),
);
groupOwnershipRouter.post(
  "/:groupId/ownership/accept",
  endpoint(async (req, res) => {
    const groupId = param(req, "groupId"),
      userId = subject(req);
    await mutate(groupId, async (db) => {
      const member = await access(db, userId, groupId),
        group = member.group;
      if (
        group.pendingOwnerId !== userId ||
        !group.ownershipExpiresAt ||
        group.ownershipExpiresAt <= new Date()
      )
        throw new GroupError(403, "Owner шилжүүлэх хүчинтэй хүсэлт алга.");
      // Demotion precedes promotion to preserve the one-owner database guard.
      await db.groupMember.update({
        where: { groupId_userId: { groupId, userId: group.ownerId } },
        data: { role: "ADMIN" },
      });
      await db.groupMember.update({
        where: { id: member.id },
        data: {
          role: "OWNER",
          allCompanies: true,
          permissions: [...permissions],
        },
      });
      await db.groupMemberCompanyAccess.deleteMany({
        where: { memberId: member.id },
      });
      await db.organizationGroup.update({
        where: { id: groupId },
        data: {
          ownerId: userId,
          pendingOwnerId: null,
          ownershipExpiresAt: null,
        },
      });
      await audit(db, groupId, userId, "OWNERSHIP_TRANSFERRED", groupId, {
        before: group.ownerId,
        after: userId,
      });
    });
    res.json({ ok: true });
  }),
);
groupOwnershipRouter.post(
  "/:groupId/ownership/cancel",
  endpoint(async (req, res) => {
    const groupId = param(req, "groupId"),
      userId = subject(req);
    await mutate(groupId, async (db) => {
      const member = await access(db, userId, groupId, "owner");
      await db.organizationGroup.update({
        where: { id: groupId },
        data: { pendingOwnerId: null, ownershipExpiresAt: null },
      });
      await audit(db, groupId, userId, "OWNERSHIP_CANCELLED", groupId, {
        targetId: member.group.pendingOwnerId,
      });
    });
    res.json({ ok: true });
  }),
);
