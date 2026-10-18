import { hasScheduleConflict } from "./schedule-conflicts";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultWorkforceFeatures,
  type WorkforceEmployee,
  type WorkforceShift,
  type WorkforceRecord,
  type WorkforceRequest,
} from "@mgl/types";
import {
  calculateWorkforce,
  daysBetween,
  unionMinutes,
  wallNow,
  wallToInstant,
} from "./calculation";
import { quoteSeats } from "./billing";
const employee: WorkforceEmployee = {
  id: "m1",
  userId: "u1",
  name: "Test",
  email: "test@demo.local",
  phone: "",
  avatarUrl: null,
  role: "STAFF",
  department: "",
  active: true,
  joinedAt: "2026-01-01",
  capabilities: [],
};
const shift: WorkforceShift = {
  id: "s1",
  name: "Өдөр",
  startMinute: 540,
  endMinute: 1080,
  breakMinutes: 60,
  weekdays: [1, 2, 3, 4, 5],
  color: "#5b8cff",
  active: true,
};
function calculate({
  records = [],
  requests = [],
  selectedShift = shift,
  now = "2026-10-16T20:00:00Z",
  days = ["2026-10-16"],
}: {
  records?: WorkforceRecord[];
  requests?: WorkforceRequest[];
  selectedShift?: WorkforceShift;
  now?: string;
  days?: string[];
} = {}) {
  return calculateWorkforce({
    days,
    employees: [employee],
    shifts: [selectedShift],
    assignments: [
      {
        id: "a1",
        userId: "u1",
        shiftId: "s1",
        from: "2026-10-01",
        to: "2026-10-31",
        zoneId: null,
      },
    ],
    records,
    requests,
    policy: {
      timeZone: "Asia/Ulaanbaatar",
      lateGraceMinutes: 5,
      features: defaultWorkforceFeatures,
      requestKinds: ["LEAVE"],
      approvalRequired: true,
    },
    now: wallToInstant(new Date(now), "Asia/Ulaanbaatar"),
  });
}
function record(
  id: string,
  start: string,
  end: string | null,
): WorkforceRecord {
  return {
    id,
    userId: "u1",
    clockIn: wallToInstant(new Date(start), "Asia/Ulaanbaatar").toISOString(),
    clockOut: end
      ? wallToInstant(new Date(end), "Asia/Ulaanbaatar").toISOString()
      : null,
    zoneId: "z1",
    method: "PIN",
    totalMinutes: null,
    note: null,
  };
}
function leave(from: string, to: string): WorkforceRequest {
  return {
    id: "r1",
    userId: "u1",
    kind: "LEAVE",
    state: "APPROVED",
    from: wallToInstant(new Date(from), "Asia/Ulaanbaatar").toISOString(),
    to: wallToInstant(new Date(to), "Asia/Ulaanbaatar").toISOString(),
    note: "test",
    decisionNote: null,
    decidedBy: "u2",
    decidedAt: null,
    createdAt: from,
    zoneId: null,
    direction: null,
  };
}
test("correct wall clock around UTC day boundary", () => {
  assert.equal(
    wallNow("Asia/Ulaanbaatar", new Date("2026-10-15T17:00:00Z")).toISOString(),
    "2026-10-16T01:00:00.000Z",
  );
  assert.equal(
    wallNow("Asia/Hovd", new Date("2026-10-15T17:00:00Z")).getUTCHours(),
    0,
  );
});
test("invalid calendar dates and excessive range rejected", () => {
  assert.throws(() => daysBetween("2026-02-30", "2026-03-03"));
  assert.throws(() => daysBetween("2026-01-01", "2027-01-01"));
  assert.equal(daysBetween("2026-10-16", "2026-10-18").length, 3);
});
test("overlapping sessions are unioned, never double counted", () => {
  assert.equal(
    unionMinutes([
      [0, 600000],
      [300000, 900000],
    ]),
    15,
  );
  const result = calculate({
    records: [
      record("r1", "2026-10-16T09:00Z", "2026-10-16T18:00Z"),
      record("r2", "2026-10-16T10:00Z", "2026-10-16T17:00Z"),
    ],
  })[0];
  assert.equal(result.workedMinutes, 480);
  assert.equal(result.lateMinutes, 0);
});
test("grace, late and early leaving calculated independently", () => {
  const result = calculate({
    records: [record("r1", "2026-10-16T09:20Z", "2026-10-16T17:30Z")],
  })[0];
  assert.equal(result.lateMinutes, 15);
  assert.equal(result.earlyMinutes, 30);
  assert.equal(result.workedMinutes, 430);
});
test("unrecorded today is not finalized absent before shift end", () => {
  assert.equal(calculate({ now: "2026-10-16T10:00Z" })[0].status, "UNRECORDED");
  assert.equal(calculate()[0].status, "ABSENT");
});
test("approved full day leave removes required work and absence", () => {
  const result = calculate({
    requests: [leave("2026-10-16T00:00Z", "2026-10-17T00:00Z")],
  })[0];
  assert.equal(result.status, "LEAVE");
  assert.equal(result.plannedMinutes, 0);
  assert.equal(result.absentMinutes, 0);
});
test("overnight shift attributes next-day sessions once", () => {
  const result = calculate({
    selectedShift: { ...shift, startMinute: 1200, endMinute: 480 },
    days: ["2026-10-16", "2026-10-17"],
    now: "2026-10-17T10:00Z",
    records: [record("r1", "2026-10-16T20:00Z", "2026-10-17T08:00Z")],
  });
  assert.equal(result[0].workedMinutes, 660);
  assert.equal(result[0].lateMinutes, 0);
  assert.equal(result[1].workedMinutes, 0);
});
test("future sessions never produce negative work", () => {
  assert.equal(
    calculate({
      now: "2026-10-16T08:00Z",
      records: [record("r1", "2026-10-16T09:00Z", null)],
    })[0].workedMinutes,
    0,
  );
});
test("seat pricing prorated and configuration required", () => {
  assert.equal(
    quoteSeats(
      2,
      3000,
      new Date("2026-11-15T00:00Z"),
      new Date("2026-10-16T00:00Z"),
    ),
    6000,
  );
  assert.throws(() => quoteSeats(1, null, null));
  assert.throws(() => quoteSeats(-1, 3000, new Date()));
});

test("short session does not lose time to nonoverlapping lunch break", () => {
  assert.equal(
    calculate({
      records: [record("r1", "2026-10-16T09:00Z", "2026-10-16T09:30Z")],
    })[0].workedMinutes,
    30,
  );
});
test("assigned nonworking day differs from unscheduled day", () => {
  assert.equal(
    calculate({ days: ["2026-10-17"], now: "2026-10-18T20:00Z" })[0].status,
    "DAY_OFF",
  );
});
test("leave during a planned break does not reduce required work twice", () => {
  const result = calculate({
    requests: [leave("2026-10-16T13:00Z", "2026-10-16T14:00Z")],
  })[0];
  assert.equal(result.plannedMinutes, 480);
});
test("approved overtime needs actual recorded work", () => {
  const approved = {
    ...leave("2026-10-16T18:00Z", "2026-10-16T20:00Z"),
    kind: "OVERTIME" as const,
  };
  assert.equal(
    calculate({ requests: [approved] })[0].approvedOvertimeMinutes,
    0,
  );
  const result = calculate({
    requests: [approved],
    records: [record("r1", "2026-10-16T09:00Z", "2026-10-16T19:00Z")],
  })[0];
  assert.equal(result.approvedOvertimeMinutes, 60);
});

test("overnight assignment overlaps next-day early shift", () => {
  assert.equal(
    hasScheduleConflict(
      ["2026-10-17"],
      { startMinute: 420, endMinute: 900, weekdays: [6] },
      [
        {
          from: new Date("2026-10-16T00:00Z"),
          to: new Date("2026-10-16T00:00Z"),
          shift: { startMinute: 1200, endMinute: 480, weekdays: [5] },
        },
      ],
    ),
    true,
  );
});
test("timezone conversion roundtrips milliseconds and Hovd local midnight", () => {
  const wall = new Date("2026-10-16T00:10:00.123Z");
  assert.equal(
    wallNow("Asia/Hovd", wallToInstant(wall, "Asia/Hovd")).toISOString(),
    wall.toISOString(),
  );
});

test("future shifts remain scheduled instead of missing attendance", () => {
  const beforeStart = calculate({ now: "2026-10-16T08:00Z" })[0];
  assert.equal(beforeStart.status, "SCHEDULED");
  assert.equal(beforeStart.absentMinutes, 0);
  assert.equal(beforeStart.plannedMinutes, 480);
  const futureDay = calculate({
    days: ["2026-10-19"],
    now: "2026-10-16T20:00Z",
  })[0];
  assert.equal(futureDay.status, "SCHEDULED");
});
