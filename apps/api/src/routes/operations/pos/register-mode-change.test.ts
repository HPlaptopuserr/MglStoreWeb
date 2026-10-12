import assert from "node:assert/strict";
import test from "node:test";
import { canAutoCancelTicketForRegisterModeChange } from "./register-mode-change";

test("allows abandoned OPEN drafts that never reached the kitchen", () => {
  assert.equal(
    canAutoCancelTicketForRegisterModeChange({
      status: "OPEN",
      posSaleId: null,
      kitchenTicketStatuses: [],
    }),
    true,
  );
  assert.equal(
    canAutoCancelTicketForRegisterModeChange({
      status: "OPEN",
      posSaleId: null,
      kitchenTicketStatuses: ["CANCELLED", "CANCELLED"],
    }),
    true,
  );
});

test("keeps tickets that reached the kitchen, were served, or have a sale", () => {
  for (const kitchenStatus of ["NEW", "PREPARING", "READY", "SERVED"]) {
    assert.equal(
      canAutoCancelTicketForRegisterModeChange({
        status: "OPEN",
        posSaleId: null,
        kitchenTicketStatuses: [kitchenStatus],
      }),
      false,
    );
  }

  assert.equal(
    canAutoCancelTicketForRegisterModeChange({
      status: "OPEN",
      posSaleId: "sale-1",
      kitchenTicketStatuses: [],
    }),
    false,
  );
  assert.equal(
    canAutoCancelTicketForRegisterModeChange({
      status: "KITCHEN",
      posSaleId: null,
      kitchenTicketStatuses: [],
    }),
    false,
  );
});
