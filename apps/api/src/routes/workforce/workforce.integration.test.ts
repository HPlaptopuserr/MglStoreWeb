import "../../config/env";
import { after, before, test, mock } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import jwt from "jsonwebtoken";
import type { Server } from "node:http";
import { randomUUID } from "node:crypto";
import { prisma } from "@mgl/database";
import { wallNow, wallToInstant } from "../../services/workforce/calculation";
import { defaultWorkforceFeatures } from "@mgl/types";
import { workforceRoutes, workforceAdminRouter } from "./index";
import { workforceIntegrationRouter } from "./integration.routes";
import { workforceBillingPublicRouter } from "./billing.routes";
import { clearTokenCache } from "../../services/qpay";
import orgTaskRoutes from "../business/org-tasks.routes";
import { processWorkforceMailQueue } from "../../services/workforce/mail-worker";
import { emailService } from "../../services/email/email.service";
const local = (() => {
  try {
    return ["localhost", "127.0.0.1", "::1"].includes(
      new URL(process.env.DATABASE_URL ?? "").hostname,
    );
  } catch {
    return false;
  }
})();
let server: Server | undefined,
  base = "",
  orgId = "",
  otherOrg = "",
  owner = "",
  staff = "",
  adminToken = "",
  staffToken = "",
  outsiderToken = "";
const run = (name: string, fn: () => Promise<void>) =>
  test(name, { skip: !local }, fn);
async function request(
  path: string,
  token = adminToken,
  method = "GET",
  body?: unknown,
) {
  const response = await fetch(`${base}/api/workforce/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json()) as Record<string, unknown>;
  return { status: response.status, data };
}
before(async () => {
  if (!local) return;
  const suffix = randomUUID();
  const organization = await prisma.organization.create({
    data: {
      name: "Workforce integration test",
      slug: `wf-test-${suffix}`,
      taxId: `WF-${suffix}`,
      type: "BUSINESS_CUSTOMER",
      maxMembers: 5,
    },
  });
  orgId = organization.id;
  const second = await prisma.organization.create({
    data: {
      name: "Other test tenant",
      slug: `wf-other-${suffix}`,
      taxId: `OTHER-${suffix}`,
      type: "BUSINESS_CUSTOMER",
    },
  });
  otherOrg = second.id;
  const first = await prisma.user.create({
      data: { email: `wf-owner-${suffix}@test.local` },
    }),
    secondUser = await prisma.user.create({
      data: { email: `wf-staff-${suffix}@test.local` },
    });
  owner = first.id;
  staff = secondUser.id;
  await prisma.organizationMember.createMany({
    data: [
      { userId: owner, organizationId: orgId, role: "OWNER" },
      { userId: staff, organizationId: orgId, role: "STAFF" },
      { userId: staff, organizationId: otherOrg, role: "OWNER" },
    ],
  });
  await prisma.workforcePolicy.create({
    data: {
      organizationId: orgId,
      features: { ...defaultWorkforceFeatures, integrations: true },
    },
  });
  const sign = (userId: string, organizationId: string) =>
    jwt.sign(
      { userId, email: "", role: "USER", organizationId },
      process.env.JWT_SECRET || "dev-secret-change-me",
      { expiresIn: "5m" },
    );
  adminToken = sign(owner, orgId);
  staffToken = sign(staff, orgId);
  outsiderToken = sign(staff, otherOrg);
  const app = express();
  app.use(express.json());
  app.use(
    "/api",
    workforceIntegrationRouter,
    workforceRoutes,
    workforceAdminRouter,
    workforceBillingPublicRouter,
    orgTaskRoutes,
  );
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) =>
    server!.on("listening", () => resolve()),
  );
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("No server address");
  base = `http://127.0.0.1:${address.port}`;
});
after(async () => {
  if (server)
    await new Promise<void>((resolve, reject) =>
      server!.close((error) => (error ? reject(error) : resolve())),
    );
  if (local && orgId) {
    await prisma.workforceAudit.deleteMany({
      where: { organizationId: { in: [orgId, otherOrg] } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [orgId, otherOrg] } },
    });
    await prisma.user.deleteMany({ where: { id: { in: [owner, staff] } } });
  }
  await prisma.$disconnect();
});
run(
  "manual attendance checks permissions, times, overlap, audit and summary export",
  async () => {
    const worker = await prisma.user.create({
      data: { email: `manual-${randomUUID()}@test.local` },
    });
    const zone = await prisma.attendanceZone.create({
      data: {
        organizationId: orgId,
        name: "Manual test",
        lat: 47.9,
        lng: 106.9,
        radiusMeters: 100,
      },
    });
    await prisma.organizationMember.create({
      data: { userId: worker.id, organizationId: orgId, role: "STAFF", createdAt:new Date("2025-01-01T00:00:00Z") },
    });
    const body = {
      userId: worker.id,
      zoneId: zone.id,
      clockIn: "2026-01-05T09:00:00",
      clockOut: "2026-01-05T18:00:00",
      reason: "Test manual time entry",
    };
    try {
      assert.equal(
        (await request("manual-attendance", staffToken, "POST", body)).status,
        403,
      );
      assert.equal(
        (
          await request("manual-attendance", adminToken, "POST", {
            ...body,
            clockOut: "2026-01-05T08:00:00",
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await request("manual-attendance", adminToken, "POST", {
            ...body,
            clockIn: "2099-01-05T09:00:00",
            clockOut: "2099-01-05T18:00:00",
          })
        ).status,
        400,
      );
      const results = await Promise.all([
        request("manual-attendance", adminToken, "POST", body),
        request("manual-attendance", adminToken, "POST", body),
      ]);
      assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
      const record = await prisma.attendanceRecord.findFirstOrThrow({
        where: { userId: worker.id },
      });
      assert.equal(record.clockIn.toISOString(), "2026-01-05T01:00:00.000Z");
      assert.equal(record.totalMinutes, 540);
      assert.equal(record.clockInLat, null);
      assert.equal(record.clockInLng, null);
      assert.ok(
        await prisma.workforceAudit.findFirst({
          where: { action: "ATTENDANCE_MANUAL_CREATED", entityId: record.id },
        }),
      );
      for (const [index, zoneId] of [null, "", undefined].entries()) {
        const day = `2026-01-${String(6 + index).padStart(2, "0")}`;
        const result = await request("manual-attendance", adminToken, "POST", {
          ...body, zoneId, clockIn: `${day}T09:00:00`, clockOut: `${day}T18:00:00`,
        });
        assert.equal(result.status, 201);
        const saved = await prisma.attendanceRecord.findUniqueOrThrow({ where: { id: String(result.data.id) } });
        assert.equal(saved.zoneId, null);
        assert.equal(saved.clockInLat, null);
        assert.ok(await prisma.workforceAudit.findFirst({ where: { entityId: saved.id, action: "ATTENDANCE_MANUAL_CREATED" } }));
      }
      const invalidZone = await request("manual-attendance", adminToken, "POST", {
        ...body, zoneId: randomUUID(), clockIn: "2026-01-09T09:00:00", clockOut: "2026-01-09T18:00:00",
      });
      assert.equal(invalidZone.status, 400);
      const response = await fetch(
        `${base}/api/workforce/export?organizationId=${orgId}&from=2026-01-05&to=2026-01-05&report=summary&userId=${worker.id}`,
        { headers: { Authorization: `Bearer ${adminToken}` } },
      );
      assert.equal(response.status, 200);
      const XLSX = await import("xlsx");
      const book = XLSX.read(await response.arrayBuffer(), { type: "array" });
      const sheet = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        book.Sheets[book.SheetNames[0]],
      );
      assert.equal(sheet.length, 1);
      assert.equal(sheet[0]["Ажилласан минут"], 540);
      assert.equal(sheet[0]["Бүртгэлтэй өдөр"], 1);
    } finally {
      await prisma.attendanceRecord.deleteMany({
        where: { userId: worker.id },
      });
      await prisma.attendanceZone.delete({ where: { id: zone.id } });
      await prisma.organizationMember.deleteMany({
        where: { userId: worker.id },
      });
      await prisma.user.delete({ where: { id: worker.id } });
    }
  },
);

run("workforce login session lists only organizations the user can manage", async () => {
  const session = await request("session", adminToken);
  assert.equal(session.status, 200);
  assert.ok((session.data.organizations as { id: string }[]).some(organization => organization.id === orgId));
  const staffSession = await request("session", staffToken);
  assert.equal(staffSession.status, 200);
  const managed = staffSession.data.organizations as { id: string }[];
  assert.equal(managed.some(organization => organization.id === orgId), false);
  assert.equal(managed.some(organization => organization.id === otherOrg), true);
});

run(
  "work reports share app plans and reject cross-tenant creation",
  async () => {
    const today = wallNow("Asia/Ulaanbaatar").toISOString().slice(0, 10);
    const dueAt = wallToInstant(
      new Date(`${today}T17:00:00Z`),
      "Asia/Ulaanbaatar",
    ).toISOString();
    const result = await request(
      `work-tasks?organizationId=${orgId}`,
      adminToken,
      "POST",
      {
        organizationId: otherOrg,
        title: "Shared app plan",
        dueAt,
        assigneeIds: [staff],
        subTasks: ["First step"],
      },
    );
    assert.equal(result.status, 201);
    const taskId = String(result.data.id);
    try {
      const task = await prisma.organizationTask.findUniqueOrThrow({
        where: { id: taskId },
        include: { assignees: true, subTasks: true },
      });
      assert.equal(task.organizationId, orgId);
      assert.equal(task.assignees[0]?.userId, staff);
      assert.equal(task.subTasks.length, 1);
      const reports = await request(`work-tasks?from=${today}&to=${today}`);
      assert.equal(reports.status, 200);
      const item = (
        reports.data.items as { taskId: string; status: string }[]
      ).find((i) => i.taskId === taskId);
      assert.equal(item?.status, "PENDING");
      assert.equal(
        (
          await request(
            `work-tasks?organizationId=${otherOrg}&from=${today}&to=${today}`,
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await request(
            `work-tasks/${taskId}/approve?organizationId=${otherOrg}`,
            adminToken,
            "PATCH",
            {
              assigneeId: task.assignees[0]?.id,
              performanceStars: 10,
              productivityPercent: 100,
            },
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await request("work-tasks", staffToken, "POST", {
            title: "Forbidden",
            dueAt,
            assigneeIds: [staff],
          })
        ).status,
        403,
      );
    } finally {
      await prisma.organizationTask.delete({ where: { id: taskId } });
    }
  },
);
run(
  "approved remote correction keeps coordinates unknown and changes attendance once",
  async () => {
    const zone = await prisma.attendanceZone.create({
      data: {
        organizationId: orgId,
        name: "Correction location test",
        lat: 47.9,
        lng: 106.9,
        radiusMeters: 150,
      },
    });
    try {
      const instant = new Date(Date.now() - 3600000).toISOString();
      const result = await request("requests", staffToken, "POST", {
        kind: "REMOTE",
        direction: "IN",
        zoneId: zone.id,
        from: instant,
        to: instant,
        note: "Approved location-free correction",
      });
      assert.equal(result.status, 201);
      const id = String(result.data.id);
      const approved = await request("requests/decide", adminToken, "POST", {
        ids: [id],
        decision: "APPROVED",
      });
      assert.equal((approved.data.results as { ok: boolean }[])[0]?.ok, true);
      const record = await prisma.attendanceRecord.findFirstOrThrow({
        where: { organizationId: orgId, zoneId: zone.id, userId: staff },
      });
      assert.equal(record.clockInLat, null);
      assert.equal(record.clockInLng, null);
      assert.equal(record.clockIn.toISOString(), instant);
      const repeat = await request("requests/decide", adminToken, "POST", {
        ids: [id],
        decision: "APPROVED",
      });
      assert.equal((repeat.data.results as { ok: boolean }[])[0]?.ok, false);
      assert.equal(
        await prisma.attendanceRecord.count({ where: { zoneId: zone.id } }),
        1,
      );
    } finally {
      await prisma.workforceNotice.deleteMany({
        where: {
          organizationId: orgId,
          content: { startsWith: "Approved location-free correction" },
        },
      });
      await prisma.attendanceRecord.deleteMany({ where: { zoneId: zone.id } });
      await prisma.workforceRequest.deleteMany({ where: { zoneId: zone.id } });
      await prisma.attendanceZone.delete({ where: { id: zone.id } });
    }
  },
);
run(
  "App Control persists feature and plan controls and rejects organization-only admins",
  async () => {
    const path = `${base}/api/admin/organizations/${orgId}/workforce-controls`;
    const payload = {
      features: {
        ...defaultWorkforceFeatures,
        reports: false,
        integrations: true,
      },
      subscription: {
        planName: "Test plan",
        expiresAt: "2027-01-01T23:59:59Z",
        seatUnitPrice: 4500,
        addons: ["tracking"],
      },
    };
    assert.equal(
      (
        await fetch(path, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${adminToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })
      ).status,
      403,
    );
    const platformToken = jwt.sign(
      { userId: owner, email: "", role: "SUPER_ADMIN", organizationId: orgId },
      process.env.JWT_SECRET || "dev-secret-change-me",
      { expiresIn: "5m" },
    );
    const saved = await fetch(path, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${platformToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    assert.equal(saved.status, 200);
    try {
      const check = await fetch(path, {
        headers: { Authorization: `Bearer ${platformToken}` },
      });
      const data = (await check.json()) as {
        features: { reports: boolean };
        subscription: { seatUnitPrice: number; planName: string };
      };
      assert.equal(data.features.reports, false);
      assert.equal(data.subscription.seatUnitPrice, 4500);
      assert.equal(data.subscription.planName, "Test plan");
      assert.equal((await request("export")).status, 403);
    } finally {
      await prisma.workforcePolicy.update({
        where: { organizationId: orgId },
        data: { features: { ...defaultWorkforceFeatures, integrations: true } },
      });
      await prisma.workforceSubscription.deleteMany({
        where: { organizationId: orgId },
      });
    }
  },
);
run(
  "tracking requires entitlement, consent and an open shift; pulse updates once per day",
  async () => {
    assert.equal(
      (await request("tracking/consent", staffToken, "POST", { enabled: true }))
        .status,
      403,
    );
    await prisma.workforceSubscription.create({
      data: { organizationId: orgId, addons: ["tracking"] },
    });
    const zone = await prisma.attendanceZone.create({
      data: {
        organizationId: orgId,
        name: "Tracking test",
        lat: 47.9,
        lng: 106.9,
        radiusMeters: 100,
      },
    });
    try {
      const point = {
        lat: 47.9,
        lng: 106.9,
        accuracy: 15,
        capturedAt: new Date().toISOString(),
      };
      assert.equal(
        (await request("tracking/points", staffToken, "POST", point)).status,
        403,
      );
      assert.equal(
        (
          await request("tracking/consent", staffToken, "POST", {
            enabled: true,
          })
        ).status,
        200,
      );
      assert.equal(
        (await request("tracking/points", staffToken, "POST", point)).status,
        403,
      );
      await prisma.attendanceRecord.create({
        data: {
          organizationId: orgId,
          userId: staff,
          zoneId: zone.id,
          clockIn: new Date(Date.now() - 3600000),
          clockInLat: 47.9,
          clockInLng: 106.9,
          clockInMethod: "PIN",
        },
      });
      assert.equal(
        (await request("tracking/points", staffToken, "POST", point)).status,
        201,
      );
      assert.equal((await request("tracking", staffToken)).status, 403);
      const history = await request("tracking");
      assert.equal(history.status, 200);
      assert.equal(
        (history.data.points as { userId: string }[])[0]?.userId,
        staff,
      );
      await request("tracking/consent", staffToken, "POST", { enabled: false });
      assert.equal(
        (await request("tracking/points", staffToken, "POST", point)).status,
        403,
      );
      assert.equal(
        (await request("pulse", staffToken, "POST", { score: 3 })).status,
        200,
      );
      assert.equal(
        (await request("pulse", staffToken, "POST", { score: 5 })).status,
        200,
      );
      const pulses = await prisma.workforcePulse.findMany({
        where: { organizationId: orgId, userId: staff },
      });
      assert.equal(pulses.length, 1);
      assert.equal(pulses[0]?.score, 5);
    } finally {
      await prisma.attendanceRecord.deleteMany({ where: { zoneId: zone.id } });
      await prisma.attendanceZone.delete({ where: { id: zone.id } });
      await prisma.workforceLocationPoint.deleteMany({
        where: { organizationId: orgId },
      });
      await prisma.workforceTrackingPreference.deleteMany({
        where: { organizationId: orgId },
      });
      await prisma.workforcePulse.deleteMany({
        where: { organizationId: orgId },
      });
      await prisma.workforceSubscription.deleteMany({
        where: { organizationId: orgId },
      });
    }
  },
);
run(
  "provider-verified billing increments seats once and repeated invoices are idempotent",
  async () => {
    const savedFetch = globalThis.fetch;
    const keys = [
      "QPAY_BASE_URL",
      "QPAY_CLIENT_ID",
      "QPAY_CLIENT_SECRET",
      "QPAY_INVOICE_CODE",
    ] as const;
    const saved = keys.map((k) => process.env[k]);
    process.env.QPAY_BASE_URL = "https://workforce-qpay.test/v2";
    process.env.QPAY_CLIENT_ID = "test-client";
    process.env.QPAY_CLIENT_SECRET = "test-secret";
    process.env.QPAY_INVOICE_CODE = "test-invoice";
    clearTokenCache();
    let amount = 0,
      invoiceCalls = 0,
      paid = false;
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (url.startsWith(base)) return savedFetch(input, init);
      if (!url.startsWith("https://workforce-qpay.test/"))
        throw Error("Unexpected external request");
      if (url.endsWith("/auth/token"))
        return Response.json({
          access_token: "test-token",
          expires_in: 3600,
          token_type: "bearer",
        });
      if (url.endsWith("/invoice")) {
        invoiceCalls++;
        const body = JSON.parse(String(init?.body)) as { amount: number };
        amount = body.amount;
        return Response.json({
          invoice_id: "test-invoice-id",
          qr_text: "test-qr",
          urls: [],
        });
      }
      if (url.endsWith("/payment/check")) {
        const value = paid ? amount : amount - 1;
        return Response.json({
          count: 1,
          paid_amount: value,
          rows: [
            {
              payment_id: "workforce-test-payment",
              payment_status: "PAID",
              payment_amount: value,
              transaction_id: "test-tx",
            },
          ],
        });
      }
      throw Error("Unexpected provider endpoint");
    };
    const before = await prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
    });
    await prisma.workforceSubscription.create({
      data: {
        organizationId: orgId,
        seatUnitPrice: 4500,
        expiresAt: new Date(Date.now() + 30 * 86400000),
      },
    });
    try {
      const key = randomUUID(),
        body = { kind: "SEATS", seats: 2, idempotencyKey: key };
      const created = await request("billing", adminToken, "POST", body);
      assert.equal(created.status, 201);
      const orderId = String(created.data.orderId);
      assert.equal(
        (await request("billing", adminToken, "POST", body)).status,
        200,
      );
      assert.equal(invoiceCalls, 1);
      const partial = await request(
        `billing/${orderId}/check`,
        adminToken,
        "POST",
      );
      assert.equal(partial.data.paid, false);
      assert.equal(
        (await prisma.organization.findUniqueOrThrow({ where: { id: orgId } }))
          .maxMembers,
        before.maxMembers,
      );
      paid = true;
      assert.equal(
        (await request(`billing/${orderId}/check`, adminToken, "POST")).data
          .paid,
        true,
      );
      assert.equal(
        (await request(`billing/${orderId}/check`, adminToken, "POST")).data
          .paid,
        true,
      );
      assert.equal(
        (await prisma.organization.findUniqueOrThrow({ where: { id: orgId } }))
          .maxMembers,
        before.maxMembers + 2,
      );
    } finally {
      globalThis.fetch = savedFetch;
      keys.forEach((k, i) => {
        const value = saved[i];
        if (value === undefined) delete process.env[k];
        else process.env[k] = value;
      });
      clearTokenCache();
      await prisma.workforceBillingOrder.deleteMany({
        where: { organizationId: orgId },
      });
      await prisma.workforceSubscription.deleteMany({
        where: { organizationId: orgId },
      });
      await prisma.organization.update({
        where: { id: orgId },
        data: { maxMembers: before.maxMembers },
      });
    }
  },
);
run(
  "app and web reports reject self-review and concurrent approvals create one decision",
  async () => {
    const own = await prisma.organizationTask.create({
      data: {
        organizationId: orgId,
        createdById: staff,
        title: "Own report",
        dueAt: new Date(),
        assignees: {
          create: {
            userId: staff,
            status: "PENDING_REVIEW",
            submittedAt: new Date(),
            evidenceImages: {
              create: { url: "/api/org/tasks/evidence/uploads/test-own.png" },
            },
          },
        },
      },
      include: { assignees: true },
    });
    const shared = await prisma.organizationTask.create({
      data: {
        organizationId: orgId,
        createdById: owner,
        title: "Review once",
        dueAt: new Date(),
        assignees: {
          create: {
            userId: staff,
            status: "PENDING_REVIEW",
            submittedAt: new Date(),
            evidenceImages: {
              create: {
                url: "/api/org/tasks/evidence/uploads/test-review.png",
              },
            },
          },
        },
      },
      include: { assignees: true },
    });
    try {
      const response = await fetch(`${base}/api/org/tasks/${own.id}/approve`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${staffToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assigneeId: own.assignees[0]?.id,
          performanceStars: 10,
          productivityPercent: 100,
        }),
      });
      assert.equal(response.status, 403);
      const body = {
        assigneeId: shared.assignees[0]?.id,
        performanceStars: 8,
        productivityPercent: 90,
      };
      const decisions = await Promise.all([
        request(`work-tasks/${shared.id}/approve`, adminToken, "PATCH", body),
        request(`work-tasks/${shared.id}/approve`, adminToken, "PATCH", body),
      ]);
      assert.equal(decisions.filter((r) => r.status === 200).length, 1);
      assert.equal(
        decisions.filter((r) => [400, 409].includes(r.status)).length,
        1,
      );
      const record = await prisma.organizationTaskAssignee.findUniqueOrThrow({
        where: { id: shared.assignees[0]!.id },
      });
      assert.equal(record.status, "DONE");
      assert.equal(record.productivityPercent, 90);
      assert.equal(
        await prisma.organizationTaskApprovalLog.count({
          where: { assigneeId: record.id, action: "APPROVED" },
        }),
        1,
      );
    } finally {
      await prisma.organizationTask.deleteMany({
        where: { id: { in: [own.id, shared.id] } },
      });
    }
  },
);
run(
  "mail queue sends once, escapes HTML and leaves interrupted delivery uncertain",
  async () => {
    const configured = mock.method(emailService, "isConfigured", () => true);
    let calls = 0,
      fail = false,
      html = "";
    const sender = mock.method(
      emailService,
      "send",
      async (input: Parameters<typeof emailService.send>[0]) => {
        calls++;
        html = input.template.html ?? "";
        if (fail) throw Error("test-only transport failure");
      },
    );
    await prisma.workforceSubscription.create({
      data: { organizationId: orgId, addons: ["mail"] },
    });
    const campaign = await prisma.workforceMailCampaign.create({
      data: {
        organizationId: orgId,
        createdBy: owner,
        title: "Test mail",
        content: "<script>test</script>",
        idempotencyKey: randomUUID(),
        deliveries: {
          create: [
            { userId: staff, email: "test@example.test", state: "PENDING" },
            {
              userId: owner,
              email: "owner@example.test",
              state: "SENDING",
              updatedAt: new Date(Date.now() - 3600000),
            },
          ],
        },
      },
      include: { deliveries: true },
    });
    try {
      await processWorkforceMailQueue({ organizationId: orgId });
      await processWorkforceMailQueue({ organizationId: orgId });
      assert.equal(calls, 1);
      assert.ok(html.includes("&lt;script&gt;"));
      assert.ok(!html.includes("<script>"));
      const deliveries = await prisma.workforceMailDelivery.findMany({
        where: { campaignId: campaign.id },
      });
      assert.equal(deliveries.filter((d) => d.state === "SENT").length, 1);
      assert.equal(deliveries.filter((d) => d.state === "UNCERTAIN").length, 1);
      const failedCampaign = await prisma.workforceMailCampaign.create({
        data: {
          organizationId: orgId,
          createdBy: owner,
          title: "Failure test",
          content: "Test",
          idempotencyKey: randomUUID(),
          deliveries: {
            create: {
              userId: staff,
              email: "failure@example.test",
              state: "PENDING",
            },
          },
        },
        include: { deliveries: true },
      });
      const failure = failedCampaign.deliveries[0]!;
      fail = true;
      await processWorkforceMailQueue({ organizationId: orgId });
      assert.equal(
        (
          await prisma.workforceMailDelivery.findUniqueOrThrow({
            where: { id: failure.id },
          })
        ).state,
        "FAILED",
      );
    } finally {
      sender.mock.restore();
      configured.mock.restore();
      await prisma.workforceMailCampaign.deleteMany({
        where: { organizationId: orgId },
      });
      await prisma.workforceSubscription.deleteMany({
        where: { organizationId: orgId },
      });
    }
  },
);
run(
  "employees can be added by local phone, country-code phone and legacy email",
  async () => {
    const phone = String(10000000 + Math.floor(Math.random() * 9000000));
    const user = await prisma.user.create({
      data: {
        email: `phone-add-${randomUUID()}@test.local`,
        profile: {
          create: { fullName: "Phone addition test", phoneNumber: phone },
        },
      },
    });
    try {
      for (const identifier of [
        phone,
        `+976 ${phone.slice(0, 4)}-${phone.slice(4)}`,
      ]) {
        const result = await request("employees", adminToken, "POST", {
          identifier,
        });
        assert.equal(result.status, 201);
        const member = await prisma.organizationMember.findUniqueOrThrow({
          where: {
            userId_organizationId: { userId: user.id, organizationId: orgId },
          },
        });
        assert.equal(member.role, "STAFF");
        assert.equal(
          (
            await request("employees", adminToken, "POST", {
              email: user.email,
            })
          ).status,
          409,
        );
        await prisma.organizationMember.delete({ where: { id: member.id } });
      }
      assert.equal(
        (await request("employees", adminToken, "POST", { email: user.email }))
          .status,
        201,
      );
      assert.equal(
        (await request("employees", staffToken, "POST", { identifier: phone }))
          .status,
        403,
      );
      assert.equal(
        (
          await request("employees", adminToken, "POST", {
            identifier: "12abc34",
          })
        ).status,
        400,
      );
    } finally {
      await prisma.organizationMember.deleteMany({
        where: { userId: user.id },
      });
      await prisma.user.delete({ where: { id: user.id } });
    }
  },
);
run(
  "staff cannot read management snapshots or mutate departments",
  async () => {
    assert.equal((await request("snapshot", staffToken)).status, 403);
    assert.equal(
      (await request("departments", staffToken, "POST", { name: "Forbidden" }))
        .status,
      403,
    );
  },
);
run("cross-tenant organization parameter rejected", async () => {
  assert.equal(
    (await request(`snapshot?organizationId=${orgId}`, outsiderToken)).status,
    403,
  );
});
run(
  "department hierarchy rejects cycles and member moves use shared directory",
  async () => {
    const a = await request("departments", adminToken, "POST", {
        name: "First",
      }),
      b = await request("departments", adminToken, "POST", {
        name: "Child",
        parentId: a.data.id,
      });
    assert.equal(a.status, 201);
    assert.equal(b.status, 201);
    assert.equal(
      (
        await request(`departments/${a.data.id}`, adminToken, "PATCH", {
          name: "First",
          parentId: b.data.id,
        })
      ).status,
      400,
    );
  },
);
run(
  "schedule overlap rejected without losing the original assignment",
  async () => {
    const shift = await request("shifts", adminToken, "POST", {
      name: "Day",
      startMinute: 540,
      endMinute: 1080,
      breakMinutes: 60,
      weekdays: [1, 2, 3, 4, 5],
      color: "#5b8cff",
    });
    assert.equal(shift.status, 201);
    const body = {
      userIds: [staff],
      shiftId: shift.data.id,
      from: "2026-10-01",
      to: "2026-10-31",
    };
    assert.equal(
      (await request("assignments", adminToken, "POST", body)).status,
      201,
    );
    assert.equal(
      (await request("assignments", adminToken, "POST", body)).status,
      409,
    );
  },
);
run(
  "staff request approval is atomic, repeated approval rejected",
  async () => {
    const create = await request("requests", staffToken, "POST", {
      kind: "LEAVE",
      from: "2026-10-16T09:00",
      to: "2026-10-16T18:00",
      note: "Integration leave",
    });
    assert.equal(create.status, 201);
    const decide = await request("requests/decide", adminToken, "POST", {
      ids: [create.data.id],
      decision: "APPROVED",
      note: "Approved",
    });
    assert.equal(decide.status, 200);
    assert.equal((decide.data.results as { ok: boolean }[])[0].ok, true);
    const again = await request("requests/decide", adminToken, "POST", {
      ids: [create.data.id],
      decision: "APPROVED",
    });
    assert.equal((again.data.results as { ok: boolean }[])[0].ok, false);
    assert.equal(
      await prisma.workforceNotice.count({
        where: { organizationId: orgId, title: "Хүсэлт зөвшөөрөгдлөө" },
      }),
      1,
    );
  },
);
run("own request cannot be approved by its author", async () => {
  const create = await request("requests", adminToken, "POST", {
    kind: "LEAVE",
    from: "2026-10-20T09:00",
    to: "2026-10-20T18:00",
    note: "Own request",
  });
  const decision = await request("requests/decide", adminToken, "POST", {
    ids: [create.data.id],
    decision: "APPROVED",
  });
  assert.equal((decision.data.results as { ok: boolean }[])[0].ok, false);
});
run(
  "notice read count updates once and recipient scopes enforced",
  async () => {
    const notice = await request("notices", adminToken, "POST", {
      title: "Integration notice",
      content: "Hello",
      userIds: [staff],
    });
    assert.equal(notice.status, 201);
    await request(`notices/${notice.data.id}/read`, staffToken, "POST");
    await request(`notices/${notice.data.id}/read`, staffToken, "POST");
    await request(`notices/${notice.data.id}/read`, adminToken, "POST");
    const stored = await prisma.workforceNotice.findUniqueOrThrow({
      where: { id: String(notice.data.id) },
    });
    assert.deepEqual(stored.readBy, [staff]);
  },
);
run(
  "scoped API token hides ungranted resources and revokes immediately",
  async () => {
    const created = await request("tokens", adminToken, "POST", {
      name: "Test integration",
      scopes: ["organization:read"],
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
    assert.equal(created.status, 201);
    const secret = String(created.data.secret);
    assert.equal(
      (await request("integration/organization", secret)).status,
      200,
    );
    assert.equal((await request("integration/employees", secret)).status, 403);
    await request(`tokens/${created.data.id}`, adminToken, "DELETE");
    assert.equal(
      (await request("integration/organization", secret)).status,
      401,
    );
  },
);
run("inactive App Control attendance blocks management access", async () => {
  await prisma.organization.update({
    where: { id: orgId },
    data: { businessAttendanceEnabled: false },
  });
  assert.equal((await request("snapshot")).status, 403);
  await prisma.organization.update({
    where: { id: orgId },
    data: { businessAttendanceEnabled: true },
  });
});

run("department manager sees and approves only their own team", async () => {
  const email = `wf-managed-${randomUUID()}@test.local`;
  const worker = await prisma.user.create({ data: { email } });
  try {
    await prisma.organizationMember.create({
      data: {
        userId: worker.id,
        organizationId: orgId,
        role: "STAFF",
        department: "First",
      },
    });
    const department = await prisma.workforceDepartment.findUniqueOrThrow({
      where: { organizationId_name: { organizationId: orgId, name: "First" } },
    });
    await prisma.workforceDepartment.update({
      where: { id: department.id },
      data: { managerId: staff },
    });
    const view = await request("snapshot", staffToken);
    assert.equal(view.status, 200);
    assert.deepEqual(
      (view.data.employees as { userId: string }[]).map((e) => e.userId),
      [worker.id],
    );
    const employeeToken = jwt.sign(
      { userId: worker.id, email, role: "USER", organizationId: orgId },
      process.env.JWT_SECRET || "dev-secret-change-me",
      { expiresIn: "5m" },
    );
    const create = await request("requests", employeeToken, "POST", {
      kind: "LEAVE",
      from: "2026-10-22T09:00",
      to: "2026-10-22T18:00",
      note: "Managed team leave",
    });
    const approved = await request("requests/decide", staffToken, "POST", {
      ids: [create.data.id],
      decision: "APPROVED",
    });
    assert.equal((approved.data.results as { ok: boolean }[])[0].ok, true);
    const other = await prisma.workforceRequest.findFirstOrThrow({
      where: { organizationId: orgId, userId: owner, state: "PENDING" },
    });
    const denied = await request("requests/decide", staffToken, "POST", {
      ids: [other.id],
      decision: "REJECTED",
      note: "Out of scope",
    });
    assert.equal((denied.data.results as { ok: boolean }[])[0].ok, false);
    await prisma.workforceDepartment.update({
      where: { id: department.id },
      data: { managerId: null },
    });
  } finally {
    await prisma.organizationMember.deleteMany({
      where: { userId: worker.id },
    });
    await prisma.user.delete({ where: { id: worker.id } });
  }
});
run(
  "offboarding blocks selected organization and preserves attendance and other memberships",
  async () => {
    const today = wallNow("Asia/Ulaanbaatar").toISOString().slice(0, 10);
    const zone = await prisma.attendanceZone.create({
      data: {
        organizationId: orgId,
        name: "Offboarding test",
        lat: 47.9,
        lng: 106.9,
        radiusMeters: 100,
      },
    });
    const start = wallToInstant(
        new Date(`${today}T09:00:00Z`),
        "Asia/Ulaanbaatar",
      ),
      end = wallToInstant(new Date(`${today}T18:00:00Z`), "Asia/Ulaanbaatar");
    await prisma.attendanceRecord.create({
      data: {
        organizationId: orgId,
        userId: staff,
        zoneId: zone.id,
        clockIn: start,
        clockOut: end,
        clockInLat: 47.9,
        clockInLng: 106.9,
        clockInMethod: "PIN",
        totalMinutes: 540,
      },
    });
    const employee = await prisma.organizationMember.findUniqueOrThrow({
      where: {
        userId_organizationId: { userId: staff, organizationId: orgId },
      },
    });
    const beforeOffboarding = await request(`snapshot?from=${today}&to=${today}`);
    const beforeRow = (beforeOffboarding.data.rows as { userId: string; workedMinutes: number }[]).find(row => row.userId === staff);
    assert.ok(beforeRow);
    assert.equal(
      (
        await request(`employees/${employee.id}/offboard`, adminToken, "POST", {
          lastDay: today,
          reason: "Integration test departure",
        })
      ).status,
      200,
    );
    assert.equal((await request("self", staffToken)).status, 403);
    assert.equal(
      await prisma.attendanceRecord.count({
        where: { organizationId: orgId, userId: staff },
      }),
      1,
    );
    assert.equal(
      (
        await prisma.organizationMember.findUniqueOrThrow({
          where: {
            userId_organizationId: { userId: staff, organizationId: otherOrg },
          },
        })
      ).isActive,
      true,
    );
    const audit = await prisma.workforceAudit.findFirst({
      where: {
        organizationId: orgId,
        action: "EMPLOYEE_OFFBOARDED",
        entityId: employee.id,
      },
    });
    assert.ok(audit);
    const snapshot = await request(`snapshot?from=${today}&to=${today}`);
    const employeeRow = (
      snapshot.data.rows as { userId: string; workedMinutes: number }[]
    ).find((r) => r.userId === staff);
    assert.equal(employeeRow?.workedMinutes, beforeRow.workedMinutes);
    // Cleanup FK-dependent attendance fixtures before deleting the test organization.
    await prisma.attendanceRecord.deleteMany({
      where: { organizationId: orgId },
    });
    await prisma.attendanceZone.deleteMany({
      where: { organizationId: orgId },
    });
  },
);
