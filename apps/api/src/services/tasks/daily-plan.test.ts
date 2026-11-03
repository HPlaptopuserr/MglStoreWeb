import "../../config/env";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma, OrganizationTaskPriority } from "@mgl/database";
import { createDailyPlan, dailyOccurrences, TaskPlanError } from "./daily-plan";
import { editTaskPlan, cancelTaskPlan } from "./edit-plan";

test("daily dates include both endpoints, month rollover and each local deadline", () => {
  const result = dailyOccurrences(
    new Date("2026-11-03T10:00:00Z"),
    "2026-12-03",
    "Asia/Ulaanbaatar",
  );
  assert.equal(result.length, 31);
  assert.equal(result[0]?.date, "2026-11-03");
  assert.equal(result[30]?.dueAt.toISOString(), "2026-12-03T10:00:00.000Z");
  assert.equal(
    dailyOccurrences(
      new Date("2026-11-03T10:00:00Z"),
      "2027-11-02",
      "Asia/Ulaanbaatar",
    ).length,
    365,
  );
  assert.equal(
    dailyOccurrences(
      new Date("2028-01-01T10:00:00Z"),
      "2028-12-31",
      "Asia/Ulaanbaatar",
    ).length,
    366,
  );
  assert.equal(
    dailyOccurrences(
      new Date("2028-02-01T10:00:00Z"),
      "2028-02-29",
      "Asia/Ulaanbaatar",
    ).length,
    29,
  );
  assert.equal(
    dailyOccurrences(
      new Date("2026-11-03T10:00:00Z"),
      "2026-11-03",
      "Asia/Ulaanbaatar",
    ).length,
    1,
  );
  for (const through of ["2026-02-30", "2026-11-02", "2027-11-04", "bad"]) {
    assert.throws(
      () =>
        dailyOccurrences(
          new Date("2026-11-03T10:00:00Z"),
          through,
          "Asia/Ulaanbaatar",
        ),
      TaskPlanError,
    );
  }
});
test("daily recurrence preserves the wall clock across daylight saving time", () => {
  const dates = dailyOccurrences(
    new Date("2026-03-07T23:00:00Z"),
    "2026-03-09",
    "America/New_York",
  );
  assert.equal(dates[1]?.dueAt.toISOString(), "2026-03-08T22:00:00.000Z");
});
const url = process.env.GROUP_TEST_DATABASE_URL;
let safe = false;
try {
  const parsed = new URL(url ?? "");
  safe =
    ["127.0.0.1", "localhost"].includes(parsed.hostname) &&
    parsed.pathname.endsWith("_test") &&
    url === process.env.DATABASE_URL;
} catch {
  /* Tests never use the normal database. */
}
test(
  "month and year plans are atomic and idempotent, independent days and reviewed work are protected",
  { skip: !safe },
  async () => {
    const id = randomUUID();
    const actor = await prisma.user.create({
      data: { email: `daily-${id}@test.invalid` },
    });
    const org = await prisma.organization.create({
      data: {
        name: "Daily plan test",
        slug: `daily-${id}`,
        taxId: `daily-${id}`,
      },
    });
    try {
      const membership = await prisma.organizationMember.create({
        data: { userId: actor.id, organizationId: org.id, role: "OWNER" },
      });
      const input = {
        title: "Daily report",
        description: "Original",
        priority: OrganizationTaskPriority.NORMAL,
        dueAt: new Date("2026-11-03T10:00:00Z"),
        assigneeIds: [actor.id],
        subTasks: ["Check documents"],
      };
      const config = {
        key: `daily_${id}`,
        frequency: "DAILY",
        through: "2026-12-02",
      };
      const first = await createDailyPlan(org.id, actor.id, input, config);
      assert.equal(first.tasks.length, 30);
      assert.equal(new Set(first.tasks.map((t) => t.subTasks[0]?.id)).size, 30);
      const retry = await createDailyPlan(org.id, actor.id, input, config);
      assert.equal(retry.repeated, true);
      assert.equal(
        (
          await createDailyPlan(
            org.id,
            actor.id,
            { ...input, plannedStartAt: null, planPeriod: null },
            config,
          )
        ).repeated,
        true,
      );
      assert.deepEqual(
        retry.tasks.map((t) => t.id),
        first.tasks.map((t) => t.id),
      );
      await assert.rejects(
        () =>
          createDailyPlan(
            org.id,
            actor.id,
            { ...input, title: "Changed" },
            config,
          ),
        (e: unknown) => e instanceof TaskPlanError && e.status === 409,
      );
      const one = first.tasks[0]!,
        two = first.tasks[1]!;
      const change = {
        title: "Changed one day",
        description: "Updated",
        priority: "HIGH",
        dueAt: one.dueAt!.toISOString(),
        updatedAt: one.updatedAt.toISOString(),
      };
      await editTaskPlan(one.id, actor.id, change);
      assert.equal(
        (
          await prisma.organizationTask.findUniqueOrThrow({
            where: { id: two.id },
          })
        ).title,
        "Daily report",
      );
      await prisma.organizationTaskAssignee.updateMany({
        where: { taskId: one.id },
        data: { status: "PENDING_REVIEW" },
      });
      await assert.rejects(
        () => editTaskPlan(one.id, actor.id, change),
        (e: unknown) => e instanceof TaskPlanError && e.status === 409,
      );
      await cancelTaskPlan(two.id, actor.id);
      assert.equal(
        await prisma.organizationTaskAssignee.count({
          where: { task: { organizationId: org.id }, status: "CANCELLED" },
        }),
        1,
      );
      assert.equal(
        await prisma.organizationTaskAssignee.count({
          where: { task: { organizationId: org.id }, status: "PENDING" },
        }),
        28,
      );
      const yearlyInput = {
        ...input,
        plannedStartAt: input.dueAt,
        planPeriod: "YEAR",
      };
      const yearlyConfig = {
        ...config,
        key: `year_${id}`,
        through: "2027-11-02",
      };
      const year = await createDailyPlan(
        org.id,
        actor.id,
        yearlyInput,
        yearlyConfig,
      );
      assert.equal(year.tasks.length, 365);
      assert.ok(
        year.tasks.every(
          (task) =>
            task.planPeriod === "YEAR" &&
            task.plannedStartAt?.toISOString() === input.dueAt.toISOString(),
        ),
      );
      assert.equal(
        new Set(year.tasks.map((task) => task.subTasks[0]?.id)).size,
        365,
      );
      assert.equal(
        (await createDailyPlan(org.id, actor.id, yearlyInput, yearlyConfig))
          .repeated,
        true,
      );
      await prisma.organizationMember.update({
        where: { id: membership.id },
        data: { isActive: false },
      });
      await assert.rejects(
        () => cancelTaskPlan(first.tasks[2]!.id, actor.id),
        (e: unknown) => e instanceof TaskPlanError && e.status === 403,
      );
    } finally {
      await prisma.organization.delete({ where: { id: org.id } });
      await prisma.user.delete({ where: { id: actor.id } });
      await prisma.$disconnect();
    }
  },
);
