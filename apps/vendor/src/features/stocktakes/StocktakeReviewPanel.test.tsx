import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { StocktakeReviewPanel } from "./StocktakeReviewPanel";

function render(
  overrides: Partial<Parameters<typeof StocktakeReviewPanel>[0]> = {},
) {
  return renderToStaticMarkup(
    <StocktakeReviewPanel
      counted={1170}
      differences={153}
      changed={5}
      added={0}
      uncounted={0}
      filter="changed"
      status="REVIEW"
      busy={false}
      canApprove
      completionIssue={null}
      onFilter={() => {}}
      onPrepare={() => {}}
      onReopen={() => {}}
      onFinish={() => {}}
      {...overrides}
    />,
  );
}
test("review exposes separate discrepancy groups and blocks finish for changed stock", () => {
  const html = render();
  assert.match(html, /Тоо зөрсөн/);
  assert.match(html, /Үлдэгдэл өөрчлөгдсөн/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /<details[ >]/);
  assert.match(html, /<button[^>]*disabled=""[^>]*>Тооллогыг баталж дуусгах/);
});
test("review permits finishing validated counts and shows correction action", () => {
  const html = render({ changed: 0 });
  assert.match(html, /Тоо, шалтгаан засах/);
  assert.doesNotMatch(html, /disabled=""/);
});
test("cashiers and terminal sessions cannot use finish controls", () => {
  assert.doesNotMatch(
    render({ canApprove: false }),
    /Тооллогыг баталж дуусгах/,
  );
  assert.doesNotMatch(
    render({ status: "APPROVED" }),
    /Тооллогыг баталж дуусгах/,
  );
});

test("reset is disclosed as destructive and kept inside a closed details section", () => {
  const html = render();
  assert.match(html, /өмнөх тоо, тайлбарыг арилгана/);
  assert.doesNotMatch(html, /<details[^>]*open/);
  assert.match(html, /Тоолсон бараа/);
  assert.match(html, /Тоо оруулах/);
});
