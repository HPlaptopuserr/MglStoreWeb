import assert from "node:assert/strict";
import test from "node:test";
import { describeMinuAgentInvoiceError } from "./minu-pos-agent";

test("explains Minu device lookup errors with terminal and branch context", () => {
  const message = describeMinuAgentInvoiceError({
    message: "Төхөөрөмжийн мэдээлэл олдсонгүй",
    terminalId: "T6-123",
    branchId: "BRANCH-9",
  });

  assert.match(message, /terminalId "T6-123"/);
  assert.match(message, /branchId "BRANCH-9"/);
  assert.match(message, /Android Device ID\/serial биш/);
});

test("keeps unrelated Minu errors unchanged", () => {
  assert.equal(
    describeMinuAgentInvoiceError({
      message: "Нэвтрэх нэр эсвэл нууц үг буруу",
      terminalId: "T6-123",
      branchId: "BRANCH-9",
    }),
    "Нэвтрэх нэр эсвэл нууц үг буруу",
  );
});
