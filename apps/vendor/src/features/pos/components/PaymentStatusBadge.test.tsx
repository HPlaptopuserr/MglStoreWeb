import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { SplitPaymentRow } from "./SplitPaymentRow";

test("method badges label paid, failed and waiting states separately", () => {
  for (const [status, label] of [
    ["success", "Амжилттай"],
    ["failed", "Амжилтгүй"],
    ["pending", "Хүлээгдэж байна"],
    ["unknown", "Төлөв тодорхойгүй"],
    ["unpaid", "Төлөгдөөгүй"],
    ["unused", "Төлөхгүй"],
  ] as const)
    assert.ok(
      renderToStaticMarkup(<PaymentStatusBadge status={status} />).includes(
        label,
      ),
    );
});
test("status checks stay available while a pending payment blocks editing", () => {
  const html = renderToStaticMarkup(
    <SplitPaymentRow
      method="CARD"
      value="2000"
      amount={2000}
      automatic={false}
      locked
      status="pending"
      disabled
      checkDisabled={false}
      onChange={() => {}}
      onModeChange={() => {}}
      onCheckStatus={() => {}}
      feedback={{ kind: "unknown", message: "Төлөвөө шалгана уу" }}
    />,
  );
  assert.ok(html.includes("Төлөв тодорхойгүй"));
  assert.ok(html.includes("Төлөв шалгах"));
  const button = html.match(/<button\b([^>]*)>Төлөв шалгах<\/button>/);
  assert.ok(button);
  assert.doesNotMatch(button[1], /\sdisabled(?:\s|=|$)/);
  assert.match(html, /readonly/i);
});
