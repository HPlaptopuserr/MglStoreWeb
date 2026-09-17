import assert from "node:assert/strict";
import test from "node:test";
import { posErrorMessage } from "./pos-error-message";

test("HTML 404 pages are replaced with an actionable message", () => {
  const result = posErrorMessage(
    "<!DOCTYPE html><html><pre>Cannot GET /api/pos/shifts/register-current</pre></html>",
    404,
  );
  assert.doesNotMatch(result, /<|Cannot GET|register-current/);
  assert.match(result, /дахин оролдоно уу/);
});
test("structured business errors remain readable", () => {
  assert.equal(
    posErrorMessage(JSON.stringify({ message: "Өмнөх ээлжээ хаана уу." }), 409),
    "Өмнөх ээлжээ хаана уу.",
  );
});
test("invalid JSON shapes and embedded HTML cannot reach the UI", () => {
  for (const raw of [
    "null",
    "{}",
    '{"message":42}',
    '{"error":"<html>Error</html>"}',
    "Bad Gateway",
  ]) {
    assert.equal(
      posErrorMessage(raw, 502),
      "POS үйлчилгээтэй холбогдоход алдаа гарлаа. Дахин оролдоно уу.",
    );
  }
});
