import { headCompanyPlans } from "../../services/organization-groups/head-company-plans";
import { text } from "../../services/organization-groups/policy";
import { groupTasksRouter } from "./tasks.routes";
import { groupMembersRouter } from "./members.routes";
import { groupCompaniesRouter } from "./companies.routes";
import { groupOwnershipRouter } from "./ownership.routes";
import { Router, type Router as ExpressRouter } from "express";
import { requireAuth } from "../../middleware/auth";
import { subject } from "../../services/organization-groups/access";
import { groupSnapshot } from "../../services/organization-groups/snapshot";
import { wallNow } from "../../services/workforce/calculation";
import { groupsRouter } from "./groups.routes";
import { invitationsRouter } from "./invitations.routes";
import { endpoint, param } from "./http";
export const organizationGroupRoutes: ExpressRouter = Router();
organizationGroupRoutes.use(
  "/organization-groups",
  requireAuth,
  (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  },
);
organizationGroupRoutes.get(
  "/organization-groups/head-company-plans",
  endpoint(async (req, res) => {
    res.json(
      await headCompanyPlans(
        subject(req),
        text(req.query.organizationId),
        req.query.cursor,
      ),
    );
  }),
);
organizationGroupRoutes.get(
  "/organization-groups/:groupId/snapshot",
  endpoint(async (req, res) => {
    const today = wallNow("Asia/Ulaanbaatar").toISOString().slice(0, 10);
    const from = typeof req.query.from === "string" ? req.query.from : today;
    const to = typeof req.query.to === "string" ? req.query.to : today;
    const organizationId =
      typeof req.query.organizationId === "string"
        ? req.query.organizationId
        : undefined;
    res.json(
      await groupSnapshot(
        subject(req),
        param(req, "groupId"),
        from,
        to,
        organizationId,
        req.query.includePeople === "true",
      ),
    );
  }),
);
organizationGroupRoutes.use(
  "/organization-groups",
  groupTasksRouter,
  invitationsRouter,
  groupMembersRouter,
  groupCompaniesRouter,
  groupOwnershipRouter,
  groupsRouter,
);
