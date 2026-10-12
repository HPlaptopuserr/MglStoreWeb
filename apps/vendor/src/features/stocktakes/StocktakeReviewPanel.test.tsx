import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { StocktakeReviewPanel } from "./StocktakeReviewPanel";

function render(overrides: Partial<Parameters<typeof StocktakeReviewPanel>[0]> = {}) {
  return renderToStaticMarkup(<StocktakeReviewPanel
    differences={153} changed={5} added={0} uncounted={0} filter="changed"
    status="REVIEW" busy={false} canApprove completionIssue={null}
    onFilter={() => {}} onPrepare={() => {}} onReopen={() => {}} onFinish={() => {}}
    {...overrides}
  />);
}
test("review exposes separate discrepancy groups and blocks finish for changed stock", () => {
  const html = render();
  assert.match(html, /Зөрүүтэй бараа · 153/);
  assert.match(html, /Мэдээлэл өөрчлөгдсөн · 5/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /Шинэ мэдээллээр дахин тоолох/);
  assert.match(html, /<button[^>]*disabled=""[^>]*>Шалгасан тоог хадгалаад дуусгах/);
});
test("review permits finishing validated counts and shows correction action", () => {
  const html = render({ changed: 0 });
  assert.match(html, /Тоо, шалтгаан засах/);
  assert.doesNotMatch(html, /disabled=""/);
});
test("cashiers and terminal sessions cannot use finish controls", () => {
  assert.doesNotMatch(render({ canApprove: false }), /Шалгасан тоог хадгалаад дуусгах/);
  assert.doesNotMatch(render({ status: "APPROVED" }), /Шалгасан тоог хадгалаад дуусгах/);
});
