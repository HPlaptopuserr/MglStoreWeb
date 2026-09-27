import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyPgwResponse,
  parsePgwResponse,
  terminalResultFrame,
} from "./android-pgw.provider";

test("recognizes zero response-code variants as approved", () => {
  assert.equal(classifyPgwResponse(parsePgwResponse("<{response_code:00}>")), "APPROVED");
  assert.equal(classifyPgwResponse(parsePgwResponse("<{Code:0}>")), "APPROVED");
  assert.equal(classifyPgwResponse(parsePgwResponse('<{"response":"00"}>')), "APPROVED");
  assert.equal(
    classifyPgwResponse(parsePgwResponse("<{response:SALE,code:0}>")),
    "APPROVED",
  );
});

test("recognizes explicit success fields from alternate PGW versions", () => {
  assert.equal(classifyPgwResponse(parsePgwResponse("<{status:SUCCESS}>")), "APPROVED");
  assert.equal(classifyPgwResponse(parsePgwResponse("<{succeed:true}>")), "APPROVED");
});

test("uses RRN plus bank approval code as strong approval evidence", () => {
  const parsed = parsePgwResponse("<{RRN:123456789012,approveCode:ABC123}>");
  assert.equal(classifyPgwResponse(parsed), "APPROVED");
});

test("explicit decline overrides reference and approval fields", () => {
  const parsed = parsePgwResponse("<{status:DECLINED,RRN:123456789012,appCode:ABC123}>");
  assert.equal(classifyPgwResponse(parsed), "DECLINED");
});

test("does not treat the echoed charge command as the terminal result", () => {
  const command = "<{amount:12500,data:attempt-1}>";
  assert.equal(terminalResultFrame(command, command), "");
  assert.equal(
    terminalResultFrame(`${command}<{code:0,rrn:123456}>`, command),
    "<{code:0,rrn:123456}>",
  );
});
