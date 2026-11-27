import assert from "node:assert/strict";
import test from "node:test";
import { mentorSlotOpen, mentorSlots } from "../src/mentor-schedule";

test("weekly Ulaanbaatar hours include weekends and respect meeting boundaries", () => {
  for (const [day, first, last] of [
    ["2030-01-01",11,19], ["2030-01-02",8,19], ["2030-01-03",11,19],
    ["2030-01-04",8,16], ["2030-01-05",8,19], ["2030-01-06",8,19], ["2030-01-07",8,19],
  ] as const) {
    const open=mentorSlots(day).filter(slot=>mentorSlotOpen(slot,0));
    assert.equal(open.length,last-first+1);
    assert.equal(Number(open[0].slice(11,13)),first);
    assert.equal(Number(open.at(-1)?.slice(11,13)),last);
    assert.equal(mentorSlotOpen(day+"T20:00",0),false);
  }
});
test("rejects invalid dates, partial hours, and slots already started in Ulaanbaatar",()=>{
  for(const slot of ["2030-02-30T12:00","2030-01-01T12:30","2030-01-01T07:00"]) assert.equal(mentorSlotOpen(slot,0),false);
  assert.equal(mentorSlotOpen("2030-01-02T08:00",Date.parse("2030-01-02T00:00Z")),false);
});
