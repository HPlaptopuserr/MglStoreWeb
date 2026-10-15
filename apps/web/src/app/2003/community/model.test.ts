import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesMember, isDemoState } from "./model";
import { DEMO_STATE } from "./demo-data";
test("search combines location and sector and searches help offers", () => {
  const member = DEMO_STATE.members[0];
  assert.equal(
    matchesMember(member, "ВЭБСАЙТ", "Улаанбаатар", "Технологи"),
    true,
  );
  assert.equal(matchesMember(member, "ВЭБСАЙТ", "Дархан", "Технологи"), false);
  assert.equal(matchesMember(member, "  ", "", ""), true);
});
test("restored demo requires valid members and request ownership", () => {
  assert.equal(isDemoState(DEMO_STATE), true);
  assert.equal(isDemoState({ ...DEMO_STATE, members: [{ id: 4 }] }), false);
  assert.equal(
    isDemoState({
      ...DEMO_STATE,
      requests: [{ ...DEMO_STATE.requests[0], memberId: "missing" }],
    }),
    false,
  );
  assert.equal(isDemoState(null), false);
});

test("activity types separate employees, businesses and planned businesses", () => {
  for (const activity of ["employed", "business", "planning"] as const) {
    assert.ok(
      DEMO_STATE.members.some((member) => member.activity === activity),
    );
  }
  assert.equal(
    isDemoState({
      ...DEMO_STATE,
      members: [{ ...DEMO_STATE.members[0], activity: "invalid" }],
    }),
    false,
  );
  const planned = DEMO_STATE.members.find(
    (member) => member.activity === "planning",
  );
  assert.ok(planned);
  assert.equal(matchesMember(planned, planned.sector, "", ""), true);
});
