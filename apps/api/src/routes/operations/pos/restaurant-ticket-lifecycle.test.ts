import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPaidRestaurantTicketsCloseScope,
  resolvePaidRestaurantTicketStatus,
} from "./restaurant-ticket-lifecycle";

test("paid table tickets stay occupied until the table is cleared", () => {
  assert.equal(resolvePaidRestaurantTicketStatus("table-1"), "PAID");
});

test(
  "paid self-service tickets close because they have no table to clear",
  () => {
    assert.equal(resolvePaidRestaurantTicketStatus(null), "CLOSED");
    assert.equal(resolvePaidRestaurantTicketStatus(undefined), "CLOSED");
  },
);

test("shift close releases every fully paid restaurant ticket", () => {
  assert.deepEqual(buildPaidRestaurantTicketsCloseScope("shift-1"), {
    shiftId: "shift-1",
    status: "PAID",
  });
});
