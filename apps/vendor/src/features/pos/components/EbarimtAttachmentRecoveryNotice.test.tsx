import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { EbarimtRecoveryList } from "./EbarimtAttachmentRecoveryNotice";

const defaults = {
  loading: false,
  error: "",
  items: [],
  onOpenHistory: () => {},
};

test("fiscal recovery loading, empty and storage failures are distinct and accessible", () => {
  assert.equal(renderToStaticMarkup(<EbarimtRecoveryList {...defaults} />), "");
  assert.match(
    renderToStaticMarkup(<EbarimtRecoveryList {...defaults} loading />),
    /role="status"/,
  );
  const html = renderToStaticMarkup(
    <EbarimtRecoveryList {...defaults} error="Storage unavailable" />,
  );
  assert.match(html, /role="alert"/);
  assert.match(html, /Storage unavailable/);
});

test("pending and uncertain receipts show durable references and history without issuance controls", () => {
  const html = renderToStaticMarkup(
    <EbarimtRecoveryList
      {...defaults}
      items={[
        {
          saleId: "sale-1",
          receiptNo: "POS-1",
          state: "NEEDS_REVIEW",
          error: "PosAPI timed out",
        },
        { saleId: "sale-2", receiptNo: "POS-2", state: "READY" },
      ]}
    />,
  );
  for (const text of [
    "POS-1",
    "POS-2",
    "sale-1",
    "PosAPI timed out",
    "Тулгаж шалгах шаардлагатай",
    "серверт хадгалах хүлээгдэж байна",
    "Төлбөрийг дахин авахгүй",
    "Борлуулалтын түүх харах",
  ])
    assert.ok(html.includes(text));
  assert.equal((html.match(/<button/g) || []).length, 1);
  assert.match(html, /<summary/);
});
