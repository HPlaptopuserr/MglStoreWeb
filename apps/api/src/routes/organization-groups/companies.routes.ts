import { Router, type Router as ExpressRouter } from "express";
import {
  access,
  audit,
  companyOwner,
  mutate,
  subject,
} from "../../services/organization-groups/access";
import {
  GroupError,
  object,
  parsePermissions,
  text,
} from "../../services/organization-groups/policy";
import { endpoint, param } from "./http";
export const groupCompaniesRouter: ExpressRouter = Router();

groupCompaniesRouter.put(
  "/:groupId/head-company",
  endpoint(async (req, res) => {
    const groupId = param(req, "groupId"),
      userId = subject(req),
      body = object(req.body);
    await mutate(groupId, async (db) => {
      const member = await access(db, userId, groupId, "owner");
      const organizationId = text(body.organizationId);
      const company = await db.groupCompany.findFirst({
        where: {
          groupId,
          organizationId,
          disconnectedAt: null,
          organization: { deletedAt: null, status: "ACTIVE" },
        },
      });
      if (!company)
        throw new GroupError(400, "Зөвшөөрч холбогдсон компани сонгоно уу.");
      if (member.group.headCompanyId === organizationId) return;
      await db.organizationGroup.update({
        where: { id: groupId },
        data: { headCompanyId: organizationId },
      });
      await audit(db, groupId, userId, "HEAD_CHANGED", organizationId, {
        before: member.group.headCompanyId,
        after: organizationId,
      });
    });
    res.json({ ok: true });
  }),
);
groupCompaniesRouter.patch(
  "/:groupId/companies/:companyId/sharing",
  endpoint(async (req, res) => {
    const groupId = param(req, "groupId"),
      companyId = param(req, "companyId"),
      userId = subject(req),
      body = object(req.body);
    await mutate(groupId, async (db) => {
      const company = await db.groupCompany.findFirst({
        where: { id: companyId, groupId, disconnectedAt: null },
      });
      if (!company) throw new GroupError(404, "Компанийн холбоос олдсонгүй.");
      await companyOwner(db, userId, company.organizationId);
      const sharedPermissions = parsePermissions(body.permissions);
      await db.groupCompany.update({
        where: { id: companyId },
        data: { sharedPermissions },
      });
      await audit(db, groupId, userId, "SHARING_UPDATED", companyId, {
        before: company.sharedPermissions,
        after: sharedPermissions,
      });
    });
    res.json({ ok: true });
  }),
);
groupCompaniesRouter.delete(
  "/:groupId/companies/:companyId",
  endpoint(async (req, res) => {
    const groupId = param(req, "groupId"),
      companyId = param(req, "companyId"),
      userId = subject(req);
    await mutate(groupId, async (db) => {
      const company = await db.groupCompany.findFirst({
        where: { id: companyId, groupId, disconnectedAt: null },
        include: { group: true },
      });
      if (!company) throw new GroupError(404, "Компанийн холбоос олдсонгүй.");
      if (company.group.ownerId !== userId)
        await companyOwner(db, userId, company.organizationId);
      if (company.group.headCompanyId === company.organizationId)
        throw new GroupError(409, "Эхлээд өөр толгой компани сонгоно уу.");
      await db.groupCompany.update({
        where: { id: companyId },
        data: { disconnectedAt: new Date() },
      });
      await db.groupMemberCompanyAccess.deleteMany({ where: { companyId } });
      await audit(db, groupId, userId, "COMPANY_DISCONNECTED", companyId, {
        organizationId: company.organizationId,
      });
    });
    res.json({ ok: true });
  }),
);
