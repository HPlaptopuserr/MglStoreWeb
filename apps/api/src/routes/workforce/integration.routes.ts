import { Router, type Router as ExpressRouter } from "express";
import rateLimit from "express-rate-limit";
import { createHash } from "node:crypto";
import { prisma } from "@mgl/database";
import { workforceSnapshot } from "../../services/workforce/snapshot";
import { WorkforceError } from "../../services/workforce/access";
import type { AuthPayload } from "../../middleware/auth";
import { endpoint } from "./http";
export const workforceIntegrationRouter: ExpressRouter = Router();
workforceIntegrationRouter.use(
  "/workforce/integration",
  rateLimit({
    windowMs: 60000,
    limit: 60,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
);
workforceIntegrationRouter.get(
  "/workforce/integration/:resource",
  endpoint(async (req, res) => {
    const resources: Record<string, string> = {
      organization: "organization:read",
      employees: "employees:read",
      attendance: "attendance:read",
      reports: "reports:read",
    };
    const resource = String(req.params.resource),
      scope = resources[resource];
    if (!scope) throw new WorkforceError(404, "API зам олдсонгүй");
    const authorization = req.headers.authorization ?? "",
      secret = authorization.startsWith("Bearer ")
        ? authorization.slice(7)
        : "";
    if (!/^mglwf_[a-f0-9]{64}$/.test(secret))
      throw new WorkforceError(401, "API түлхүүр буруу");
    const token = await prisma.workforceApiToken.findUnique({
      where: { tokenHash: createHash("sha256").update(secret).digest("hex") },
    });
    if (!token || token.revokedAt || +token.expiresAt <= Date.now())
      throw new WorkforceError(401, "API түлхүүр идэвхгүй");
    if (!token.scopes.includes(scope))
      throw new WorkforceError(403, "Хамрах хүрээ хүрэлцэхгүй");
    const policy = await prisma.workforcePolicy.findUnique({
      where: { organizationId: token.organizationId },
    });
    if (
      !policy ||
      !policy.features ||
      typeof policy.features !== "object" ||
      Array.isArray(policy.features) ||
      !("integrations" in policy.features) ||
      policy.features.integrations !== true
    )
      throw new WorkforceError(403, "API холболт идэвхгүй");
    // A scoped key also follows its creator's current membership and organization access.
    (req as typeof req & { user: AuthPayload }).user = {
      userId: token.createdBy,
      email: "",
      role: "USER",
      organizationId: token.organizationId,
    };
    if (
      req.query.organizationId &&
      req.query.organizationId !== token.organizationId
    )
      throw new WorkforceError(403, "Түлхүүр өөр байгууллагад хамаарна");
    const snapshot = await workforceSnapshot(req);
    await prisma.workforceApiToken.update({
      where: { id: token.id },
      data: { lastUsedAt: new Date() },
    });
    res.setHeader("Cache-Control", "no-store");
    res.json(
      resource === "organization"
        ? snapshot.organization
        : resource === "employees"
          ? snapshot.employees.map((e) => ({
              id: e.id,
              userId: e.userId,
              name: e.name,
              department: e.department,
              role: e.role,
              active: e.active,
            }))
          : resource === "attendance"
            ? snapshot.records
            : {
                range: snapshot.range,
                rows: snapshot.rows,
                summary: snapshot.summary,
              },
    );
  }),
);
