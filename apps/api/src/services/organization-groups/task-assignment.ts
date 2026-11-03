import { createHash } from "node:crypto";
import { prisma } from "@mgl/database";
import { access, audit, lockGroup } from "./access";
import { effectivePermissions, GroupError, object, text } from "./policy";
import { createGroupTaskInTransaction } from "./task-service";
import { groupTaskInput } from "./task-validation";

type AssignmentContext = { userId: string; groupId: string };

export function groupTaskRecipients(c: AssignmentContext) {
  return prisma.$transaction(async (db) => {
    await lockGroup(db, c.groupId);
    const member = await access(db, c.userId, c.groupId);
    const companies = await db.groupCompany.findMany({
      where: {
        groupId: c.groupId,
        disconnectedAt: null,
        organization: {
          deletedAt: null,
          status: "ACTIVE",
          businessTasksEnabled: true,
        },
      },
      include: { organization: { select: { name: true } } },
    });
    const allowed = companies.filter((company) => {
      const p = effectivePermissions(member, company);
      return p.includes("PLANS_VIEW") && p.includes("PLANS_ASSIGN");
    });
    const names = new Map(
      allowed.map((company) => [
        company.organizationId,
        company.organization.name,
      ]),
    );
    const people = await db.organizationMember.findMany({
      where: {
        organizationId: { in: [...names.keys()] },
        role: { in: ["OWNER", "ADMIN"] },
        isActive: true,
        deletedAt: null,
        userId: { not: c.userId },
        user: { isActive: true, deletedAt: null },
      },
      select: {
        userId: true,
        organizationId: true,
        role: true,
        user: { select: { profile: { select: { fullName: true } } } },
      },
      orderBy: [{ userId: "asc" }, { organizationId: "asc" }],
      take: 501,
    });
    if (people.length > 500)
      throw new GroupError(422, "Удирдлагын жагсаалт хэт олон байна.");
    return people.map((p) => ({
      userId: p.userId,
      name: p.user.profile?.fullName || "Удирдлага",
      organizationId: p.organizationId,
      companyName: names.get(p.organizationId)!,
      role: p.role,
    }));
  });
}

export function assignGroupTask(c: AssignmentContext, value: unknown) {
  const body = object(value);
  if (
    !Array.isArray(body.recipients) ||
    body.recipients.length < 1 ||
    body.recipients.length > 20
  )
    throw new GroupError(400, "1–20 удирдлага сонгоно уу.");
  const recipients = body.recipients
    .map((value: unknown) => {
      const r = object(value);
      return {
        userId: text(r.userId, 160),
        organizationId: text(r.organizationId, 160),
      };
    })
    .sort(
      (a, b) =>
        a.organizationId.localeCompare(b.organizationId) ||
        a.userId.localeCompare(b.userId),
    );
  if (
    new Set(recipients.map((r) => JSON.stringify(r))).size !== recipients.length
  )
    throw new GroupError(400, "Хариуцагч давхардсан байна.");
  const input = groupTaskInput({
    ...body,
    assigneeIds: recipients.map((r) => r.userId),
  });
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({ ...input, recipients }))
    .digest("hex");
  return prisma.$transaction(
    async (db) => {
      await lockGroup(db, c.groupId);
      await access(db, c.userId, c.groupId);
      const previous = await db.groupAuditLog.findFirst({
        where: {
          groupId: c.groupId,
          action: "PLAN_BATCH_ASSIGNED",
          entityId: input.clientRequestId,
        },
      });
      if (
        previous &&
        (previous.actorId !== c.userId ||
          object(previous.details).fingerprint !== fingerprint)
      )
        throw new GroupError(
          409,
          "Энэ хүсэлтийн мэдээлэл өмнө илгээснээс өөр байна.",
        );
      const byCompany = new Map<string, string[]>();
      for (const r of recipients) {
        const ids = byCompany.get(r.organizationId) ?? [];
        ids.push(r.userId);
        byCompany.set(r.organizationId, ids);
      }
      const tasks = [];
      for (const [organizationId, assigneeIds] of byCompany) {
        const requestId = createHash("sha256")
          .update(JSON.stringify([input.clientRequestId, organizationId]))
          .digest("hex");
        const task = await createGroupTaskInTransaction(
          db,
          { ...c, organizationId },
          { ...input, assigneeIds, clientRequestId: requestId },
        );
        tasks.push({ id: task.id, organizationId });
      }
      if (!previous)
        await audit(
          db,
          c.groupId,
          c.userId,
          "PLAN_BATCH_ASSIGNED",
          input.clientRequestId,
          { fingerprint, recipients, tasks },
        );
      return { tasks, repeated: !!previous };
    },
    { timeout: 15000 },
  );
}
